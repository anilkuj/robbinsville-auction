const { getState } = require('./state');
const { saveState } = require('./persistence');
const { generateCommentary } = require('./utils/commentaryGenerator');

let auctionTimer = null;

function addCommentary(io, type, data) {
  const state = getState();
  const entry = generateCommentary(type, data);
  state.commentary = [entry, ...(state.commentary || [])].slice(0, 50);
  io.emit('commentary:new', { entry, history: state.commentary });
}

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
  const keys = Object.keys(player.extra);
  const typeKey = keys.find(k => {
    const lowKey = k.trim().toLowerCase();
    return lowKey === 'type' || lowKey === 'player_type';
  });
  if (!typeKey) return false;
  return String(player.extra[typeKey]).trim().toLowerCase() === 'owner';
}

// Average soldFor of non-owner SOLD players in the same "tens" rank bracket.
// Bracket for rank 38 is 31-40 (sortOrder 30-39).
function getBracketAverage(players, targetSortOrder) {
  const bracketStart = Math.floor(targetSortOrder / 10) * 10;
  const bracketEnd = bracketStart + 9;
  
  const sold = players.filter(p =>
    p.sortOrder >= bracketStart && 
    p.sortOrder <= bracketEnd && 
    p.status === 'SOLD' && 
    !isOwner(p)
  );
  
  if (sold.length === 0) return 0;
  return Math.round(sold.reduce((s, p) => s + p.soldFor, 0) / sold.length);
}

// Recalculate average and push it to owner players.
// Note: We now update ALL owners universally because brackets can span multiple pools.
function syncOwnerAverages(state) {
  const owners = state.players.filter(p => isOwner(p));
  if (owners.length === 0) return;

  for (const owner of owners) {
    const avg = getBracketAverage(state.players, owner.sortOrder);
    
    if (avg === 0) {
      if (owner.status === 'SOLD') {
        if (owner.soldTo && state.teams[owner.soldTo]) {
          const team = state.teams[owner.soldTo];
          const idx = team.roster.findIndex(r => r.playerId === owner.id);
          if (idx !== -1) {
            team.budget += team.roster[idx].price;
            team.roster.splice(idx, 1);
          }
        }
        owner.status = 'PENDING';
        owner.soldTo = null;
        owner.soldFor = null;
      }
      continue;
    }

    owner.soldFor = avg;

    // Team resolution priority:
    // 1. League Setup ownerPlayerIds (admin explicitly linked this player to a team)
    // 2. CSV extra.team column (case-insensitive key + value match)
    let team = Object.values(state.teams).find(t => t.ownerPlayerIds && t.ownerPlayerIds.includes(owner.id));

    if (!team) {
      const teamKey = Object.keys(owner.extra || {}).find(k => {
        const kl = String(k).trim().toLowerCase();
        return kl.startsWith('team') || kl === 'soldto';
      });
      if (teamKey) {
        const teamName = String(owner.extra[teamKey]).replace(/\s+/g, ' ').trim().toLowerCase();
        team = Object.values(state.teams).find(t => t.name.replace(/\s+/g, ' ').trim().toLowerCase() === teamName);
      }
    }

    if (team) {
      owner.status = 'SOLD';
      owner.soldTo = team.id;
      
      const entryIdx = team.roster.findIndex(r => r.playerId === owner.id);
      if (entryIdx === -1) {
        // Missing from roster — add it
        team.budget -= avg;
        team.roster.push({
          playerId: owner.id,
          playerName: owner.name,
          pool: owner.pool,
          price: avg,
          isOwner: true,
          saleIndex: owner.saleIndex || 0,
          soldAt: owner.soldAt || Date.now(),
          ...(owner.extra && { extra: owner.extra }),
        });
      } else {
        // Already in roster — update price
        const entry = team.roster[entryIdx];
        const diff = avg - entry.price;
        team.budget -= diff;
        entry.price = avg;
      }
    }
  }
}

