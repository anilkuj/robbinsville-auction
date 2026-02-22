const { getState } = require('../state');
const { saveState } = require('../persistence');
const {
  getPublicState,
  startPlayer,
  pauseTimer,
  resumeTimer,
  processSold,
  processUnsold,
  clearAuctionTimer,
  computeMaxBid,
} = require('../auction');

function registerAdminHandlers(io, socket) {
  socket.on('admin:nextPlayer', () => {
    const state = getState();
    if (state.phase !== 'SETUP') {
      socket.emit('admin:error', { message: 'Can only advance player in SETUP phase' });
      return;
    }
    startPlayer(io);
  });

  socket.on('admin:pauseTimer', () => {
    const state = getState();
    if (state.phase !== 'LIVE') {
      socket.emit('admin:error', { message: 'Cannot pause: not in LIVE phase' });
      return;
    }
    if (state.timerPaused) {
      socket.emit('admin:error', { message: 'Timer is already paused' });
      return;
    }
    pauseTimer(io);
  });

  socket.on('admin:resumeTimer', () => {
    const state = getState();
    if (state.phase !== 'LIVE') {
      socket.emit('admin:error', { message: 'Cannot resume: not in LIVE phase' });
      return;
    }
    if (!state.timerPaused) {
      socket.emit('admin:error', { message: 'Timer is not paused' });
      return;
    }
    resumeTimer(io);
  });

  socket.on('admin:markUnsold', () => {
    const state = getState();
    if (state.phase !== 'LIVE' && state.phase !== 'PAUSED') {
      socket.emit('admin:error', { message: 'No active player to mark unsold' });
      return;
    }
    processUnsold(io);
  });

  socket.on('admin:reAuction', ({ playerId, basePrice }) => {
    const state = getState();
    if (state.phase !== 'SETUP') {
      socket.emit('admin:error', { message: 'Can only re-auction in SETUP phase' });
      return;
    }

    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      socket.emit('admin:error', { message: 'Player not found' });
      return;
    }

    // Apply base price override if provided and valid
    if (basePrice !== undefined) {
      const parsed = parseInt(basePrice);
      if (!isNaN(parsed) && parsed > 0) {
        player.basePrice = parsed;
      } else {
        socket.emit('admin:error', { message: 'Base price must be a positive number' });
        return;
      }
    }

    player.status = 'PENDING';
    player.soldTo = null;
    player.soldFor = null;

    // Remove from unsold list
    const idx = state.unsoldPlayers.indexOf(playerId);
    if (idx !== -1) state.unsoldPlayers.splice(idx, 1);

    // Remove from team roster if previously sold
    for (const team of Object.values(state.teams)) {
      const rosterIdx = team.roster.findIndex(r => r.playerId === playerId);
      if (rosterIdx !== -1) {
        team.budget += team.roster[rosterIdx].price;
        team.roster.splice(rosterIdx, 1);
      }
    }

    saveState();
    io.emit('state:full', getPublicState());
  });

  socket.on('admin:acceptBid', () => {
    const state = getState();
    if (state.phase !== 'LIVE') {
      socket.emit('admin:error', { message: 'No active player to close' });
      return;
    }
    clearAuctionTimer();
    if (state.currentBid.teamId) {
      processSold(io);
    } else {
      processUnsold(io);
    }
  });

  socket.on('admin:manualSale', ({ playerId, teamId, saleAmount }) => {
    const state = getState();

    if (state.phase !== 'SETUP' && state.phase !== 'ENDED') {
      socket.emit('admin:error', { message: 'Manual sale is only allowed when no player is actively being auctioned' });
      return;
    }

    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      socket.emit('admin:error', { message: 'Player not found' });
      return;
    }
    if (player.status === 'SOLD') {
      socket.emit('admin:error', { message: `${player.name} is already sold` });
      return;
    }

    const team = state.teams[teamId];
    if (!team) {
      socket.emit('admin:error', { message: 'Team not found' });
      return;
    }

    const amount = parseInt(saleAmount);
    if (isNaN(amount) || amount <= 0) {
      socket.emit('admin:error', { message: 'Sale amount must be a positive number' });
      return;
    }

    const { squadSize, minBid } = state.leagueConfig;
    const maxAllowed = computeMaxBid(team.budget, team.roster.length, squadSize, minBid);
    if (amount > maxAllowed) {
      const reserve = team.budget - maxAllowed;
      socket.emit('admin:error', {
        message: `${team.name} can only spend up to ${maxAllowed.toLocaleString()} pts (budget: ${team.budget.toLocaleString()}, must keep ${reserve.toLocaleString()} in reserve for remaining squad slots)`,
      });
      return;
    }

    // Perform the sale
    player.status = 'SOLD';
    player.soldTo = teamId;
    player.soldFor = amount;

    team.budget -= amount;
    team.roster.push({
      playerId: player.id,
      playerName: player.name,
      pool: player.pool,
      price: amount,
    });

    // Remove from unsold list if present
    const unsoldIdx = state.unsoldPlayers.indexOf(playerId);
    if (unsoldIdx !== -1) state.unsoldPlayers.splice(unsoldIdx, 1);

    state.lastSoldPlayerId = player.id;
    saveState();

    io.emit('auction:sold', {
      player: { ...player },
      teamId,
      amount,
      teamName: team.name,
      publicState: getPublicState(),
    });
  });

  socket.on('admin:updateSettings', ({ timerSeconds, bidIncrement, timerBumpSeconds, endMode, dashboardPin, requireBidConfirm }) => {
    const state = getState();

    if (timerSeconds !== undefined && parseInt(timerSeconds) > 0) {
      state.settings.timerSeconds = parseInt(timerSeconds);
    }
    if (bidIncrement !== undefined && parseInt(bidIncrement) > 0) {
      state.settings.bidIncrement = parseInt(bidIncrement);
    }
    if (timerBumpSeconds !== undefined && parseInt(timerBumpSeconds) >= 0) {
      state.settings.timerBumpSeconds = parseInt(timerBumpSeconds);
    }
    if (endMode === 'timer' || endMode === 'manual') {
      state.settings.endMode = endMode;
    }
    if (dashboardPin !== undefined) {
      state.settings.dashboardPin = String(dashboardPin).trim();
    }
    if (requireBidConfirm !== undefined) {
      state.settings.requireBidConfirm = Boolean(requireBidConfirm);
    }

    saveState();
    io.emit('auction:settingsChanged', getPublicState());
  });
}

module.exports = registerAdminHandlers;
