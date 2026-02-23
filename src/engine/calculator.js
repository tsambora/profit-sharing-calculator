import { distributeRepayment } from "./repaymentDistribution";
import { absorbWriteOff } from "./writeOffAbsorption";
import {
  INITIAL_NAV,
  calculateUnitsForInvestment,
  calculateUnitsForWithdrawal,
  calculateDailyNav,
  calculateDailyNavMode2,
  calculateNavAfterPayout,
} from "./navCalculator";
import { calculateLenderPayouts } from "./payoutCalculator";
import { computeWriteOffDate, computeWriteOffOutstanding } from "./borrowerUtils";
import {
  recordBalanceChange,
  calculateMonthlyAvgBalances,
  calculateAvgBalancePayouts,
} from "./avgBalanceCalculator";

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

// Build date-indexed repayment map: { dateStr: [borrower, ...] }
// Only dates with actual repayments are keyed, so the main loop
// can skip days/borrowers with no activity.
function buildRepaymentByDate(borrowers, startDate, endDate, borrowerStopDate) {
  const byDate = {};
  const endTime = endDate.getTime();
  for (const b of borrowers) {
    const borrowerStart = new Date(b.startDate || startDate);
    const stopDate = borrowerStopDate[b.borrowerId];
    const loanAmount = b.loanAmount || 5000000;
    const maxRepaymentTotal = loanAmount * 1.33;

    if (b.schedule === "weekly") {
      const repaymentDay = borrowerStart.getDay();
      // Advance to first matching weekday
      let current = new Date(borrowerStart);
      while (current.getDay() !== repaymentDay) {
        current = addDays(current, 1);
      }
      while (current.getTime() <= endTime) {
        const dateStr = formatDate(current);
        if (stopDate && dateStr >= stopDate) break;
        if (!byDate[dateStr]) byDate[dateStr] = [];
        byDate[dateStr].push({ borrower: b, loanAmount, maxRepaymentTotal });
        current = addDays(current, 7); // skip 7 days instead of 1
      }
    } else if (b.schedule === "daily") {
      let current = new Date(borrowerStart);
      while (current.getTime() <= endTime) {
        if (isWeekday(current)) {
          const dateStr = formatDate(current);
          if (stopDate && dateStr >= stopDate) break;
          if (!byDate[dateStr]) byDate[dateStr] = [];
          byDate[dateStr].push({ borrower: b, loanAmount, maxRepaymentTotal });
        }
        current = addDays(current, 1);
      }
    }
  }
  return byDate;
}

