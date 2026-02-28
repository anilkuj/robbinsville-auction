const { getState } = require('./state');
const { saveState } = require('./persistence');

let auctionTimer = null;

// Pure function — identical logic used on client for BidButton disabled state
function computeMaxBid(budget, rosterSize, squadSize, minBid) {
  const playersStillNeededAfterThis = Math.max(0, squadSize - rosterSize - 1);
  const mustKeepInReserve = playersStillNeededAfterThis * minBid;
  return budget - mustKeepInReserve;
}

// ── Owner helpers ─────────────────────────────────────────────────────────────

// A player is an "owner" when their extra type column (key "type" or "player_type",
// case-insensitive) equals "owner" (case-insensitive value).
function isOwner(player) {
  if (!player.extra) return false;
  const typeKey = Object.keys(player.extra).find(k => k.toLowerCase() === 'type' || k.toLowerCase() === 'player_type');
  return typeKey ? String(player.extra[typeKey]).toLowerCase() === 'owner' : false;
}

// Average soldFor of non-owner SOLD players in the given pool.
function getPoolAverage(players, poolId) {
  const sold = players.filter(p =>
    p.pool === poolId && p.status === 'SOLD' && !isOwner(p)
  );
  if (sold.length === 0) return 0;
  return Math.round(sold.reduce((s, p) => s + p.soldFor, 0) / sold.length);
}

// Recalculate the pool average and push it to all owner players in that pool.
// Owner players get status SOLD automatically (no budget deduction).
// Team resolved via: (1) League Setup ownerPlayerId, (2) CSV extra.team column.
function syncOwnerAverages(state, poolId) {
  const avg = getPoolAverage(state.players, poolId);
  const owners = state.players.filter(p => p.pool === poolId && isOwner(p));
  if (owners.length === 0) return;

  for (const owner of owners) {
    if (avg === 0) {
      // No sold non-owner players remain (e.g. last sold player was re-auctioned).
      // Revert owner back to PENDING and remove from roster.
      if (owner.status === 'SOLD') {
        if (owner.soldTo && state.teams[owner.soldTo]) {
          const team = state.teams[owner.soldTo];
          const idx = team.roster.findIndex(r => r.playerId === owner.id);
          if (idx !== -1) team.roster.splice(idx, 1);
        }
        owner.status = 'PENDING';
        owner.soldTo = null;
        owner.soldFor = null;
      }
      continue;
    }

    owner.soldFor = avg;

    if (owner.status !== 'SOLD') {
      // First time being resolved — mark SOLD and assign to team.
      owner.status = 'SOLD';

      // Team resolution priority:
      // 1. League Setup ownerPlayerId (admin explicitly linked this player to a team)
      // 2. CSV extra.team column (case-insensitive key + value match)
      let team = Object.values(state.teams).find(t => t.ownerPlayerId === owner.id);

      if (!team) {
        const teamKey = Object.keys(owner.extra || {}).find(k => k.toLowerCase() === 'team');
        if (teamKey) {
          const teamName = String(owner.extra[teamKey]).trim().toLowerCase();
          team = Object.values(state.teams).find(t => t.name.trim().toLowerCase() === teamName);
        }
      }

      if (team && !team.roster.find(r => r.playerId === owner.id)) {
        owner.soldTo = team.id;
        team.roster.push({
          playerId: owner.id,
          playerName: owner.name,
          pool: owner.pool,
          price: avg,
          isOwner: true,
          ...(owner.extra && { extra: owner.extra }),
        });
      }
    } else {
      // Already sold — update roster entry price only (no budget adjustment for owners).
      if (owner.soldTo && state.teams[owner.soldTo]) {
        const entry = state.teams[owner.soldTo].roster.find(r => r.playerId === owner.id);
        if (entry) entry.price = avg;
      }
    }
  }
}

// ── Public state ──────────────────────────────────────────────────────────────

function getPublicState() {
  const state = getState();
  const teams = {};
  for (const [id, team] of Object.entries(state.teams)) {
    teams[id] = {
      id: team.id,
      name: team.name,
      budget: team.budget,
      roster: team.roster,
      ownerIsPlayer: team.ownerIsPlayer || false,
      ownerPlayerId: team.ownerPlayerId || null,
    };
  }
  return { ...state, teams };
}

function clearAuctionTimer() {
  if (auctionTimer) {
    clearTimeout(auctionTimer);
    auctionTimer = null;
  }
}

function scheduleTimer(io, durationMs) {
  clearAuctionTimer();
  auctionTimer = setTimeout(() => {
    handleTimerExpiry(io);
  }, durationMs);
}

function handleTimerExpiry(io) {
  const state = getState();
  if (state.phase !== 'LIVE' || state.timerPaused) return;

  const now = Date.now();
  if (state.timerEndsAt && now < state.timerEndsAt - 500) {
    scheduleTimer(io, state.timerEndsAt - now);
    return;
  }

  if (state.settings.endMode === 'manual') {
    state.timerEndsAt = null;
    saveState();
    io.emit('auction:awaitingHammer', getPublicState());
    return;
  }

  if (state.currentBid.teamId) {
    processSold(io);
  } else {
    processUnsold(io);
  }
}

