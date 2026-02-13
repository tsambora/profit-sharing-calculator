// Write-off absorption follows a waterfall in this exact order:
// 1. Lender margin pool absorbs first
// 2. Platform provision pool absorbs next
// 3. Platform revenue (margin) pool absorbs next
// 4. Lender principal pool absorbs last

export function absorbWriteOff(pools, writeOffAmount) {
  let remaining = writeOffAmount;

  // Clone pools
  const result = {
    lenderMargin: pools.lenderMargin,
    platformProvision: pools.platformProvision,
    platformRevenue: pools.platformRevenue,
    lenderPrincipal: pools.lenderPrincipal,
  };

  // 1. Lender margin absorbs first
  const marginAbsorbed = Math.min(remaining, result.lenderMargin);
  result.lenderMargin -= marginAbsorbed;
  remaining -= marginAbsorbed;

  // 2. Platform provision absorbs next
  const provisionAbsorbed = Math.min(remaining, result.platformProvision);
  result.platformProvision -= provisionAbsorbed;
  remaining -= provisionAbsorbed;

  // 3. Platform revenue absorbs next
  const revenueAbsorbed = Math.min(remaining, result.platformRevenue);
  result.platformRevenue -= revenueAbsorbed;
  remaining -= revenueAbsorbed;

  // 4. Lender principal absorbs last
  const principalAbsorbed = Math.min(remaining, result.lenderPrincipal);
  result.lenderPrincipal -= principalAbsorbed;
  remaining -= principalAbsorbed;

  return {
    pools: result,
    totalAbsorbed: writeOffAmount - remaining,
    unabsorbed: remaining,
    marginWipedOut: marginAbsorbed >= pools.lenderMargin,
  };
}
