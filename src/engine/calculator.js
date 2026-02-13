import { distributeRepayment } from "./repaymentDistribution";
import { absorbWriteOff } from "./writeOffAbsorption";
import {
  INITIAL_NAV,
  calculateUnitsForInvestment,
  calculateUnitsForWithdrawal,
  calculateDailyNav,
  calculateNavAfterPayout,
} from "./navCalculator";
import { calculateLenderPayouts } from "./payoutCalculator";

// Helper: add days to a date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper: format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

// Helper: check if date is last day of month
function isEndOfMonth(date) {
  const next = addDays(date, 1);
  return next.getMonth() !== date.getMonth();
}

// Helper: get day of week (0=Sun, 1=Mon, ..., 6=Sat)
function isWeekday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

// Helper: check if it's a Monday (weekly repayment day)
function isMonday(date) {
  return date.getDay() === 1;
}

// Build map of repayment dates for each borrower
function buildRepaymentSchedule(borrowers, startDate, endDate) {
  const schedule = {};
  for (const b of borrowers) {
    schedule[b.id] = [];
    let current = new Date(b.startDate || startDate);
    while (current <= endDate) {
      if (b.schedule === "daily" && isWeekday(current)) {
        schedule[b.id].push(formatDate(current));
      } else if (b.schedule === "weekly" && isMonday(current)) {
        schedule[b.id].push(formatDate(current));
      }
      current = addDays(current, 1);
    }
  }
  return schedule;
}

// Main simulation function
export function runSimulation(investments, borrowers, writeOffs, tenorMonths = 12) {
  // Find date range
  const investmentDates = investments.map((i) => new Date(i.date));
  if (investmentDates.length === 0) return null;

  const startDate = new Date(Math.min(...investmentDates));
  const endDate = addDays(startDate, tenorMonths * 30);

  // Build repayment schedule
  const repaymentSchedule = buildRepaymentSchedule(borrowers, startDate, endDate);

  // Index write-offs by date
  const writeOffsByDate = {};
  for (const wo of writeOffs) {
    const key = wo.writeOffDate;
    if (!writeOffsByDate[key]) writeOffsByDate[key] = [];
    writeOffsByDate[key].push(wo);
  }

  // Index investments by date
  const investmentsByDate = {};
  for (const inv of investments) {
    const key = inv.date;
    if (!investmentsByDate[key]) investmentsByDate[key] = [];
    investmentsByDate[key].push(inv);
  }

  // State
  let nav = INITIAL_NAV;
  let totalUnits = 0;
  let totalAum = 0;
  let totalRepaid = 0;
  let totalInvested = 0;
  // Lender state: { lenderId -> { units, totalInvested, totalPayout, totalPrincipalReturned } }
  const lenderState = {};

  // Monthly accumulated pools
  let monthlyPools = {
    lenderMargin: 0,
    platformProvision: 0,
    platformRevenue: 0,
    lenderPrincipal: 0,
  };

  // Monthly accumulated write-off amount
  let monthlyWriteOffAmount = 0;

  // Pre-compute the date each borrower stopped paying (write-off date - 180 days)
  // A loan is written off after 180 days of non-payment, so repayments stop 180 days before
  const borrowerStopDate = {};
  for (const wo of writeOffs) {
    const stopDate = addDays(new Date(wo.writeOffDate), -180);
    borrowerStopDate[wo.borrowerId] = formatDate(stopDate);
  }

  // Output time series
  const dailySnapshots = [];
  const monthlyPayouts = [];

  let current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDate(current);

    // 1. Process investments/divestments for today
    const todayInvestments = investmentsByDate[dateStr] || [];
    for (const inv of todayInvestments) {
      if (!lenderState[inv.lenderId]) {
        lenderState[inv.lenderId] = {
          units: 0,
          totalInvested: 0,
          totalPayout: 0,
          totalPrincipalReturned: 0,
        };
      }

      if (inv.type === "topup") {
        const units = calculateUnitsForInvestment(inv.amount, nav);
        lenderState[inv.lenderId].units += units;
        lenderState[inv.lenderId].totalInvested += inv.amount;
        totalUnits += units;
        totalAum += inv.amount;
        totalInvested += inv.amount;
      } else if (inv.type === "withdraw") {
        const units = calculateUnitsForWithdrawal(inv.amount, nav);
        const actualUnits = Math.min(units, lenderState[inv.lenderId].units);
        lenderState[inv.lenderId].units -= actualUnits;
        totalUnits -= actualUnits;
        const withdrawAmount = actualUnits * nav;
        totalAum -= withdrawAmount;
      }
    }

    // 2. Process borrower repayments for today (skip borrowers past their stop date)
    let todayRepaymentTotal = 0;
    for (const b of borrowers) {
      if (borrowerStopDate[b.borrowerId] && dateStr >= borrowerStopDate[b.borrowerId]) continue;
      const schedule = repaymentSchedule[b.id] || [];
      if (schedule.includes(dateStr)) {
        const dist = distributeRepayment(b.amount);
        monthlyPools.lenderMargin += dist.lenderMargin;
        monthlyPools.platformProvision += dist.platformProvision;
        monthlyPools.platformRevenue += dist.platformRevenue;
        monthlyPools.lenderPrincipal += dist.lenderPrincipal;
        todayRepaymentTotal += b.amount;
        totalRepaid += b.amount;
      }
    }

    // 3. Process write-offs for today (accumulate for end of month)
    const todayWriteOffs = writeOffsByDate[dateStr] || [];
    for (const wo of todayWriteOffs) {
      monthlyWriteOffAmount += wo.outstandingAmount;
    }

    // 4. End of day: recalculate NAV
    if (totalUnits > 0) {
      nav = calculateDailyNav(monthlyPools.lenderMargin, totalAum, totalUnits);
    }

    // 5. Record daily snapshot
    const lenderSnapshots = {};
    for (const [lid, state] of Object.entries(lenderState)) {
      lenderSnapshots[lid] = { ...state };
    }

    dailySnapshots.push({
      date: dateStr,
      nav,
      totalUnits,
      totalAum,
      totalRepaid,
      totalInvested,
      outstandingAmount: totalInvested - totalRepaid,
      accumulatedMargin: monthlyPools.lenderMargin,
      lenders: lenderSnapshots,
    });

    // 6. End of month processing
    if (isEndOfMonth(current)) {
      // Apply write-off absorption
      let writeOffResult = null;
      if (monthlyWriteOffAmount > 0) {
        writeOffResult = absorbWriteOff(monthlyPools, monthlyWriteOffAmount);
        monthlyPools = writeOffResult.pools;

        // Adjust AUM for unabsorbed principal loss (permanent)
        if (writeOffResult.unabsorbed > 0) {
          totalAum -= writeOffResult.unabsorbed;
        }
      }

      // Calculate lender payouts
      const lendersList = Object.entries(lenderState).map(([id, s]) => ({
        lenderId: id,
        units: s.units,
      }));

      const payouts = calculateLenderPayouts(
        lendersList,
        totalUnits,
        monthlyPools.lenderMargin
      );

      // Apply payouts to lender state
      for (const p of payouts) {
        if (lenderState[p.lenderId]) {
          lenderState[p.lenderId].totalPayout += p.payout;
        }
      }

      // Record monthly payout event
      monthlyPayouts.push({
        date: dateStr,
        payouts,
        totalMarginDistributed: monthlyPools.lenderMargin,
        writeOffAmount: monthlyWriteOffAmount,
        poolsAfterAbsorption: { ...monthlyPools },
      });

      // Recalculate NAV after payout (margin pool emptied, AUM already adjusted)
      nav = totalUnits > 0 ? totalAum / totalUnits : INITIAL_NAV;

      // Update the last daily snapshot with post-payout NAV
      if (dailySnapshots.length > 0) {
        dailySnapshots[dailySnapshots.length - 1].navAfterPayout = nav;
      }

      // Reset monthly accumulators
      monthlyPools = {
        lenderMargin: 0,
        platformProvision: 0,
        platformRevenue: 0,
        lenderPrincipal: 0,
      };
      monthlyWriteOffAmount = 0;
    }

    current = addDays(current, 1);
  }

  // Build chart-ready data from snapshots
  return buildChartData(dailySnapshots, monthlyPayouts, lenderState);
}

