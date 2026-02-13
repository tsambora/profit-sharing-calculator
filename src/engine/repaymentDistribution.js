// Repayment distribution splits each repayment into 4 pools
// Lender margin: 15%, Platform provision: 1%, Platform revenue: 17%, Lender principal: 67%

const SPLITS = {
  lenderMargin: 0.15,
  platformProvision: 0.01,
  platformRevenue: 0.17,
  lenderPrincipal: 0.67,
};

export function distributeRepayment(amount) {
  return {
    lenderMargin: amount * SPLITS.lenderMargin,
    platformProvision: amount * SPLITS.platformProvision,
    platformRevenue: amount * SPLITS.platformRevenue,
    lenderPrincipal: amount * SPLITS.lenderPrincipal,
  };
}

export function accumulateDistributions(distributions) {
  return distributions.reduce(
    (acc, d) => ({
      lenderMargin: acc.lenderMargin + d.lenderMargin,
      platformProvision: acc.platformProvision + d.platformProvision,
      platformRevenue: acc.platformRevenue + d.platformRevenue,
      lenderPrincipal: acc.lenderPrincipal + d.lenderPrincipal,
    }),
    { lenderMargin: 0, platformProvision: 0, platformRevenue: 0, lenderPrincipal: 0 }
  );
}

export { SPLITS };