// Ensure the count in leagueConfig.pools matches the actual number of players in each pool.
function syncPoolCounts(state) {
  const counts = {};
  for (const p of state.players) {
    counts[p.pool] = (counts[p.pool] || 0) + 1;
  }

  if (state.leagueConfig && state.leagueConfig.pools) {
    for (const pool of state.leagueConfig.pools) {
      pool.count = counts[pool.id] || 0;
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
      isOnline: team.isOnline || false,
      ownerIsPlayer: team.ownerIsPlayer || false,
      ownerPlayerIds: team.ownerPlayerIds || (team.ownerPlayerId ? [team.ownerPlayerId] : []),
      ownerName: team.ownerName || null,
      color: team.color || null,
      logo: team.logo || null,
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

  const spillovers = state.leagueConfig?.spilloverPlayerIds || [];

  // Find all pending eligible players (PENDING, not owner, not spillover)
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.status === 'PENDING' && !isOwner(p) && !spillovers.includes(p.id)) {
      pending.push(i);
    }
  }

  if (pending.length === 0) return -1;

  // Determine the bracket of the VERY FIRST pending player in the entire list
  // regardless of fromIndex, so we finish brackets in order.
  // Bracket is defined by tens: 0-9, 10-19, etc.
  let firstPending = null;
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.status === 'PENDING' && !isOwner(p) && !spillovers.includes(p.id)) {
      firstPending = p;
      break;
    }
  }

  // If randomize is off, just take the first pending from fromIndex (standard flow)
  if (!randomize) {
    // We still want to respect the standard sequence from fromIndex if possible
    const fromIndexPending = pending.find(idx => idx >= fromIndex);
    return fromIndexPending !== undefined ? fromIndexPending : pending[0];
  }

  // If randomize is on, gather ALL pending players from the currently active bracket of 10
  const bracketSize = 10;
  const currentBracket = Math.floor(firstPending.sortOrder / bracketSize);
  const bracketMin = currentBracket * bracketSize;
  const bracketMax = bracketMin + (bracketSize - 1);

  const inBracket = [];
  for (const idx of pending) {
    const p = state.players[idx];
    if (p.sortOrder >= bracketMin && p.sortOrder <= bracketMax) {
      inBracket.push(idx);
    }
  }

  if (inBracket.length > 0) {
    return inBracket[Math.floor(Math.random() * inBracket.length)];
  }

  // Fallback to first available if bracket logic somehow finds nothing
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
    syncOwnerAverages(state);

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
      syncOwnerAverages(state);

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
  addCommentary(io, 'playerUp', { ...player, playerName: player.name });
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
    // Track sale order
  const soldPlayers = state.players.filter(p => p.status === 'SOLD');
  player.saleIndex = soldPlayers.length; // Already includes current
  player.soldAt = Date.now();

  team.roster.push({
    playerId: player.id,
    playerName: player.name,
    pool: player.pool,
    price: amount,
    saleIndex: player.saleIndex,
    soldAt: player.soldAt,
    ...(player.extra && { extra: player.extra }),
  });
  }

  // Recalculate owner averages
  syncOwnerAverages(state);

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
  addCommentary(io, 'sold', soldEvent);
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
  addCommentary(io, 'unsold', unsoldEvent);
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
  if (state.phase !== 'LIVE') return false;

  const isManualAwaiting = state.settings.endMode === 'manual' && !state.timerEndsAt && !state.timerPaused;
  if (!state.timerPaused && !isManualAwaiting) return false;

  const remaining = state.timerRemainingOnPause || state.settings.timerSeconds * 1000;
  state.timerPaused = false;
  state.timerRemainingOnPause = 0;
  state.timerEndsAt = Date.now() + remaining;

  saveState();
  io.emit('auction:resumed', getPublicState());
  scheduleTimer(io, remaining);
  return true;
}

// --- Full Simulation Logic ----------------------------------------------------

