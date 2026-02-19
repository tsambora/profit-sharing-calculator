// NAV (Net Asset Value) Calculator
// Initial NAV: 100,000 IDR
// On investment: units = amount / current NAV
// End of day: NAV = (accumulated margin + AUM) / total units

export const INITIAL_NAV = 100000;

export function calculateUnitsForInvestment(amount, currentNav) {
  return amount / currentNav;
}

export function calculateUnitsForWithdrawal(amount, currentNav) {
  return amount / currentNav;
}

export function calculateDailyNav(accumulatedMargin, totalAum, totalUnits) {
  if (totalUnits <= 0) return INITIAL_NAV;
  return (accumulatedMargin + totalAum) / totalUnits;
}

export function calculateDailyNavMode2(marginRebiddingAccumulator, totalAum, totalUnits) {
  if (totalUnits <= 0) return INITIAL_NAV;
  return (marginRebiddingAccumulator + totalAum) / totalUnits;
}

export function calculateNavAfterPayout(totalAum, totalUnits, writeOffAmount, lenderMarginPool) {
  if (totalUnits <= 0) return INITIAL_NAV;
  // If write-off exceeds margin, NAV takes a hit
  if (writeOffAmount > lenderMarginPool) {
    return (totalAum - (writeOffAmount - lenderMarginPool)) / totalUnits;
  }
  // If write-off <= margin, full AUM preserved
  return totalAum / totalUnits;
}