// Main simulation function
export function runSimulation(investments, borrowers, tenorMonths = 12, navMode = 1, marginRebiddingPct = 50) {
  // Find date range
  const investmentDates = investments.map((i) => new Date(i.date));
  if (investmentDates.length === 0) return null;

  const startDate = new Date(Math.min(...investmentDates));
  const endDate = addDays(startDate, tenorMonths * 30);

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

  // Build date-indexed repayment schedule (after borrowerStopDate is populated)
  const repaymentByDate = buildRepaymentByDate(borrowers, startDate, endDate, borrowerStopDate);

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
  let totalWithdrawn = 0;
  // Lender state: { lenderId -> { units, totalInvested, totalPayout, totalPrincipalReturned } }
  const lenderState = {};

  // Per-borrower cumulative repayment tracking for 133% cap
  const borrowerCumulativeRepaid = {};

  // Average balance tracking (shadow calculation)
  const lenderBalances = {}; // lenderId -> current IDR balance
  const balanceTracker = {}; // lenderId -> [{ date, balance }]

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
  let totalRebiddingFromPrincipal = 0; // Track total principal used for rebidding loans
  // Track accumulator split by source for accurate display
  let accumulatorFromOriginal = 0;
  let accumulatorFromRebidding = 0;
  let accumulatorFromMarginRebidding = 0;

  // Mode 2: Margin Rebidding state
  let marginRebiddingAccumulator = 0;
  let aumFromMarginRebidding = 0;
  let aumFromInvestment = 0;
  const marginRebiddingLoans = [];
  let monthlyMarginRebiddingPools = {
    lenderMargin: 0,
    platformProvision: 0,
    platformRevenue: 0,
    lenderPrincipal: 0,
  };
  let cumulativeMarginRebiddingPools = {
    lenderMargin: 0,
    platformProvision: 0,
    platformRevenue: 0,
    lenderPrincipal: 0,
  };
  let totalMarginRebiddingRepaid = 0;

  // AUM Recovery state
  let writeOffDeficit = 0;
  let totalRecovered = 0;
  let monthlyRecoveryFunneled = 0;

  // Helper: process repayment distribution with AUM recovery logic
  // When writeOffDeficit > 0, 83% (margin + principal + provision) is funneled to AUM recovery.
  // Platform revenue (17%) always flows normally.
  // Returns the amounts that actually went to pools.
  function processRepaymentDistribution(dist) {
    if (writeOffDeficit <= 0) {
      // Normal flow — all to pools
      return {
        lenderMargin: dist.lenderMargin,
        lenderPrincipal: dist.lenderPrincipal,
        platformProvision: dist.platformProvision,
        platformRevenue: dist.platformRevenue,
      };
    }

    // Recovery mode: funnel 83% (lenderMargin + lenderPrincipal + platformProvision) to AUM
    const recoveryPortion = dist.lenderMargin + dist.lenderPrincipal + dist.platformProvision;

    if (recoveryPortion <= writeOffDeficit) {
      // Full 83% goes to recovery
      totalAum += recoveryPortion;
      aumFromInvestment += recoveryPortion;
      writeOffDeficit -= recoveryPortion;
      totalRecovered += recoveryPortion;
      monthlyRecoveryFunneled += recoveryPortion;

      return {
        lenderMargin: 0,
        lenderPrincipal: 0,
        platformProvision: 0,
        platformRevenue: dist.platformRevenue, // always flows normally
      };
    }

    // Deficit clears mid-repayment: funnel only what's needed, remainder to pools proportionally
    const remainder = recoveryPortion - writeOffDeficit;
    totalAum += writeOffDeficit;
    aumFromInvestment += writeOffDeficit;
    totalRecovered += writeOffDeficit;
    monthlyRecoveryFunneled += writeOffDeficit;
    writeOffDeficit = 0;

    // Distribute remainder proportionally to the three pools
    const marginRatio = dist.lenderMargin / recoveryPortion;
    const principalRatio = dist.lenderPrincipal / recoveryPortion;
    const provisionRatio = dist.platformProvision / recoveryPortion;

    return {
      lenderMargin: remainder * marginRatio,
      lenderPrincipal: remainder * principalRatio,
      platformProvision: remainder * provisionRatio,
      platformRevenue: dist.platformRevenue,
    };
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
        aumFromInvestment += inv.amount;
        totalInvested += inv.amount;
        // Track balance for avg balance calculation
        lenderBalances[inv.lenderId] = (lenderBalances[inv.lenderId] || 0) + inv.amount;
        recordBalanceChange(balanceTracker, inv.lenderId, dateStr, lenderBalances[inv.lenderId]);
      } else if (inv.type === "withdraw") {
        const units = calculateUnitsForWithdrawal(inv.amount, nav);
        const actualUnits = Math.min(units, lenderState[inv.lenderId].units);
        lenderState[inv.lenderId].units -= actualUnits;
        totalUnits -= actualUnits;
        const withdrawAmount = actualUnits * nav;
        totalAum -= withdrawAmount;
        aumFromInvestment -= withdrawAmount;
        totalWithdrawn += withdrawAmount;
        // Track balance for avg balance calculation
        lenderBalances[inv.lenderId] = Math.max(0, (lenderBalances[inv.lenderId] || 0) - inv.amount);
        recordBalanceChange(balanceTracker, inv.lenderId, dateStr, lenderBalances[inv.lenderId]);
      }
    }

    // 2. Process borrower repayments for today (date-indexed lookup)
    let todayRepaymentTotal = 0;
    const todayBorrowers = repaymentByDate[dateStr];
    if (todayBorrowers) {
      for (const { borrower: b, maxRepaymentTotal } of todayBorrowers) {
        // Skip borrowers that have reached 133% loan completion
        const cumulative = borrowerCumulativeRepaid[b.borrowerId] || 0;
        if (cumulative >= maxRepaymentTotal) continue;

        const dist = distributeRepayment(b.amount);
        const actual = processRepaymentDistribution(dist);

        // Mode 2: split margin between payout and rebidding accumulator
        let marginToPayout = actual.lenderMargin;
        if (navMode === 2) {
          const rebiddingPortion = actual.lenderMargin * (marginRebiddingPct / 100);
          marginRebiddingAccumulator += rebiddingPortion;
          totalAum += rebiddingPortion;
          aumFromMarginRebidding += rebiddingPortion;
          marginToPayout = actual.lenderMargin - rebiddingPortion;
        }

        monthlyPools.lenderMargin += marginToPayout;
        monthlyPools.platformProvision += actual.platformProvision;
        monthlyPools.platformRevenue += actual.platformRevenue;
        monthlyPools.lenderPrincipal += actual.lenderPrincipal;
        cumulativePools.platformProvision += actual.platformProvision;
        cumulativePools.platformRevenue += actual.platformRevenue;
        cumulativePools.lenderPrincipal += actual.lenderPrincipal;
        rebiddingPrincipalAccumulator += actual.lenderPrincipal;
        accumulatorFromOriginal += actual.lenderPrincipal;
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
      const actual = processRepaymentDistribution(dist);

      // Mode 2: split margin between payout and rebidding accumulator
      let marginToPayout = actual.lenderMargin;
      if (navMode === 2) {
        const rebiddingPortion = actual.lenderMargin * (marginRebiddingPct / 100);
        marginRebiddingAccumulator += rebiddingPortion;
        totalAum += rebiddingPortion;
        aumFromMarginRebidding += rebiddingPortion;
        marginToPayout = actual.lenderMargin - rebiddingPortion;
      }

      // Add to main pools (so NAV/write-offs/payouts work automatically)
      monthlyPools.lenderMargin += marginToPayout;
      monthlyPools.platformProvision += actual.platformProvision;
      monthlyPools.platformRevenue += actual.platformRevenue;
      monthlyPools.lenderPrincipal += actual.lenderPrincipal;
      cumulativePools.platformProvision += actual.platformProvision;
      cumulativePools.platformRevenue += actual.platformRevenue;
      cumulativePools.lenderPrincipal += actual.lenderPrincipal;
      rebiddingPrincipalAccumulator += actual.lenderPrincipal;
      accumulatorFromRebidding += actual.lenderPrincipal;

      // Also track in rebidding-specific pools (for display)
      monthlyRebiddingPools.lenderMargin += marginToPayout;
      monthlyRebiddingPools.platformProvision += actual.platformProvision;
      monthlyRebiddingPools.platformRevenue += actual.platformRevenue;
      monthlyRebiddingPools.lenderPrincipal += actual.lenderPrincipal;
      cumulativeRebiddingPools.lenderMargin += marginToPayout;
      cumulativeRebiddingPools.platformProvision += actual.platformProvision;
      cumulativeRebiddingPools.platformRevenue += actual.platformRevenue;
      cumulativeRebiddingPools.lenderPrincipal += actual.lenderPrincipal;

      todayRebiddingRepaymentTotal += repaymentAmount;
      totalRebiddingRepaid += repaymentAmount;
      rl.totalRepaid = (rl.totalRepaid || 0) + repaymentAmount;
      totalRepaid += repaymentAmount;
    }

    // 2c. Create rebidding loans when principal accumulator reaches 5M threshold (paused during recovery)
    while (writeOffDeficit <= 0 && rebiddingPrincipalAccumulator >= 5000000) {
      const nextDay = addDays(current, 1);
      rebiddingLoans.push({
        loanAmount: 5000000,
        weeklyRepayment: 133000,
        startDate: formatDate(nextDay),
        repaymentDay: nextDay.getDay(),
        totalRepaid: 0,
      });
      // Deduct 5M from accumulators: original first, then rebidding, then margin rebidding (waterfall)
      let remaining5M = 5000000;
      const deductFromOriginal = Math.min(remaining5M, accumulatorFromOriginal);
      accumulatorFromOriginal -= deductFromOriginal;
      remaining5M -= deductFromOriginal;
      const deductFromRebidding = Math.min(remaining5M, accumulatorFromRebidding);
      accumulatorFromRebidding -= deductFromRebidding;
      remaining5M -= deductFromRebidding;
      accumulatorFromMarginRebidding -= remaining5M;
      rebiddingPrincipalAccumulator -= 5000000;
      totalRebiddingFromPrincipal += 5000000;
    }

    // 2d. Process margin-rebidding loan repayments for today (Mode 2 only)
    let todayMarginRebiddingRepaymentTotal = 0;
    if (navMode === 2) {
      for (const mrl of marginRebiddingLoans) {
        if (dateStr < mrl.startDate) continue;
        if (current.getDay() !== mrl.repaymentDay) continue;
        const maxRepayment = mrl.loanAmount * 1.33;
        if (mrl.totalRepaid >= maxRepayment) continue;

        const repaymentAmount = mrl.weeklyRepayment;
        const dist = distributeRepayment(repaymentAmount);
        const actual = processRepaymentDistribution(dist);

        // Split margin between payout and rebidding accumulator
        const rebiddingPortion = actual.lenderMargin * (marginRebiddingPct / 100);
        marginRebiddingAccumulator += rebiddingPortion;
        totalAum += rebiddingPortion;
        aumFromMarginRebidding += rebiddingPortion;
        const marginToPayout = actual.lenderMargin - rebiddingPortion;

        // Add to main pools
        monthlyPools.lenderMargin += marginToPayout;
        monthlyPools.platformProvision += actual.platformProvision;
        monthlyPools.platformRevenue += actual.platformRevenue;
        monthlyPools.lenderPrincipal += actual.lenderPrincipal;
        cumulativePools.platformProvision += actual.platformProvision;
        cumulativePools.platformRevenue += actual.platformRevenue;
        cumulativePools.lenderPrincipal += actual.lenderPrincipal;

        // Principal from margin-rebidding loans feeds into principal rebidding accumulator
        rebiddingPrincipalAccumulator += actual.lenderPrincipal;
        accumulatorFromMarginRebidding += actual.lenderPrincipal;

        // Track in margin-rebidding-specific pools (for display)
        monthlyMarginRebiddingPools.lenderMargin += marginToPayout;
        monthlyMarginRebiddingPools.platformProvision += actual.platformProvision;
        monthlyMarginRebiddingPools.platformRevenue += actual.platformRevenue;
        monthlyMarginRebiddingPools.lenderPrincipal += actual.lenderPrincipal;
        cumulativeMarginRebiddingPools.lenderMargin += marginToPayout;
        cumulativeMarginRebiddingPools.platformProvision += actual.platformProvision;
        cumulativeMarginRebiddingPools.platformRevenue += actual.platformRevenue;
        cumulativeMarginRebiddingPools.lenderPrincipal += actual.lenderPrincipal;

        todayMarginRebiddingRepaymentTotal += repaymentAmount;
        totalMarginRebiddingRepaid += repaymentAmount;
        mrl.totalRepaid = (mrl.totalRepaid || 0) + repaymentAmount;
        totalRepaid += repaymentAmount;
      }
    }

    // 2e. Create margin-rebidding loans when accumulator reaches 5M threshold (Mode 2 only)
    // Margin is already in AUM (added when it entered the accumulator), so loan creation
    // only deducts from the accumulator — no AUM change, keeping NAV stable.
    if (navMode === 2) {
      while (writeOffDeficit <= 0 && marginRebiddingAccumulator >= 5000000) {
        const nextDay = addDays(current, 1);
        marginRebiddingLoans.push({
          loanAmount: 5000000,
          weeklyRepayment: 133000,
          startDate: formatDate(nextDay),
          repaymentDay: nextDay.getDay(),
          totalRepaid: 0,
        });
        marginRebiddingAccumulator -= 5000000;
      }
    }

    // 3. Process write-offs for today (accumulate for end of month)
    const todayWriteOffs = writeOffsByDate[dateStr] || [];
    for (const wo of todayWriteOffs) {
      monthlyWriteOffAmount += wo.outstandingAmount;
    }

    // 4. End of day: recalculate NAV
    if (totalUnits > 0) {
      if (navMode === 2) {
        // Mode 2: margin rebidding is already in AUM, so NAV = AUM / units
        nav = totalAum / totalUnits;
      } else {
        nav = calculateDailyNav(monthlyPools.lenderMargin, totalAum, totalUnits);
      }
    }

    // 5. Record daily snapshot
    const lenderSnapshots = {};
    for (const [lid, state] of Object.entries(lenderState)) {
      lenderSnapshots[lid] = { ...state };
    }

    // Display available principal directly from split accumulators.
    // These track actual principal from each source, reduced by rebidding deductions and write-offs.
    const displayOriginalPrincipal = Math.max(0, accumulatorFromOriginal);
    const displayRebiddingPrincipal = Math.max(0, accumulatorFromRebidding);

    dailySnapshots.push({
      date: dateStr,
      nav,
      totalUnits,
      totalAum,
      totalRepaid,
      totalInvested,
      totalWithdrawn,
      dailyRepayment: todayRepaymentTotal,
      dailyRebiddingRepayment: todayRebiddingRepaymentTotal,
      dailyMarginRebiddingRepayment: todayMarginRebiddingRepaymentTotal,
      totalRebiddingRepaid,
      totalMarginRebiddingRepaid,
      outstandingAmount: totalInvested - totalRepaid,
      accumulatedMargin: navMode === 2 ? marginRebiddingAccumulator : monthlyPools.lenderMargin,
      marginRebiddingAccumulator,
      aumFromInvestment,
      aumFromMarginRebidding,
      writeOffDeficit,
      recoveryMode: writeOffDeficit > 0,
      totalRecovered,
      monthlyRecoveryFunneled,
      pools: {
        lenderMargin: monthlyPools.lenderMargin,
        platformProvision: cumulativePools.platformProvision,
        platformRevenue: cumulativePools.platformRevenue,
        lenderPrincipal: displayOriginalPrincipal,
      },
      rebiddingPools: {
        lenderMargin: monthlyRebiddingPools.lenderMargin,
        platformProvision: cumulativeRebiddingPools.platformProvision,
        platformRevenue: cumulativeRebiddingPools.platformRevenue,
        lenderPrincipal: displayRebiddingPrincipal,
      },
      marginRebiddingPools: {
        lenderMargin: monthlyMarginRebiddingPools.lenderMargin,
        platformProvision: cumulativeMarginRebiddingPools.platformProvision,
        platformRevenue: cumulativeMarginRebiddingPools.platformRevenue,
        lenderPrincipal: Math.max(0, accumulatorFromMarginRebidding),
      },
      lenders: lenderSnapshots,
    });

    // 6. End of month processing
    if (isEndOfMonth(current)) {
      // Apply write-off absorption
      let writeOffResult = null;
      if (monthlyWriteOffAmount > 0) {
        // Mode 2: include marginRebiddingAccumulator in available margin for absorption
        const totalAvailableMargin = navMode === 2
          ? monthlyPools.lenderMargin + marginRebiddingAccumulator
          : monthlyPools.lenderMargin;

        // Absorb from available pool balances:
        // - lenderMargin: monthly only (resets each month, distributed to lenders)
        // - provision/revenue: cumulative (never distributed, full balance is available)
        // - lenderPrincipal: use rebiddingPrincipalAccumulator (available after rebidding deductions), not cumulative total
        const availablePools = {
          lenderMargin: totalAvailableMargin,
          platformProvision: cumulativePools.platformProvision,
          platformRevenue: cumulativePools.platformRevenue,
          lenderPrincipal: rebiddingPrincipalAccumulator,
        };
        const prePrincipal = rebiddingPrincipalAccumulator;

        writeOffResult = absorbWriteOff(availablePools, monthlyWriteOffAmount);

        // Mode 2: split remaining margin back proportionally between payout and rebidding
        if (navMode === 2) {
          const remainingMargin = writeOffResult.pools.lenderMargin;
          const preAccumulator = marginRebiddingAccumulator;
          if (totalAvailableMargin > 0) {
            const payoutRatio = monthlyPools.lenderMargin / totalAvailableMargin;
            monthlyPools.lenderMargin = remainingMargin * payoutRatio;
            marginRebiddingAccumulator = remainingMargin * (1 - payoutRatio);
          } else {
            monthlyPools.lenderMargin = 0;
            marginRebiddingAccumulator = 0;
          }
          // Accumulator margin is already in AUM, so reduce AUM by the absorbed amount
          const accumulatorReduction = preAccumulator - marginRebiddingAccumulator;
          if (accumulatorReduction > 0) {
            totalAum -= accumulatorReduction;
            aumFromMarginRebidding -= accumulatorReduction;
          }
        } else {
          // Update monthly margin for payout calculation
          monthlyPools.lenderMargin = writeOffResult.pools.lenderMargin;
        }

        // Update cumulative pools directly from absorption result
        cumulativePools.platformProvision = writeOffResult.pools.platformProvision;
        cumulativePools.platformRevenue = writeOffResult.pools.platformRevenue;

        // Adjust principal: prePrincipal was rebiddingPrincipalAccumulator (available after rebidding)
        const principalAbsorbedByWriteOff = prePrincipal - writeOffResult.pools.lenderPrincipal;
        if (principalAbsorbedByWriteOff > 0) {
          // Reduce cumulative pool by absorbed amount (keeps it in sync)
          cumulativePools.lenderPrincipal -= principalAbsorbedByWriteOff;

          // Deduct proportionally from all source accumulators
          const totalAccum = accumulatorFromOriginal + accumulatorFromRebidding + accumulatorFromMarginRebidding;
          if (totalAccum > 0) {
            const origShare = accumulatorFromOriginal / totalAccum;
            const rebShare = accumulatorFromRebidding / totalAccum;
            const marginRebShare = accumulatorFromMarginRebidding / totalAccum;
            accumulatorFromOriginal = Math.max(0, accumulatorFromOriginal - principalAbsorbedByWriteOff * origShare);
            accumulatorFromRebidding = Math.max(0, accumulatorFromRebidding - principalAbsorbedByWriteOff * rebShare);
            accumulatorFromMarginRebidding = Math.max(0, accumulatorFromMarginRebidding - principalAbsorbedByWriteOff * marginRebShare);
          }
          rebiddingPrincipalAccumulator = Math.max(0, rebiddingPrincipalAccumulator - principalAbsorbedByWriteOff);
        }

        // Adjust AUM for unabsorbed principal loss and track deficit for recovery
        if (writeOffResult.unabsorbed > 0) {
          totalAum -= writeOffResult.unabsorbed;
          aumFromInvestment -= writeOffResult.unabsorbed;
          writeOffDeficit += writeOffResult.unabsorbed;
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

      // Calculate average balance payouts (shadow calculation)
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const avgBalances = calculateMonthlyAvgBalances(balanceTracker, formatDate(monthStart), dateStr);
      const avgBalancePayoutsList = calculateAvgBalancePayouts(avgBalances, monthlyPools.lenderMargin);
      const totalAvgBalance = Object.values(avgBalances).reduce((sum, b) => sum + b, 0);

      // Record monthly payout event
      monthlyPayouts.push({
        date: dateStr,
        payouts,
        avgBalancePayouts: avgBalancePayoutsList,
        avgBalances,
        totalAvgBalance,
        totalUnits,
        totalMarginDistributed: monthlyPools.lenderMargin,
        writeOffAmount: monthlyWriteOffAmount,
        poolsAfterAbsorption: { ...monthlyPools },
        recoveryMode: writeOffDeficit > 0,
        monthlyRecoveryFunneled,
      });

      // Recalculate NAV after payout (margin pool emptied, AUM already adjusted)
      // Mode 2: margin rebidding is already in AUM, so same formula for both modes
      nav = totalUnits > 0 ? totalAum / totalUnits : INITIAL_NAV;

      // Update the last daily snapshot with post-payout NAV, AUM, and write-off details
      if (dailySnapshots.length > 0) {
        const lastSnap = dailySnapshots[dailySnapshots.length - 1];
        lastSnap.navAfterPayout = nav;
        lastSnap.totalAum = totalAum;
        lastSnap.aumFromInvestment = aumFromInvestment;
        lastSnap.aumFromMarginRebidding = aumFromMarginRebidding;
        lastSnap.marginRebiddingAccumulator = marginRebiddingAccumulator;
        if (navMode === 2) {
          lastSnap.accumulatedMargin = marginRebiddingAccumulator;
        } else {
          lastSnap.accumulatedMargin = 0; // margin pool emptied after payout
        }
        lastSnap.writeOffDeficit = writeOffDeficit;
        lastSnap.recoveryMode = writeOffDeficit > 0;
        lastSnap.totalRecovered = totalRecovered;
        lastSnap.monthlyRecoveryFunneled = monthlyRecoveryFunneled;
        if (writeOffResult && monthlyPayouts.length > 0) {
          const mp = monthlyPayouts[monthlyPayouts.length - 1];
          lastSnap.writeOffDetail = {
            totalWriteOff: mp.writeOffAmount,
            absorbed: writeOffResult.totalAbsorbed,
            unabsorbed: writeOffResult.unabsorbed,
          };
        }
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
      monthlyMarginRebiddingPools = {
        lenderMargin: 0,
        platformProvision: 0,
        platformRevenue: 0,
        lenderPrincipal: 0,
      };
      monthlyWriteOffAmount = 0;
      monthlyRecoveryFunneled = 0;
      // Note: marginRebiddingAccumulator persists across months (not reset)
    }

    current = addDays(current, 1);
  }

  // Build chart-ready data from snapshots
  return buildChartData(dailySnapshots, monthlyPayouts, lenderState, navMode);
}

function buildChartData(dailySnapshots, monthlyPayouts, finalLenderState, navMode = 1) {
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

  // Monthly Return Rate Chart: monthly % gain per lender
  const monthlyReturnRateData = monthlyPayouts.map((mp) => {
    const row = { date: mp.date };
    for (const p of mp.payouts) {
      const invested = finalLenderState[p.lenderId]?.totalInvested || 0;
      row[p.lenderId] = invested > 0
        ? Math.round((p.payout / invested) * 10000) / 100
        : 0;
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
    aumFromInvestment: Math.round(s.aumFromInvestment),
    aumFromMarginRebidding: Math.round(s.aumFromMarginRebidding),
    writeOffDeficit: Math.round(s.writeOffDeficit),
    recoveryMode: s.recoveryMode,
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
    marginRebLenderMargin: Math.round(s.marginRebiddingPools?.lenderMargin || 0),
    marginRebLenderPrincipal: Math.round(s.marginRebiddingPools?.lenderPrincipal || 0),
    marginRebPlatformRevenue: Math.round(s.marginRebiddingPools?.platformRevenue || 0),
    marginRebPlatformProvision: Math.round(s.marginRebiddingPools?.platformProvision || 0),
  }));

  // Margin Rebidding Accumulator Chart (Mode 2 only)
  const marginRebiddingAccumulatorData = dailySnapshots.map((s) => ({
    date: s.date,
    marginRebiddingAccumulator: Math.round(s.marginRebiddingAccumulator),
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

  // Daily Margin Rebidding Repayment Chart (Mode 2 only)
  const dailyMarginRebiddingRepaymentData = dailySnapshots.map((s) => ({
    date: s.date,
    dailyMarginRebiddingRepayment: Math.round(s.dailyMarginRebiddingRepayment),
  }));

  // Total Repayment Chart: cumulative repayment over time
  const totalRepaymentData = dailySnapshots.map((s) => ({
    date: s.date,
    totalRepaid: Math.round(s.totalRepaid),
    totalRebiddingRepaid: Math.round(s.totalRebiddingRepaid),
    totalMarginRebiddingRepaid: Math.round(s.totalMarginRebiddingRepaid),
  }));

  // Payout table data: one row per lender per payout month
  const payoutTableData = monthlyPayouts.flatMap((mp) =>
    mp.payouts.map((p) => ({
      date: mp.date,
      lenderId: p.lenderId,
      units: p.units,
      totalUnits: mp.totalUnits,
      totalMargin: mp.totalMarginDistributed,
      payout: p.payout,
      recoveryMode: mp.recoveryMode,
      monthlyRecoveryFunneled: mp.monthlyRecoveryFunneled,
    }))
  );

  // Return rate table data: one row per lender per payout month
  const payoutDateSet = new Set(monthlyPayouts.map((mp) => mp.date));
  const returnRateTableData = dailySnapshots
    .filter((s) => payoutDateSet.has(s.date))
    .flatMap((s) =>
      Object.entries(s.lenders)
        .filter(([, state]) => state.totalInvested > 0)
        .map(([lid, state]) => ({
          date: s.date,
          lenderId: lid,
          totalPayout: state.totalPayout,
          totalInvested: state.totalInvested,
          returnRate:
            Math.round((state.totalPayout / state.totalInvested) * 10000) / 100,
        }))
    );

  // Table data: raw snapshot data for calculation tables
  const tableData = dailySnapshots.map((s) => ({
    date: s.date,
    dailyRepayment: s.dailyRepayment,
    dailyRebiddingRepayment: s.dailyRebiddingRepayment,
    dailyMarginRebiddingRepayment: s.dailyMarginRebiddingRepayment,
    lenderMargin: s.pools.lenderMargin,
    lenderPrincipal: s.pools.lenderPrincipal,
    platformRevenue: s.pools.platformRevenue,
    platformProvision: s.pools.platformProvision,
    rebiddingLenderMargin: s.rebiddingPools.lenderMargin,
    rebiddingLenderPrincipal: s.rebiddingPools.lenderPrincipal,
    rebiddingPlatformRevenue: s.rebiddingPools.platformRevenue,
    rebiddingPlatformProvision: s.rebiddingPools.platformProvision,
    marginRebLenderMargin: s.marginRebiddingPools?.lenderMargin || 0,
    marginRebLenderPrincipal: s.marginRebiddingPools?.lenderPrincipal || 0,
    marginRebPlatformRevenue: s.marginRebiddingPools?.platformRevenue || 0,
    marginRebPlatformProvision: s.marginRebiddingPools?.platformProvision || 0,
    nav: s.navAfterPayout ?? s.nav,
    accumulatedMargin: s.accumulatedMargin,
    marginRebiddingAccumulator: s.marginRebiddingAccumulator,
    totalAum: s.totalAum,
    aumFromInvestment: s.aumFromInvestment,
    aumFromMarginRebidding: s.aumFromMarginRebidding,
    totalUnits: s.totalUnits,
    totalInvested: s.totalInvested,
    totalWithdrawn: s.totalWithdrawn,
    totalRepaid: s.totalRepaid,
    writeOffDetail: s.writeOffDetail || null,
    writeOffDeficit: s.writeOffDeficit,
    recoveryMode: s.recoveryMode,
    totalRecovered: s.totalRecovered,
    monthlyRecoveryFunneled: s.monthlyRecoveryFunneled,
  }));

  // Profit Comparison Chart: cumulative payout per lender per month (NAV vs Avg Balance)
  const cumulativeNav = {}; // lenderId -> cumulative NAV payout
  const cumulativeAvg = {}; // lenderId -> cumulative avg balance payout
  const profitComparisonData = monthlyPayouts.map((mp) => {
    const row = { date: mp.date };
    for (const lid of allLenderIds) {
      const navPayout = mp.payouts.find((p) => p.lenderId === lid);
      cumulativeNav[lid] = (cumulativeNav[lid] || 0) + (navPayout ? navPayout.payout : 0);
      row[`nav_${lid}`] = Math.round(cumulativeNav[lid]);

      const avgPayout = mp.avgBalancePayouts.find((p) => p.lenderId === lid);
      cumulativeAvg[lid] = (cumulativeAvg[lid] || 0) + (avgPayout ? avgPayout.payout : 0);
      row[`avg_${lid}`] = Math.round(cumulativeAvg[lid]);
    }
    return row;
  });

  // Profit Comparison Table: one row per lender per month with side-by-side data
  const profitComparisonTableData = monthlyPayouts.flatMap((mp) =>
    mp.payouts.map((p) => {
      const avgEntry = mp.avgBalancePayouts.find((a) => a.lenderId === p.lenderId);
      const avgBalance = mp.avgBalances[p.lenderId] || 0;
      return {
        date: mp.date,
        lenderId: p.lenderId,
        units: p.units,
        totalUnits: mp.totalUnits,
        navPayout: p.payout,
        avgBalance,
        totalAvgBalance: mp.totalAvgBalance,
        avgBalPayout: avgEntry ? avgEntry.payout : 0,
        totalMargin: mp.totalMarginDistributed,
        difference: p.payout - (avgEntry ? avgEntry.payout : 0),
      };
    })
  );

  return {
    navData,
    repaymentData,
    payoutData,
    monthlyReturnRateData,
    returnRateData,
    principalReturnedData,
    navUnitsData,
    lenderUnitsData,
    aumData,
    poolsData,
    dailyRepaymentData,
    dailyRebiddingRepaymentData,
    dailyMarginRebiddingRepaymentData,
    totalRepaymentData,
    marginRebiddingAccumulatorData,
    tableData,
    payoutTableData,
    returnRateTableData,
    profitComparisonData,
    profitComparisonTableData,
    lenderIds: allLenderIds,
    allLenderIds: [...new Set(Object.keys(finalLenderState))],
    navMode,
  };
}