function runFullSimulation(state) {
  const SQUAD_SIZE = state.leagueConfig.squadSize || 18;
  const MIN_BID = state.leagueConfig.minBid || 1000;
  const SPILLOVER_IDS = state.leagueConfig.spilloverPlayerIds || [];

  const normalize = (str) => str.replace(/\s+/g, ' ').trim().toLowerCase();

  // 1. Reset State
  state.phase = 'ENDED';
  state.currentPlayerIndex = null;
  state.lastSoldPlayerId = null;
  state.unsoldPlayers = [];
  state.commentary = [{
    id: Date.now().toString(),
    type: 'system',
    text: '🔄 Full auction simulation executed by admin.',
    timestamp: Date.now()
  }];
  
  const teamIds = Object.keys(state.teams);
  teamIds.forEach(tid => {
    state.teams[tid].budget = state.leagueConfig.startingBudget || 50000;
    state.teams[tid].roster = [];
  });

  // Ensure ALL players are reset for a fresh simulation
  state.players.forEach(p => {
    p.status = 'PENDING';
    p.soldTo = null;
    p.soldFor = null;
  });

  // 2. Correct sortOrder based on UI logic (Pool + Average Points desc)
  const poolOrder = state.leagueConfig.pools.map(p => p.id);
  state.players.sort((a, b) => {
    const ai = poolOrder.indexOf(a.pool);
    const bi = poolOrder.indexOf(b.pool);
    if (ai !== bi) return ai - bi;
    const ap = parseInt(a.extra?.average_points || '0', 10);
    const bp = parseInt(b.extra?.average_points || '0', 10);
    if (ap !== bp) return bp - ap;
    return a.name.localeCompare(b.name);
  });
  state.players.forEach((p, i) => { p.sortOrder = i; });

  // 3. Pre-assign Owners
  let saleCounter = 0;
  for (const p of state.players) {
    if (isOwner(p)) {
      const teamKey = Object.keys(p.extra || {}).find(k => k.toLowerCase().startsWith('team') || k === 'soldto');
      if (teamKey) {
        const teamName = normalize(p.extra[teamKey]);
        const team = Object.values(state.teams).find(t => normalize(t.name) === teamName);
        if (team) {
          saleCounter++;
          p.status = 'SOLD';
          p.soldTo = team.id;
          p.saleIndex = saleCounter;
          p.soldAt = Date.now();
          
          // Pushing to roster immediately ensures they occupy a slot during regular player assignments
          team.roster.push({
            playerId: p.id,
            playerName: p.name,
            pool: p.pool,
            price: 0,
            saleIndex: p.saleIndex,
            soldAt: p.soldAt,
            isOwner: true,
            ...(p.extra && { extra: p.extra }),
          });
        }
      }
    } else {
      p.status = 'PENDING';
      p.soldFor = 0;
      p.soldTo = null;
      p.saleIndex = null;
      p.soldAt = null;
    }
  }

  // 4. Main Simulation Loop
  const squadLimitMap = {}; // Current counts
  teamIds.forEach(id => squadLimitMap[id] = 0);

  for (const p of state.players) {
    if (isOwner(p)) {
      // Owners already handled in step 3, but sync averages
      continue;
    }

    if (SPILLOVER_IDS.includes(p.id)) {
      const eligibleTeams = teamIds.filter(tid => state.teams[tid].roster.length < SQUAD_SIZE);
      const tid = (eligibleTeams.length > 0) ? eligibleTeams[0] : teamIds[0];
      const team = state.teams[tid];
      saleCounter++;
      p.status = 'SOLD';
      p.soldTo = tid;
      p.soldFor = 0;
      p.saleIndex = saleCounter;
      p.soldAt = Date.now();
      team.roster.push({ 
        playerId: p.id, 
        playerName: p.name, 
        pool: p.pool, 
        price: 0, 
        saleIndex: p.saleIndex, 
        soldAt: p.soldAt 
      });
    } else {
      let price;
      if (p.sortOrder < 20) {
        price = p.basePrice + 2000 + Math.floor(Math.random() * 20) * 100;
      } else if (p.sortOrder < 40) {
        price = p.basePrice + 1000 + Math.floor(Math.random() * 10) * 100;
      } else {
        price = p.basePrice + Math.floor(Math.random() * 5) * 100;
      }

      let eligibleTeams = teamIds.filter(tid => {
        const team = state.teams[tid];
        const remainingSlots = SQUAD_SIZE - team.roster.length;
        if (remainingSlots <= 0) return false;
        const mustKeep = (remainingSlots - 1) * MIN_BID;
        return team.budget - price >= mustKeep;
      });

      if (eligibleTeams.length === 0) {
        price = p.basePrice;
        eligibleTeams = teamIds.filter(tid => {
          const team = state.teams[tid];
          const remainingSlots = SQUAD_SIZE - team.roster.length;
          if (remainingSlots <= 0) return false;
          const mustKeep = (remainingSlots - 1) * MIN_BID;
          return team.budget - price >= mustKeep;
        });
      }

      if (eligibleTeams.length > 0) {
        eligibleTeams.sort((a,b) => state.teams[b].budget - state.teams[a].budget);
        const tid = eligibleTeams[0];
        const team = state.teams[tid];
        saleCounter++;
        p.status = 'SOLD';
        p.soldTo = tid;
        p.soldFor = price;
        p.saleIndex = saleCounter;
        p.soldAt = Date.now();
        team.budget -= price;
        team.roster.push({ 
          playerId: p.id, 
          playerName: p.name, 
          pool: p.pool, 
          price: price, 
          saleIndex: p.saleIndex, 
          soldAt: p.soldAt 
        });
      } else {
        // Force sell to team with room first, then by most budget
        const tid = teamIds.sort((a, b) => {
          const teamA = state.teams[a];
          const teamB = state.teams[b];
          const roomA = teamA.roster.length < SQUAD_SIZE;
          const roomB = teamB.roster.length < SQUAD_SIZE;
          
          if (roomA !== roomB) return roomB ? 1 : -1; // Room first
          return teamB.budget - teamA.budget; // Then budget
        })[0];
        const team = state.teams[tid];
        saleCounter++;
        p.status = 'SOLD';
        p.soldTo = tid;
        p.soldFor = price;
        p.saleIndex = saleCounter;
        p.soldAt = Date.now();
        team.budget -= price;
        team.roster.push({ 
          playerId: p.id, 
          playerName: p.name, 
          pool: p.pool, 
          price: price, 
          saleIndex: p.saleIndex, 
          soldAt: p.soldAt 
        });
      }
    }
  }
  // 5. Final pass for owner averages
  syncOwnerAverages(state);
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
  syncPoolCounts,
  addCommentary,
  runFullSimulation,
};
