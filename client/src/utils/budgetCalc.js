/**
 * Computes the maximum bid a team can make.
 * Mirror of server/auction.js computeMaxBid — keep in sync.
 */
export function computeMaxBid(budget, rosterSize, squadSize = 18, minBid = 1000) {
  const playersStillNeededAfterThis = Math.max(0, squadSize - rosterSize - 1);
  const mustKeepInReserve = playersStillNeededAfterThis * minBid;
  return budget - mustKeepInReserve;
}

export function isOwner(player) {
  if (!player.extra) return false;
  return Object.entries(player.extra).some(([k, v]) => {
    const lowK = k?.trim().toLowerCase();
    const lowV = String(v || '').trim().toLowerCase();
    return (lowK === 'type' || lowK === 'player_type') && lowV === 'owner';
  });
}

export function getTeamForOwner(state, ownerPlayer) {
  let team = Object.values(state.teams).find(t => t.ownerPlayerIds && t.ownerPlayerIds.includes(ownerPlayer.id));

  if (!team) {
    const teamKey = Object.keys(ownerPlayer.extra || {}).find(k => {
      const kl = String(k).trim().toLowerCase();
      return kl.startsWith('team') || kl === 'soldto';
    });
    if (teamKey) {
      const teamName = String(ownerPlayer.extra[teamKey]).replace(/\s+/g, ' ').trim().toLowerCase();
      team = Object.values(state.teams).find(t => t.name.replace(/\s+/g, ' ').trim().toLowerCase() === teamName);
    }
  }
  return team;
}

export function computeTrueMaxBid(state, biddingTeamId, currentPlayerId) {
  const biddingTeam = state.teams[biddingTeamId];
  if (!biddingTeam) return 0;
  
  const currentPlayer = state.players.find(p => p.id === currentPlayerId);
  if (!currentPlayer) {
    // Fallback if player ID not found for any reason
    const { squadSize, minBid } = state.leagueConfig;
    return computeMaxBid(biddingTeam.budget, biddingTeam.roster.length, squadSize, minBid);
  }
  
  const { squadSize, minBid } = state.leagueConfig;
  const maxPossible = computeMaxBid(biddingTeam.budget, biddingTeam.roster.length, squadSize, minBid);

  if (isOwner(currentPlayer) || maxPossible <= 0) {
    return Math.max(0, maxPossible);
  }

  const bracketStart = Math.floor(currentPlayer.sortOrder / 10) * 10;
  const bracketEnd = bracketStart + 9;

  const affectedOwners = state.players.filter(p => 
    isOwner(p) && p.sortOrder >= bracketStart && p.sortOrder <= bracketEnd
  );

  if (affectedOwners.length === 0) {
    return Math.max(0, maxPossible);
  }

  const soldInBracket = state.players.filter(p =>
    p.sortOrder >= bracketStart && 
    p.sortOrder <= bracketEnd && 
    p.status === 'SOLD' && 
    !isOwner(p)
  );

  const existingSum = soldInBracket.reduce((sum, p) => sum + p.soldFor, 0);
  const newCount = soldInBracket.length + 1;

  let low = currentPlayer.basePrice;
  let high = maxPossible;
  let bestValidBid = low - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const projectedAverage = Math.round((existingSum + mid) / newCount);

    let isValid = true;

    for (const owner of affectedOwners) {
      const ownerTeam = getTeamForOwner(state, owner);
      if (!ownerTeam) continue;

      let currentOwnerPrice = 0;
      const rosterEntry = ownerTeam.roster.find(r => r.playerId === owner.id);
      if (rosterEntry) {
         currentOwnerPrice = rosterEntry.price;
      } else if (owner.status === 'SOLD') {
         currentOwnerPrice = owner.soldFor || 0;
      }
      
      const dummyPriceIncrease = Math.max(0, projectedAverage - currentOwnerPrice);

      let projectedBudget = ownerTeam.budget - dummyPriceIncrease;
      
      let projectedRosterSize = ownerTeam.roster.length;
      if (ownerTeam.id === biddingTeamId) {
        projectedBudget -= mid;
        projectedRosterSize += 1;
      }

      const playersStillNeededAfterThis = Math.max(0, squadSize - projectedRosterSize);
      let mustKeepInReserve = playersStillNeededAfterThis * minBid;

      // Add a buffer above base price for any owner on this team whose bracket hasn't sold yet
      // This protects them from spending down to exactly zero and then going bankrupt when their dummy averages spike.
      const multiplier = (state.settings?.ownerAverageMultiplier ?? 1.5) - 1.0;
      const teamOwners = state.players.filter(p => isOwner(p) && getTeamForOwner(state, p)?.id === ownerTeam.id);
      for (const tOwner of teamOwners) {
        // Only reserve multiplier buffer if the owner's price hasn't locked yet (PENDING)
        // AND they are NOT actively having their price evaluated in THIS bracket
        const isCurrentBracket = tOwner.sortOrder >= bracketStart && tOwner.sortOrder <= bracketEnd;
        if (tOwner.status === 'PENDING' && !isCurrentBracket) {
          mustKeepInReserve += Math.round(tOwner.basePrice * multiplier);
        }
      }

      if (projectedBudget < mustKeepInReserve) {
        if (ownerTeam.id === biddingTeamId) {
          isValid = false;
        }
        break;
      }
    }

    // Check the bidding team itself if it wasn't already checked as an affected owner
    // This handles the case where the bidding team IS NOT an affected owner
    // but their pure budget constraint is violated by the raw bid amount
    if (isValid) {
      const biddingTeamIsAffected = affectedOwners.some(o => getTeamForOwner(state, o)?.id === biddingTeamId);
      if (!biddingTeamIsAffected) {
        let projectedBudget = biddingTeam.budget - mid;
        let projectedRosterSize = biddingTeam.roster.length + 1;
        const playersStillNeededAfterThis = Math.max(0, squadSize - projectedRosterSize);
        let mustKeepInReserve = playersStillNeededAfterThis * minBid;
        
        const multiplier = (state.settings?.ownerAverageMultiplier ?? 1.5) - 1.0;
        const teamOwners = state.players.filter(p => isOwner(p) && getTeamForOwner(state, p)?.id === biddingTeam.id);
        for (const tOwner of teamOwners) {
          const isCurrentBracket = tOwner.sortOrder >= bracketStart && tOwner.sortOrder <= bracketEnd;
          if (tOwner.status === 'PENDING' && !isCurrentBracket) {
            mustKeepInReserve += Math.round(tOwner.basePrice * multiplier);
          }
        }

        if (projectedBudget < mustKeepInReserve) {
          isValid = false;
        }
      }
    }

    if (isValid) {
      bestValidBid = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(0, bestValidBid);
}

export function formatPts(amount) {
  if (amount == null) return '—';
  return amount.toLocaleString() + ' pts';
}
