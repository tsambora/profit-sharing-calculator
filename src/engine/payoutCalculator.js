// Monthly payout (coupon) distribution
// Each lender gets: (units owned / total units) * total accumulated lender margin
// Margin pool empties after payout

export function calculateLenderPayouts(lenders, totalUnits, accumulatedMargin) {
  if (totalUnits <= 0 || accumulatedMargin <= 0) {
    return lenders.map((l) => ({ lenderId: l.lenderId, units: l.units, payout: 0 }));
  }

  return lenders.map((l) => ({
    lenderId: l.lenderId,
    units: l.units,
    payout: (l.units / totalUnits) * accumulatedMargin,
  }));
}
