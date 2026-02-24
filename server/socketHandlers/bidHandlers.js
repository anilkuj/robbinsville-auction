const { getState } = require('../state');
const { saveState } = require('../persistence');
const { getPublicState, computeMaxBid, scheduleTimer } = require('../auction');
const { z } = require('zod');

const bidSchema = z.object({
  playerId: z.string().min(1),
  amount: z.number().positive(),
});

function registerBidHandlers(io, socket) {
  socket.on('bid:place', (payload) => {
    // 0. Payload validation
    const parsed = bidSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('bid:rejected', { reason: 'Invalid bid payload' });
      return;
    }
    const { playerId, amount } = parsed.data;

    const state = getState();
    const user = socket.user;

    // 1. Role check
    if (user.role !== 'team') {
      socket.emit('bid:rejected', { reason: 'Only team owners can bid' });
      return;
    }

    // 2. Phase check
    if (state.phase !== 'LIVE') {
      socket.emit('bid:rejected', { reason: 'Auction is not live' });
      return;
    }

    // 3. Timer not paused
    if (state.timerPaused) {
      socket.emit('bid:rejected', { reason: 'Auction is paused' });
      return;
    }

    // 4. Player match
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      socket.emit('bid:rejected', { reason: 'Player mismatch — player may have changed' });
      return;
    }

    // 5. Timer check (500ms grace for network lag)
    if (state.settings.endMode === 'manual') {
      // In manual mode, bids are blocked once timerEndsAt is null (awaiting hammer)
      if (!state.timerEndsAt) {
        socket.emit('bid:rejected', { reason: 'Bidding closed — awaiting auctioneer' });
        return;
      }
    } else {
      if (state.timerEndsAt && Date.now() > state.timerEndsAt + 500) {
        socket.emit('bid:rejected', { reason: 'Timer has expired' });
        return;
      }
    }

    // 6. Team lookup
    const team = state.teams[user.teamId];
    if (!team) {
      socket.emit('bid:rejected', { reason: 'Team not found' });
      return;
    }

    // 7. Roster size check
    const { squadSize, minBid } = state.leagueConfig;
    if (team.roster.length >= squadSize) {
      socket.emit('bid:rejected', { reason: 'Your squad is already full' });
      return;
    }

    // 8. Amount validation — must be >= minimum next bid and <= maxBid
    const { bidIncrement } = state.settings;
    const minNextBid = state.currentBid.teamId === null
      ? currentPlayer.basePrice
      : state.currentBid.amount + bidIncrement;

    const bidAmount = amount;
    if (isNaN(bidAmount) || bidAmount < minNextBid) {
      socket.emit('bid:rejected', { reason: `Minimum bid is ${minNextBid.toLocaleString()} pts` });
      return;
    }

    // 9. No self-outbid
    if (state.currentBid.teamId === user.teamId) {
      socket.emit('bid:rejected', { reason: 'You are already the highest bidder' });
      return;
    }

    // 10. Budget constraint
    const maxBid = computeMaxBid(team.budget, team.roster.length, squadSize, minBid);
    if (bidAmount > maxBid) {
      socket.emit('bid:rejected', {
        reason: `Exceeds your maximum allowable bid of ${maxBid.toLocaleString()} pts`,
      });
      return;
    }

    // ✓ Valid bid — update state
    const bidEntry = {
      amount: bidAmount,
      teamId: user.teamId,
      teamName: team.name,
      timestamp: Date.now(),
    };

    state.currentBid.history.push(bidEntry);
    state.currentBid.amount = bidAmount;
    state.currentBid.teamId = user.teamId;

    // Bump timer by timerBumpSeconds, capped at a full timerSeconds from now
    const bumpMs = (state.settings.timerBumpSeconds ?? 10) * 1000;
    const maxEndsAt = Date.now() + state.settings.timerSeconds * 1000;
    const newEndsAt = Math.min((state.timerEndsAt || Date.now()) + bumpMs, maxEndsAt);
    state.timerEndsAt = newEndsAt;
    scheduleTimer(io, newEndsAt - Date.now());

    saveState();
    io.emit('auction:bid', { bid: bidEntry, publicState: getPublicState() });
  });
}

module.exports = registerBidHandlers;