function buildChartData(dailySnapshots, monthlyPayouts, finalLenderState) {
  // NAV Chart: daily NAV values
  const navData = dailySnapshots.map((s) => ({
    date: s.date,
    nav: Math.round((s.navAfterPayout ?? s.nav) * 100) / 100,
  }));

  // Repayment Chart: cumulative repaid amount over time
  const repaymentData = dailySnapshots.map((s) => ({
    date: s.date,
    totalRepaid: Math.round(s.totalRepaid),
    outstandingAmount: Math.round(s.outstandingAmount),
  }));

  // Payout Chart: monthly payout per lender
  const allLenderIds = [...new Set(monthlyPayouts.flatMap((p) => p.payouts.map((pp) => pp.lenderId)))];
  const payoutData = monthlyPayouts.map((mp) => {
    const row = { date: mp.date };
    for (const lid of allLenderIds) {
      const found = mp.payouts.find((p) => p.lenderId === lid);
      row[lid] = found ? Math.round(found.payout) : 0;
    }
    return row;
  });

  // Return Rate Chart: cumulative return rate per lender
  const returnRateData = dailySnapshots
    .filter((_, i) => i === dailySnapshots.length - 1 || dailySnapshots[i].navAfterPayout !== undefined)
    .map((s) => {
      const row = { date: s.date };
      for (const [lid, state] of Object.entries(s.lenders)) {
        if (state.totalInvested > 0) {
          row[lid] = Math.round((state.totalPayout / state.totalInvested) * 10000) / 100;
        }
      }
      return row;
    });

  // Principal Returned Chart: per lender at end
  const principalReturnedData = Object.entries(finalLenderState).map(([lid, state]) => ({
    lenderId: lid,
    totalInvested: Math.round(state.totalInvested),
    totalPrincipalReturned: Math.round(state.totalPrincipalReturned),
    totalPayout: Math.round(state.totalPayout),
  }));

  // NAV Units Chart: total fund units over time
  const navUnitsData = dailySnapshots.map((s) => ({
    date: s.date,
    totalUnits: Math.round(s.totalUnits * 100) / 100,
  }));

  // Lender Units Chart: units per lender over time
  const lenderUnitsData = dailySnapshots.map((s) => {
    const row = { date: s.date };
    for (const [lid, state] of Object.entries(s.lenders)) {
      row[lid] = Math.round(state.units * 100) / 100;
    }
    return row;
  });

  // AUM Chart: total AUM over time
  const aumData = dailySnapshots.map((s) => ({
    date: s.date,
    aum: Math.round(s.totalAum),
  }));

  return {
    navData,
    repaymentData,
    payoutData,
    returnRateData,
    principalReturnedData,
    navUnitsData,
    lenderUnitsData,
    aumData,
    lenderIds: allLenderIds,
    allLenderIds: [...new Set(Object.keys(finalLenderState))],
  };
}
