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

  socket.on('admin:reAuction', ({ playerId }) => {
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

  socket.on('admin:updateSettings', ({ timerSeconds, bidIncrement, timerBumpSeconds, endMode, dashboardPin }) => {
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

    saveState();
    io.emit('auction:settingsChanged', getPublicState());
  });
}

module.exports = registerAdminHandlers;
