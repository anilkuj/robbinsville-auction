const { getState } = require('./state');
const { saveState } = require('./persistence');

let auctionTimer = null;

// Pure function — identical logic used on client for BidButton disabled state
function computeMaxBid(budget, rosterSize, squadSize, minBid) {
  const playersStillNeededAfterThis = Math.max(0, squadSize - rosterSize - 1);
  const mustKeepInReserve = playersStillNeededAfterThis * minBid;
  return budget - mustKeepInReserve;
}

// Build public state (strip team passwords)
function getPublicState() {
  const state = getState();
  const teams = {};
  for (const [id, team] of Object.entries(state.teams)) {
    teams[id] = {
      id: team.id,
      name: team.name,
      budget: team.budget,
      roster: team.roster,
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
  // If timer hasn't actually expired yet (race condition), reschedule
  if (state.timerEndsAt && now < state.timerEndsAt - 500) {
    scheduleTimer(io, state.timerEndsAt - now);
    return;
  }

  // Manual end mode — don't auto-sell, signal admin to hammer
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

function findNextPendingIndex(fromIndex, randomize = false) {
  const state = getState();
  // Collect all pending indices from fromIndex onward
  const pending = [];
  for (let i = fromIndex; i < state.players.length; i++) {
    if (state.players[i].status === 'PENDING') pending.push(i);
  }
  if (pending.length === 0) return -1;
  if (!randomize) return pending[0];

  // Determine the current pool from the first pending player (preserves pool order)
  const currentPool = state.players[pending[0]].pool;
  const inPool = pending.filter(i => state.players[i].pool === currentPool);
  return inPool[Math.floor(Math.random() * inPool.length)];
}

function startPlayer(io, playerIndex) {
  const state = getState();

  const randomize = state.settings.randomizePool ?? false;
  const idx = (playerIndex !== undefined && playerIndex !== null)
    ? playerIndex
    : findNextPendingIndex(0, randomize);

  if (idx === -1 || idx >= state.players.length) {
    // All players done
    state.phase = 'ENDED';
    state.currentPlayerIndex = null;
    state.currentBid = { amount: 0, teamId: null, history: [] };
    state.timerEndsAt = null;
    saveState();
    io.emit('auction:phaseChange', getPublicState());
    return;
  }

  const player = state.players[idx];
  if (!player || player.status !== 'PENDING') {
    const nextIdx = findNextPendingIndex(idx + 1, randomize);
    if (nextIdx === -1) {
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
  computeMaxBid, // exported for adminHandlers budget validation
  getPublicState,
  startPlayer,
  processSold,
  processUnsold,
  pauseTimer,
  resumeTimer,
  scheduleTimer,
  clearAuctionTimer,
  handleTimerExpiry,
};
