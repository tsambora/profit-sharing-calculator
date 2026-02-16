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
import { computeWriteOffDate, computeWriteOffOutstanding } from "./borrowerUtils";

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

// Build map of repayment dates for each borrower
function buildRepaymentSchedule(borrowers, startDate, endDate) {
  const schedule = {};
  for (const b of borrowers) {
    schedule[b.id] = [];
    const borrowerStart = new Date(b.startDate || startDate);
    const repaymentDay = borrowerStart.getDay();
    let current = new Date(borrowerStart);
    while (current <= endDate) {
      if (b.schedule === "daily" && isWeekday(current)) {
        schedule[b.id].push(formatDate(current));
      } else if (b.schedule === "weekly" && current.getDay() === repaymentDay) {
        schedule[b.id].push(formatDate(current));
      }
      current = addDays(current, 1);
    }
  }
  return schedule;
}

// Main simulation function
export function runSimulation(investments, borrowers, tenorMonths = 12) {
  // Find date range
  const investmentDates = investments.map((i) => new Date(i.date));
  if (investmentDates.length === 0) return null;

  const startDate = new Date(Math.min(...investmentDates));
  const endDate = addDays(startDate, tenorMonths * 30);

  // Build repayment schedule
  const repaymentSchedule = buildRepaymentSchedule(borrowers, startDate, endDate);

  // Derive write-offs from borrowers that have a repaymentStopDate
  const writeOffsByDate = {};
  const borrowerStopDate = {};
  for (const b of borrowers) {
    if (!b.repaymentStopDate) continue;
    borrowerStopDate[b.borrowerId] = b.repaymentStopDate;
    const woDate = computeWriteOffDate(b.repaymentStopDate);
    if (!woDate) continue;
    const loanAmount = b.loanAmount || 5000000;
    const outstandingAmount = computeWriteOffOutstanding(
      b.startDate,
      b.schedule,
      b.repaymentStopDate,
      b.amount,
      loanAmount
    );
    if (!writeOffsByDate[woDate]) writeOffsByDate[woDate] = [];
    writeOffsByDate[woDate].push({
      borrowerId: b.borrowerId,
      writeOffDate: woDate,
      outstandingAmount,
    });
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

  // Per-borrower cumulative repayment tracking for 133% cap
  const borrowerCumulativeRepaid = {};

  // Monthly accumulated pools
  let monthlyPools = {
    lenderMargin: 0,
    platformProvision: 0,
    platformRevenue: 0,
    lenderPrincipal: 0,
  };

  // Monthly accumulated write-off amount
  let monthlyWriteOffAmount = 0;

  // Cumulative pools for graph tracking (these don't reset monthly, only reduced by write-offs)
  let cumulativePools = {
    platformProvision: 0,
    platformRevenue: 0,
    lenderPrincipal: 0,
  };

  // Rebidding state
  const rebiddingLoans = []; // { loanAmount, weeklyRepayment, startDate, repaymentDay }
  let monthlyRebiddingPools = {
    lenderMargin: 0,
    platformProvision: 0,
    platformRevenue: 0,
    lenderPrincipal: 0,
  };
  let cumulativeRebiddingPools = {
    lenderMargin: 0,
    platformProvision: 0,
    platformRevenue: 0,
    lenderPrincipal: 0,
  };
  let totalRebiddingRepaid = 0;
  let rebiddingPrincipalAccumulator = 0;

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

    // 2. Process borrower repayments for today
    let todayRepaymentTotal = 0;
    for (const b of borrowers) {
      // Skip borrowers past their repayment stop date
      if (borrowerStopDate[b.borrowerId] && dateStr >= borrowerStopDate[b.borrowerId]) continue;

      // Skip borrowers that have reached 133% loan completion
      const loanAmount = b.loanAmount || 5000000;
      const maxRepaymentTotal = loanAmount * 1.33;
      const cumulative = borrowerCumulativeRepaid[b.borrowerId] || 0;
      if (cumulative >= maxRepaymentTotal) continue;

      const schedule = repaymentSchedule[b.id] || [];
      if (schedule.includes(dateStr)) {
        const dist = distributeRepayment(b.amount);
        monthlyPools.lenderMargin += dist.lenderMargin;
        monthlyPools.platformProvision += dist.platformProvision;
        monthlyPools.platformRevenue += dist.platformRevenue;
        monthlyPools.lenderPrincipal += dist.lenderPrincipal;
        cumulativePools.platformProvision += dist.platformProvision;
        cumulativePools.platformRevenue += dist.platformRevenue;
        cumulativePools.lenderPrincipal += dist.lenderPrincipal;
        rebiddingPrincipalAccumulator += dist.lenderPrincipal;
        todayRepaymentTotal += b.amount;
        totalRepaid += b.amount;
        borrowerCumulativeRepaid[b.borrowerId] = cumulative + b.amount;
      }
    }

    // 2b. Process rebidding loan repayments for today
    let todayRebiddingRepaymentTotal = 0;
    for (const rl of rebiddingLoans) {
      // Only active after start date
      if (dateStr < rl.startDate) continue;
      // Check if today matches the weekly repayment day
      if (current.getDay() !== rl.repaymentDay) continue;
      // Check if loan is fully repaid (133% cap)
      const maxRepayment = rl.loanAmount * 1.33;
      if (rl.totalRepaid >= maxRepayment) continue;

      const repaymentAmount = rl.weeklyRepayment;
      const dist = distributeRepayment(repaymentAmount);

      // Add to main pools (so NAV/write-offs/payouts work automatically)
      monthlyPools.lenderMargin += dist.lenderMargin;
      monthlyPools.platformProvision += dist.platformProvision;
      monthlyPools.platformRevenue += dist.platformRevenue;
      monthlyPools.lenderPrincipal += dist.lenderPrincipal;
      cumulativePools.platformProvision += dist.platformProvision;
      cumulativePools.platformRevenue += dist.platformRevenue;
      cumulativePools.lenderPrincipal += dist.lenderPrincipal;
      rebiddingPrincipalAccumulator += dist.lenderPrincipal;

      // Also track in rebidding-specific pools (for display)
      monthlyRebiddingPools.lenderMargin += dist.lenderMargin;
      monthlyRebiddingPools.platformProvision += dist.platformProvision;
      monthlyRebiddingPools.platformRevenue += dist.platformRevenue;
      monthlyRebiddingPools.lenderPrincipal += dist.lenderPrincipal;
      cumulativeRebiddingPools.lenderMargin += dist.lenderMargin;
      cumulativeRebiddingPools.platformProvision += dist.platformProvision;
      cumulativeRebiddingPools.platformRevenue += dist.platformRevenue;
      cumulativeRebiddingPools.lenderPrincipal += dist.lenderPrincipal;

      todayRebiddingRepaymentTotal += repaymentAmount;
      totalRebiddingRepaid += repaymentAmount;
      rl.totalRepaid = (rl.totalRepaid || 0) + repaymentAmount;
      totalRepaid += repaymentAmount;
    }

    // 2c. Create rebidding loans when principal accumulator reaches 5M threshold
    while (rebiddingPrincipalAccumulator >= 5000000) {
      const nextDay = addDays(current, 1);
      rebiddingLoans.push({
        loanAmount: 5000000,
        weeklyRepayment: 133000,
        startDate: formatDate(nextDay),
        repaymentDay: nextDay.getDay(),
        totalRepaid: 0,
      });
      rebiddingPrincipalAccumulator -= 5000000;
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
      dailyRepayment: todayRepaymentTotal,
      dailyRebiddingRepayment: todayRebiddingRepaymentTotal,
      totalRebiddingRepaid,
      outstandingAmount: totalInvested - totalRepaid,
      accumulatedMargin: monthlyPools.lenderMargin,
      pools: {
        lenderMargin: monthlyPools.lenderMargin,
        platformProvision: cumulativePools.platformProvision,
        platformRevenue: cumulativePools.platformRevenue,
        lenderPrincipal: cumulativePools.lenderPrincipal,
      },
      rebiddingPools: {
        lenderMargin: monthlyRebiddingPools.lenderMargin,
        platformProvision: cumulativeRebiddingPools.platformProvision,
        platformRevenue: cumulativeRebiddingPools.platformRevenue,
        lenderPrincipal: cumulativeRebiddingPools.lenderPrincipal,
      },
      lenders: lenderSnapshots,
    });

    // 6. End of month processing
    if (isEndOfMonth(current)) {
      // Apply write-off absorption
      let writeOffResult = null;
      if (monthlyWriteOffAmount > 0) {
        // Track pre-absorption pool values to compute how much each cumulative pool lost
        const preAbsorption = { ...monthlyPools };
        writeOffResult = absorbWriteOff(monthlyPools, monthlyWriteOffAmount);
        monthlyPools = writeOffResult.pools;

        // Subtract write-off losses from cumulative pools
        cumulativePools.platformProvision -= (preAbsorption.platformProvision - monthlyPools.platformProvision);
        cumulativePools.platformRevenue -= (preAbsorption.platformRevenue - monthlyPools.platformRevenue);
        cumulativePools.lenderPrincipal -= (preAbsorption.lenderPrincipal - monthlyPools.lenderPrincipal);

        // Adjust rebidding accumulator for principal absorbed by write-off
        const principalAbsorbedByWriteOff = preAbsorption.lenderPrincipal - monthlyPools.lenderPrincipal;
        if (principalAbsorbedByWriteOff > 0) {
          rebiddingPrincipalAccumulator = Math.max(0, rebiddingPrincipalAccumulator - principalAbsorbedByWriteOff);
        }

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
      monthlyRebiddingPools = {
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

  // Repayment Pools Chart: daily pool accumulation for all 4 buckets
  const poolsData = dailySnapshots.map((s) => ({
    date: s.date,
    lenderMargin: Math.round(s.pools.lenderMargin),
    lenderPrincipal: Math.round(s.pools.lenderPrincipal),
    platformRevenue: Math.round(s.pools.platformRevenue),
    platformProvision: Math.round(s.pools.platformProvision),
    rebiddingLenderMargin: Math.round(s.rebiddingPools.lenderMargin),
    rebiddingLenderPrincipal: Math.round(s.rebiddingPools.lenderPrincipal),
    rebiddingPlatformRevenue: Math.round(s.rebiddingPools.platformRevenue),
    rebiddingPlatformProvision: Math.round(s.rebiddingPools.platformProvision),
  }));

  // Daily Repayment Chart: repayment amount per day
  const dailyRepaymentData = dailySnapshots.map((s) => ({
    date: s.date,
    dailyRepayment: Math.round(s.dailyRepayment),
  }));

  // Daily Rebidding Repayment Chart
  const dailyRebiddingRepaymentData = dailySnapshots.map((s) => ({
    date: s.date,
    dailyRebiddingRepayment: Math.round(s.dailyRebiddingRepayment),
  }));

  // Total Repayment Chart: cumulative repayment over time
  const totalRepaymentData = dailySnapshots.map((s) => ({
    date: s.date,
    totalRepaid: Math.round(s.totalRepaid),
    totalRebiddingRepaid: Math.round(s.totalRebiddingRepaid),
  }));

  // Table data: raw snapshot data for calculation tables
  const tableData = dailySnapshots.map((s) => ({
    date: s.date,
    dailyRepayment: s.dailyRepayment,
    dailyRebiddingRepayment: s.dailyRebiddingRepayment,
    lenderMargin: s.pools.lenderMargin,
    lenderPrincipal: s.pools.lenderPrincipal,
    platformRevenue: s.pools.platformRevenue,
    platformProvision: s.pools.platformProvision,
    rebiddingLenderMargin: s.rebiddingPools.lenderMargin,
    rebiddingLenderPrincipal: s.rebiddingPools.lenderPrincipal,
    rebiddingPlatformRevenue: s.rebiddingPools.platformRevenue,
    rebiddingPlatformProvision: s.rebiddingPools.platformProvision,
    nav: s.navAfterPayout ?? s.nav,
    accumulatedMargin: s.accumulatedMargin,
    totalAum: s.totalAum,
    totalUnits: s.totalUnits,
    totalInvested: s.totalInvested,
    totalRepaid: s.totalRepaid,
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
    poolsData,
    dailyRepaymentData,
    dailyRebiddingRepaymentData,
    totalRepaymentData,
    tableData,
    lenderIds: allLenderIds,
    allLenderIds: [...new Set(Object.keys(finalLenderState))],
  };
}
