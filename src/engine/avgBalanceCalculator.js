// Average Balance profit distribution calculator
// Shadow calculation for comparing with NAV-based distribution

// Record a balance change event for a lender
// balanceTracker: { lenderId -> [{ date, balance }] }
export function recordBalanceChange(balanceTracker, lenderId, date, newBalance) {
  if (!balanceTracker[lenderId]) {
    balanceTracker[lenderId] = [];
  }
  balanceTracker[lenderId].push({ date, balance: newBalance });
}

// Compute time-weighted average balance per lender for a month
// Returns: { lenderId -> avgBalance }
export function calculateMonthlyAvgBalances(balanceTracker, monthStartDate, monthEndDate) {
  const startMs = new Date(monthStartDate).getTime();
  const endMs = new Date(monthEndDate).getTime();
  const totalDays = (endMs - startMs) / (1000 * 60 * 60 * 24) + 1; // inclusive

  const avgBalances = {};

  for (const [lenderId, events] of Object.entries(balanceTracker)) {
    // Build sorted list of balance changes up to and including this month
    const relevant = events
      .map((e) => ({ date: new Date(e.date).getTime(), balance: e.balance }))
      .sort((a, b) => a.date - b.date);

    if (relevant.length === 0) {
      avgBalances[lenderId] = 0;
      continue;
    }

    // Find the balance at the start of the month (last event before or on monthStartDate)
    let balanceAtStart = 0;
    for (const e of relevant) {
      if (e.date <= startMs) {
        balanceAtStart = e.balance;
      } else {
        break;
      }
    }

    // Walk through the month day-by-day computing weighted sum
    let weightedSum = 0;
    let currentBalance = balanceAtStart;

    // Get events within this month
    const monthEvents = relevant.filter((e) => e.date > startMs && e.date <= endMs);

    let prevMs = startMs;
    for (const e of monthEvents) {
      // Days at current balance (from prev to this event)
      const daysAtBalance = (e.date - prevMs) / (1000 * 60 * 60 * 24);
      weightedSum += currentBalance * daysAtBalance;
      currentBalance = e.balance;
      prevMs = e.date;
    }

    // Remaining days until end of month (inclusive)
    const remainingDays = (endMs - prevMs) / (1000 * 60 * 60 * 24) + 1;
    weightedSum += currentBalance * remainingDays;

    avgBalances[lenderId] = weightedSum / totalDays;
  }

  return avgBalances;
}

// Distribute margin pool proportionally by average balance
// Returns: [{ lenderId, avgBalance, payout }]
export function calculateAvgBalancePayouts(avgBalances, accumulatedMargin) {
  const totalAvgBalance = Object.values(avgBalances).reduce((sum, b) => sum + b, 0);

  if (totalAvgBalance <= 0 || accumulatedMargin <= 0) {
    return Object.entries(avgBalances).map(([lenderId, avgBalance]) => ({
      lenderId,
      avgBalance,
      payout: 0,
    }));
  }

  return Object.entries(avgBalances).map(([lenderId, avgBalance]) => ({
    lenderId,
    avgBalance,
    payout: (avgBalance / totalAvgBalance) * accumulatedMargin,
  }));
}