// Only non-owner PENDING players are eligible for the auction queue.
// To ensure we ALWAYS clear a pool before moving to the next, we use the pool
// of the absolute first pending player in the list, rather than the fromIndex player.
function findNextPendingIndex(fromIndex, randomize = false) {
  const state = getState();
  const pending = [];

  // Find all pending eligible players after the fromIndex
  for (let i = fromIndex; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.status === 'PENDING' && !isOwner(p)) pending.push(i);
  }

  if (pending.length === 0) return -1;

  // Determine the pool of the VERY FIRST pending player in the entire list
  // regardless of fromIndex, so we finish pools in order
  let firstPendingPool = null;
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.status === 'PENDING' && !isOwner(p)) {
      firstPendingPool = p.pool;
      break;
    }
  }

  // If randomize is off, just take the first pending from fromIndex (standard flow)
  if (!randomize) return pending[0];

  // If randomize is on, gather ALL pending players from the currently active pool
  const inPool = [];
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.status === 'PENDING' && !isOwner(p) && p.pool === firstPendingPool) {
      inPool.push(i);
    }
  }

  if (inPool.length > 0) {
    return inPool[Math.floor(Math.random() * inPool.length)];
  }

  return pending[0];
}

function startPlayer(io, playerIndex) {
  const state = getState();

  const randomize = state.settings.randomizePool ?? false;
  const idx = (playerIndex !== undefined && playerIndex !== null)
    ? playerIndex
    : findNextPendingIndex(0, randomize);

  if (idx === -1 || idx >= state.players.length) {
    // All non-owner players done — do a final owner average sync before ENDED
    const poolIds = [...new Set(state.players.map(p => p.pool))];
    for (const poolId of poolIds) syncOwnerAverages(state, poolId);

    state.phase = 'ENDED';
    state.currentPlayerIndex = null;
    state.currentBid = { amount: 0, teamId: null, history: [] };
    state.timerEndsAt = null;
    saveState();
    io.emit('auction:phaseChange', getPublicState());
    return;
  }

  const player = state.players[idx];
  if (!player || player.status !== 'PENDING' || isOwner(player)) {
    const nextIdx = findNextPendingIndex(idx + 1, randomize);
    if (nextIdx === -1) {
      const poolIds = [...new Set(state.players.map(p => p.pool))];
      for (const poolId of poolIds) syncOwnerAverages(state, poolId);

      state.phase = 'ENDED';
      state.currentPlayerIndex = null;
      state.currentBid = { amount: 0, teamId: null, history: [] };
      state.timerEndsAt = null;
      saveState();
      io.emit('auction:phaseChange', getPublicState());
      return;
    }
    startPlayer(io, nextIdx);
    return;
  }

  state.currentPlayerIndex = idx;
  state.phase = 'LIVE';
  state.timerPaused = false;
  state.timerRemainingOnPause = 0;
  state.currentBid = {
    amount: player.basePrice,
    teamId: null,
    history: [],
  };
  state.timerEndsAt = Date.now() + state.settings.timerSeconds * 1000;

  saveState();
  io.emit('auction:playerUp', getPublicState());
  scheduleTimer(io, state.settings.timerSeconds * 1000);
}

function processSold(io) {
  const state = getState();
  const player = state.players[state.currentPlayerIndex];
  const { amount, teamId, history } = state.currentBid;

  player.status = 'SOLD';
  player.soldTo = teamId;
  player.soldFor = amount;

  const team = state.teams[teamId];
  if (team) {
    team.budget -= amount;
    team.roster.push({
      playerId: player.id,
      playerName: player.name,
      pool: player.pool,
      price: amount,
      ...(player.extra && { extra: player.extra }),
    });
  }

  // Recalculate owner averages for this pool
  syncOwnerAverages(state, player.pool);

  const soldEvent = {
    player: { ...player },
    teamId,
    amount,
    teamName: team?.name || '',
  };

  state.lastSoldPlayerId = player.id;
  state.phase = 'SETUP';
  state.currentPlayerIndex = null;
  state.currentBid = { amount: 0, teamId: null, history: [] };
  state.timerEndsAt = null;

  clearAuctionTimer();
  saveState();
  io.emit('auction:sold', { ...soldEvent, publicState: getPublicState() });
}

function processUnsold(io) {
  const state = getState();
  const player = state.players[state.currentPlayerIndex];

  player.status = 'UNSOLD';
  if (!state.unsoldPlayers.includes(player.id)) {
    state.unsoldPlayers.push(player.id);
  }

  const unsoldEvent = { player: { ...player } };

  state.phase = 'SETUP';
  state.currentPlayerIndex = null;
  state.currentBid = { amount: 0, teamId: null, history: [] };
  state.timerEndsAt = null;

  clearAuctionTimer();
  saveState();
  io.emit('auction:unsold', { ...unsoldEvent, publicState: getPublicState() });
}

function pauseTimer(io) {
  const state = getState();
  if (state.phase !== 'LIVE' || state.timerPaused) return false;

  state.timerPaused = true;
  state.timerRemainingOnPause = Math.max(0, (state.timerEndsAt || Date.now()) - Date.now());
  state.timerEndsAt = null;

  clearAuctionTimer();
  saveState();
  io.emit('auction:paused', getPublicState());
  return true;
}

function resumeTimer(io) {
  const state = getState();
  if (state.phase !== 'LIVE' || !state.timerPaused) return false;

  const remaining = state.timerRemainingOnPause || state.settings.timerSeconds * 1000;
  state.timerPaused = false;
  state.timerRemainingOnPause = 0;
  state.timerEndsAt = Date.now() + remaining;

  saveState();
  io.emit('auction:resumed', getPublicState());
  scheduleTimer(io, remaining);
  return true;
}

module.exports = {
  computeMaxBid,
  getPublicState,
  startPlayer,
  processSold,
  processUnsold,
  pauseTimer,
  resumeTimer,
  scheduleTimer,
  clearAuctionTimer,
  handleTimerExpiry,
  isOwner,
  syncOwnerAverages,
};
