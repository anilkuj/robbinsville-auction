const { getState } = require('../state');
const { saveState } = require('../persistence');
const config = require('../config');
const {
  getPublicState,
  startPlayer,
  pauseTimer,
  resumeTimer,
  processSold,
  processUnsold,
  clearAuctionTimer,
  computeMaxBid,
  isOwner,
  syncOwnerAverages,
  addCommentary,
  runFullSimulation,
} = require('../auction');
const { z } = require('zod');

// Zod Schemas
const reAuctionSchema = z.object({
  playerId: z.string().min(1),
  basePrice: z.union([z.string(), z.number()]).optional(),
});

const manualSaleSchema = z.object({
  playerId: z.string().min(1),
  teamId: z.string().min(1),
  saleAmount: z.union([z.string(), z.number()]),
});

const editSalePriceSchema = z.object({
  playerId: z.string().min(1),
  newAmount: z.union([z.string(), z.number()]),
});

const settingsSchema = z.object({
  timerSeconds: z.union([z.string(), z.number()]).optional(),
  bidIncrement: z.union([z.string(), z.number()]).optional(),
  timerBumpSeconds: z.union([z.string(), z.number()]).optional(),
  endMode: z.enum(['timer', 'manual']).optional(),
  dashboardPin: z.string().optional(),
  requireBidConfirm: z.boolean().optional(),
  randomizePool: z.boolean().optional(),
  spectatorEnabled: z.boolean().optional(),
});

