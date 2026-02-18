// Repayment distribution splits each 133,000 IDR repayment into 4 pools
// Based on a 5,000,000 IDR loan repaid over 50 installments at 133,000 each (133% of loan):
// - Lenders principal: 100,000 (base principal return)
// - Lenders margin: 15,000 (15% of principal)
// - Platform margin: 17,000 (17% of principal)
// - Platform provision: 1,000 (1% of principal)

const REPAYMENT_AMOUNT = 133000;

const FIXED_AMOUNTS = {
  lenderPrincipal: 100000,
  lenderMargin: 15000,
  platformRevenue: 17000,
  platformProvision: 1000,
};

const SPLITS = {
  lenderMargin: FIXED_AMOUNTS.lenderMargin / REPAYMENT_AMOUNT,
  platformProvision: FIXED_AMOUNTS.platformProvision / REPAYMENT_AMOUNT,
  platformRevenue: FIXED_AMOUNTS.platformRevenue / REPAYMENT_AMOUNT,
  lenderPrincipal: FIXED_AMOUNTS.lenderPrincipal / REPAYMENT_AMOUNT,
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

export { SPLITS, FIXED_AMOUNTS, REPAYMENT_AMOUNT };
