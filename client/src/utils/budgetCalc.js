/**
 * Computes the maximum bid a team can make.
 * Mirror of server/auction.js computeMaxBid — keep in sync.
 */
export function computeMaxBid(budget, rosterSize, squadSize = 18, minBid = 1000) {
  const playersStillNeededAfterThis = Math.max(0, squadSize - rosterSize - 1);
  const mustKeepInReserve = playersStillNeededAfterThis * minBid;
  return budget - mustKeepInReserve;
}

export function formatPts(amount) {
  if (amount == null) return '—';
  return amount.toLocaleString() + ' pts';
}