function registerAdminHandlers(io, socket) {
  socket.on('admin:nextPlayer', () => {
    const state = getState();
    if (state.phase !== 'SETUP') {
      socket.emit('admin:error', { message: 'Can only advance player in SETUP phase' });
      return;
    }
    const teamsWithMissingOwner = Object.values(state.teams).filter(t => t.ownerIsPlayer && (!t.ownerPlayerIds || t.ownerPlayerIds.length === 0));
    if (teamsWithMissingOwner.length > 0) {
      const names = teamsWithMissingOwner.map(t => t.name || t.id).join(', ');
      socket.emit('admin:error', { message: `Owner player not selected for: ${names}` });
      return;
    }

    const activePools = state.leagueConfig?.pools || [];
    const zeroPricePools = activePools.filter(p => p.count > 0 && (!p.basePrice || p.basePrice <= 0));
    if (zeroPricePools.length > 0) {
      const names = zeroPricePools.map(p => p.label || p.id).join(', ');
      socket.emit('admin:error', { message: `Cannot start auction! Base price is 0 for pools: ${names}. Please set a base price in League Setup.` });
      return;
    }

    const totalPlayers = state.players?.length || 0;
    const required = (state.leagueConfig?.numTeams || 0) * (state.leagueConfig?.squadSize || 0);
    const overflow = Math.max(0, totalPlayers - required);
    const spillovers = state.leagueConfig?.spilloverPlayerIds || [];

    if (spillovers.length !== overflow) {
      socket.emit('admin:error', { message: `Cannot start auction! You have ${totalPlayers} players for ${required} spots. Configure exactly ${overflow} spillover players in Setting.` });
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
    const isManualAwaiting = state.settings.endMode === 'manual' && !state.timerEndsAt && !state.timerPaused;

    if (!state.timerPaused && !isManualAwaiting) {
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

  socket.on('admin:reAuction', (payload) => {
    const parsed = reAuctionSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('admin:error', { message: 'Invalid payload for reAuction' });
      return;
    }
    const { playerId, basePrice } = parsed.data;

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

    const prevPool = player.pool;
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
        if (!isOwner(player)) team.budget += team.roster[rosterIdx].price;
        team.roster.splice(rosterIdx, 1);
      }
    }

    // Recalculate owner averages (pool avg changed now that player is PENDING)
    syncOwnerAverages(state);

    saveState();

    // Instead of just returning them to pending, instantly put them on the block
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    startPlayer(io, playerIndex);
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

  socket.on('admin:cancelLastBid', () => {
    const state = getState();
    if (state.phase !== 'LIVE') {
      socket.emit('admin:error', { message: 'Can only cancel bids during a LIVE auction' });
      return;
    }

    if (!state.currentBid.history || state.currentBid.history.length === 0) {
      socket.emit('admin:error', { message: 'No bids to cancel' });
      return;
    }

    const player = state.players[state.currentPlayerIndex];

    // Pop the latest bid
    state.currentBid.history.pop();

    if (state.currentBid.history.length === 0) {
      // It was the only bid. Revert to no bids and pause.
      state.currentBid.amount = player ? player.basePrice : 0;
      state.currentBid.teamId = null;

      // Force pause mode
      state.timerPaused = true;
      state.timerRemainingOnPause = state.settings.timerSeconds * 1000;
      state.timerEndsAt = null;
      clearAuctionTimer();

      saveState();
      io.emit('auction:paused', getPublicState());
      io.emit('state:full', getPublicState());
    } else {
      // Revert to the previous highest bid
      const prevBid = state.currentBid.history[state.currentBid.history.length - 1];
      state.currentBid.amount = prevBid.amount;
      state.currentBid.teamId = prevBid.teamId;

      // Bump the timer so people have time to react to the rollback
      if (!state.timerPaused && state.settings.endMode !== 'manual') {
        const remaining = state.settings.timerSeconds * 1000;
        state.timerEndsAt = Date.now() + remaining;
        scheduleTimer(io, remaining);
      }

      saveState();
      io.emit('state:full', getPublicState());
    }
  });

  socket.on('admin:manualSale', (payload) => {
    const parsed = manualSaleSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('admin:error', { message: 'Invalid payload for manualSale' });
      return;
    }
    const { playerId, teamId, saleAmount } = parsed.data;

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
    if (isNaN(amount) || amount < 0) {
      socket.emit('admin:error', { message: 'Sale amount must be a non-negative number' });
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
      ...(player.extra && { extra: player.extra }),
    });

    // Remove from unsold list if present
    const unsoldIdx = state.unsoldPlayers.indexOf(playerId);
    if (unsoldIdx !== -1) state.unsoldPlayers.splice(unsoldIdx, 1);

    // Recalculate owner averages
    syncOwnerAverages(state);

    state.lastSoldPlayerId = player.id;
    saveState();

    addCommentary(io, 'manualSale', { playerName: player.name, teamName: team.name, saleAmount: amount });
    io.emit('auction:sold', {
      player: { ...player },
      teamId,
      amount,
      teamName: team.name,
      publicState: getPublicState(),
    });
  });

  socket.on('admin:editSalePrice', (payload) => {
    const parsed = editSalePriceSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('admin:error', { message: 'Invalid payload for editSalePrice' });
      return;
    }
    const { playerId, newAmount } = parsed.data;

    const state = getState();

    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      socket.emit('admin:error', { message: 'Player not found' });
      return;
    }
    if (player.status !== 'SOLD') {
      socket.emit('admin:error', { message: 'Player is not sold' });
      return;
    }
    if (isOwner(player)) {
      socket.emit('admin:error', { message: 'Cannot manually edit owner sale price (it is calculated automatically)' });
      return;
    }

    const amount = parseInt(newAmount);
    if (isNaN(amount) || amount < 0) {
      socket.emit('admin:error', { message: 'Amount must be a non-negative number' });
      return;
    }

    const team = player.soldTo ? state.teams[player.soldTo] : null;
    const oldAmount = player.soldFor || 0;

    // Adjust team budget: refund old, deduct new
    if (team) {
      team.budget += oldAmount;
      team.budget -= amount;
    }

    player.soldFor = amount;

    // Update roster entry price
    if (team) {
      const entry = team.roster.find(r => r.playerId === playerId);
      if (entry) entry.price = amount;
    }

    // Recalculate owner averages
    syncOwnerAverages(state);

    saveState();
    io.emit('state:full', getPublicState());
  });

  socket.on('admin:updateSettings', (payload) => {
    const parsed = settingsSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('admin:error', { message: 'Invalid settings payload' });
      return;
    }
    const { timerSeconds, bidIncrement, timerBumpSeconds, endMode, dashboardPin, requireBidConfirm, randomizePool, spectatorEnabled } = parsed.data;

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
    if (randomizePool !== undefined) {
      state.settings.randomizePool = Boolean(randomizePool);
    }
    if (spectatorEnabled !== undefined) {
      state.settings.spectatorEnabled = Boolean(spectatorEnabled);
    }

    saveState();
    io.emit('auction:settingsChanged', getPublicState());
  });

  socket.on('admin:kickTeam', (payload) => {
    const { teamId } = payload;
    if (!teamId) return;

    // Find all sockets for this team and disconnect them
    for (const [_, s] of io.sockets.sockets) {
      if (s.user && s.user.role === 'team' && s.user.id === teamId) {
        s.emit('auction:kicked', { message: 'You have been disconnected by the Admin.' });
        s.disconnect(true);
      }
    }
  });
  
  socket.on('admin:runFullSimulation', ({ password } = {}) => {
    if (!password || password !== config.admin.password) {
      socket.emit('admin:error', { error: 'Invalid admin password for simulation' });
      return;
    }
    const state = getState();
    runFullSimulation(state);
    saveState();
    io.emit('state:full', getPublicState());
  });
}

module.exports = registerAdminHandlers;
