const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const { getState, DEFAULT_POOLS } = require('../state');
const { saveState } = require('../persistence');
const { getPublicState, clearAuctionTimer, syncOwnerAverages } = require('../auction');
const config = require('../config');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function isOwner(player) {
  if (!player.extra) return false;
  const typeKey = Object.keys(player.extra).find(k => k.toLowerCase() === 'type' || k.toLowerCase() === 'player_type');
  return typeKey && String(player.extra[typeKey]).toLowerCase() === 'owner';
}

// Factory: accepts `io` so HTTP routes can broadcast socket events after mutations
function createAdminRouter(io) {
  const router = express.Router();

  router.use((req, res, next) => {
    console.log(`[AdminRouter] ${req.method} ${req.url}`);
    next();
  });

  // Bulk update players (used for inline editing)
  router.post('/save-players', authenticate, requireAdmin, (req, res) => {
    console.log('[AdminRouter] Received save-players request');
    const { updates } = req.body; // Array of { id, ...fields }
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates array is required' });
    }

    const state = getState();
    const affectedPools = new Set();
    const affectedTeams = new Set();

    for (const update of updates) {
      const player = state.players.find(p => p.id === update.id);
      if (!player) continue;

      const oldPool = player.pool;
      const oldSoldFor = player.soldFor;
      const oldStatus = player.status;
      const oldSoldTo = player.soldTo;

      // Update basic fields
      if (update.name !== undefined) player.name = update.name;
      if (update.pool !== undefined) {
        player.pool = update.pool;
        affectedPools.add(oldPool);
        affectedPools.add(player.pool);
      }
      if (update.basePrice !== undefined) player.basePrice = parseInt(update.basePrice) || 0;
      if (update.status !== undefined) player.status = update.status;
      if (update.soldFor !== undefined) player.soldFor = parseInt(update.soldFor) || 0;
      if (update.extra !== undefined) player.extra = { ...player.extra, ...update.extra };

      // Synchronization logic for SOLD players
      if (player.status === 'SOLD' && player.soldTo) {
        const team = state.teams[player.soldTo];
        if (team) {
          affectedTeams.add(player.soldTo);
          // Find roster entry
          const rosterEntry = team.roster.find(r => r.playerId === player.id);
          if (rosterEntry) {
            rosterEntry.playerName = player.name;
            rosterEntry.pool = player.pool;

            // Budget adjustment (only for non-owner players)
            if (!isOwner(player)) {
              const diff = (player.soldFor || 0) - (oldSoldFor || 0);
              team.budget -= diff;
              rosterEntry.price = player.soldFor;
              affectedPools.add(player.pool);
            }
          }
        }
      }

      // If status changed from SOLD to something else, remove from roster and refund budget
      if (oldStatus === 'SOLD' && player.status !== 'SOLD' && oldSoldTo) {
        const team = state.teams[oldSoldTo];
        if (team) {
          const idx = team.roster.findIndex(r => r.playerId === player.id);
          if (idx !== -1) team.roster.splice(idx, 1);
          if (!isOwner(player)) {
            team.budget += (oldSoldFor || 0);
          }
          affectedPools.add(oldPool);
        }
      }
    }

    // Recalculate owner averages for all affected pools
    for (const poolId of affectedPools) {
      syncOwnerAverages(state, poolId);
    }

    saveState();
    io.emit('state:full', getPublicState());
    res.json({ message: 'Players updated successfully', publicState: getPublicState() });
  });

  // Import players from CSV
  router.post('/import-players', authenticate, requireAdmin, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const records = parse(req.file.buffer, {
        columns: header => header.map(h => {
          const n = h.trim().toLowerCase().replace(/\s/g, '');
          if (n === 'baseprice' || n === 'price') return 'basePrice';
          return n;
        }),
        skip_empty_lines: true,
        trim: true,
        bom: true
      });

      if (records.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty' });
      }

      const state = getState();

      // Step 1: Detect unique pools and their counts from CSV
      const detectedPoolsMap = {};
      const playersData = [];

      for (const row of records) {
        if (!row.name || !row.name.trim()) {
          return res.status(400).json({ error: 'Each row must have a "name" column' });
        }

        const poolId = (row.pool || 'UNASSIGNED').trim().toUpperCase();
        const basePrice = parseInt(row.basePrice) || 0;

        if (!detectedPoolsMap[poolId]) {
          detectedPoolsMap[poolId] = {
            id: poolId,
            label: poolId,
            basePrice: basePrice, // Use the first basePrice encountered for this pool if valid
            count: 0
          };
        }
        detectedPoolsMap[poolId].count++;
        playersData.push({
          name: row.name.trim(),
          pool: poolId,
          basePrice: basePrice,
          row: row
        });
      }

      const newPools = Object.values(detectedPoolsMap);
      const totalPlayers = playersData.length;
      const { numTeams, squadSize } = state.leagueConfig;
      const expectedTotal = numTeams * squadSize;

      if (totalPlayers !== expectedTotal) {
        return res.status(400).json({
          error: `CSV has ${totalPlayers} players, expected ${expectedTotal} (${numTeams} teams × ${squadSize} players). Please update League Setup first if you want to change the total count.`,
        });
      }

      // Step 2: Override leagueConfig.pools
      state.leagueConfig.pools = newPools;

      // Step 3: Build players array
      const poolOrder = newPools.map(p => p.id);
      const KNOWN_COLS = new Set(['name', 'pool', 'baseprice']);

      const players = playersData.map((pData, idx) => {
        const extra = {};
        for (const [key, val] of Object.entries(pData.row)) {
          if (!KNOWN_COLS.has(key.toLowerCase()) && val?.trim()) {
            extra[key] = val.trim();
          }
        }
        return {
          id: uuidv4(),
          name: pData.name,
          pool: pData.pool,
          basePrice: pData.basePrice,
          status: 'PENDING',
          soldTo: null,
          soldFor: null,
          sortOrder: idx,
          ...(Object.keys(extra).length > 0 && { extra }),
        };
      });

      // Sort by pool order then name
      players.sort((a, b) => {
        const ai = poolOrder.indexOf(a.pool);
        const bi = poolOrder.indexOf(b.pool);
        if (ai !== bi) return ai - bi;
        return a.name.localeCompare(b.name);
      });
      players.forEach((p, i) => { p.sortOrder = i; });

      state.players = players;
      state.phase = 'SETUP';
      state.currentPlayerIndex = null;
      state.currentBid = { amount: 0, teamId: null, history: [] };
      state.timerEndsAt = null;
      state.timerPaused = false;
      state.timerRemainingOnPause = 0;
      state.unsoldPlayers = [];

      clearAuctionTimer();
      saveState();
      io.emit('state:full', getPublicState());
      res.json({
        message: `${players.length} players imported successfully. ${newPools.length} pools were updated from the file.`,
        count: players.length,
        pools: newPools
      });
    } catch (err) {
      console.error('CSV import error:', err);
      res.status(500).json({ error: 'Failed to parse CSV: ' + err.message });
    }
  });

  // Export auction results as CSV
  router.get('/export-results', authenticate, requireAdmin, (req, res) => {
    const state = getState();
    const rows = ['Player Name,Pool,Base Price,Status,Sold To,Price'];

    for (const player of state.players) {
      const team = player.soldTo ? state.teams[player.soldTo] : null;
      rows.push([
        `"${player.name}"`,
        player.pool,
        player.basePrice,
        player.status,
        team ? `"${team.name}"` : '',
        player.soldFor || '',
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="auction-results.csv"');
    res.send(rows.join('\n'));
  });

  // Export full state as JSON backup
  router.get('/export-state', authenticate, requireAdmin, (req, res) => {
    const state = getState();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="auction-state.json"');
    res.json(state);
  });

  // Download blank CSV template based on current pool config
  router.get('/csv-template', authenticate, requireAdmin, (req, res) => {
    const state = getState();
    const { pools } = state.leagueConfig;
    const rows = ['name,pool'];

    for (const pool of pools) {
      for (let i = 0; i < pool.count; i++) {
        rows.push(`,${pool.id}`);
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="players-template.csv"');
    res.send(rows.join('\n'));
  });

  // Save league config (teams + pools + global settings)
  router.post('/league-config', authenticate, requireAdmin, (req, res) => {
    const state = getState();

    if (state.phase !== 'SETUP') {
      return res.status(400).json({ error: 'League config can only be modified in SETUP phase' });
    }

    const { leagueConfig, teams, poolTransfers } = req.body;
    if (!leagueConfig || !teams) {
      return res.status(400).json({ error: 'leagueConfig and teams are required' });
    }

    const auctionStarted = state.players && state.players.some(p => p.status !== 'PENDING');

    if (auctionStarted) {
      if (poolTransfers && poolTransfers.length > 0) {
        return res.status(400).json({ error: 'Pool transfers are not allowed after the auction has started.' });
      }

      const oldPools = state.leagueConfig.pools || [];
      const newPools = leagueConfig.pools || [];

      let poolChanged = oldPools.length !== newPools.length;
      if (!poolChanged) {
        const oldPoolMap = {};
        oldPools.forEach(p => { oldPoolMap[p.id] = p; });

        for (const p of newPools) {
          const oldP = oldPoolMap[p.oldId || p.id];
          if (!oldP || oldP.count !== parseInt(p.count)) {
            poolChanged = true;
            break;
          }
        }
      }

      if (poolChanged) {
        return res.status(400).json({ error: 'Pool counts and IDs cannot be changed after the auction has started.' });
      }

      // Check for global settings changes
      const oldConfig = state.leagueConfig;
      if (
        parseInt(oldConfig.numTeams) !== parseInt(leagueConfig.numTeams) ||
        parseInt(oldConfig.squadSize) !== parseInt(leagueConfig.squadSize) ||
        parseInt(oldConfig.startingBudget) !== parseInt(leagueConfig.startingBudget) ||
        parseInt(oldConfig.minBid) !== parseInt(leagueConfig.minBid)
      ) {
        return res.status(400).json({ error: 'Global settings cannot be changed after the auction has started.' });
      }

      // Check for team structural/identity changes
      const newTeamKeys = Object.keys(teams);
      const oldTeamKeys = Object.keys(state.teams);
      if (newTeamKeys.length !== oldTeamKeys.length) {
        return res.status(400).json({ error: 'Team counts cannot be changed after the auction has started.' });
      }
      for (const id of newTeamKeys) {
        if (!state.teams[id]) {
          return res.status(400).json({ error: 'New teams cannot be added after the auction has started.' });
        }
      }
    }

    const { pools, numTeams, squadSize } = leagueConfig;
    const totalPlayers = pools.reduce((sum, p) => sum + (parseInt(p.count) || 0), 0);
    const required = parseInt(numTeams) * parseInt(squadSize);

    if (totalPlayers !== required) {
      return res.status(400).json({
        error: `Pool total (${totalPlayers}) must equal numTeams × squadSize (${numTeams} × ${squadSize} = ${required})`,
      });
    }

    const teamEntries = Object.entries(teams);
    if (teamEntries.length !== parseInt(numTeams)) {
      return res.status(400).json({
        error: `Number of teams defined (${teamEntries.length}) must equal numTeams setting (${numTeams})`,
      });
    }
    // Cache old pools before updating to detect actual price changes
    const oldPoolsMap = {};
    if (state.leagueConfig && state.leagueConfig.pools) {
      for (const p of state.leagueConfig.pools) {
        oldPoolsMap[p.id] = p;
      }
    }

    // Update league config
    state.leagueConfig = {
      numTeams: parseInt(numTeams) || 0,
      squadSize: parseInt(squadSize) || 0,
      startingBudget: parseInt(leagueConfig.startingBudget) || 0,
      minBid: parseInt(leagueConfig.minBid) || 0,
      pools: pools.map(p => {
        const bp = parseInt(p.basePrice);
        const cnt = parseInt(p.count);
        return {
          id: String(p.id),
          label: String(p.label || p.id),
          basePrice: isNaN(bp) ? 0 : bp,
          count: isNaN(cnt) ? 0 : cnt,
        };
      }),
    };

    // Update teams — preserve budgets/rosters for existing teams, init new ones
    const newTeams = {};
    for (const [teamId, teamData] of teamEntries) {
      const existing = state.teams[teamId];
      newTeams[teamId] = {
        id: teamId,
        name: teamData.name,
        password: teamData.password || existing?.password || 'team123',
        budget: (existing?.roster?.length > 0) ? existing.budget : parseInt(leagueConfig.startingBudget),
        roster: existing?.roster || [],
        ownerIsPlayer: teamData.ownerIsPlayer || false,
        ownerPlayerId: teamData.ownerPlayerId || null,
        ownerName: teamData.ownerName || null,
      };
    }
    state.teams = newTeams;

    // Process pool transfers (MERGE and SPLIT) before pool renames
    if (poolTransfers && Array.isArray(poolTransfers) && state.players) {
      for (const transfer of poolTransfers) {
        if (transfer.type === 'MERGE') {
          // Move all PENDING players from source to target
          for (const player of state.players) {
            if (player.pool === transfer.sourcePoolId && player.status === 'PENDING') {
              player.pool = transfer.targetPoolId;
            }
          }
        } else if (transfer.type === 'SPLIT') {
          // Move `count` PENDING players from source to target
          let movedCount = 0;
          for (const player of state.players) {
            if (player.pool === transfer.sourcePoolId && player.status === 'PENDING' && movedCount < transfer.count) {
              player.pool = transfer.targetPoolId;
              movedCount++;
            }
          }
        }
      }
    }

    // Cascade pool ID renames and base prices to players
    const poolUpdateMap = {};
    for (const p of pools) {
      if (p.oldId && p.oldId !== p.id) {
        const bp = parseInt(p.basePrice);
        poolUpdateMap[p.oldId] = { id: p.id, basePrice: isNaN(bp) ? 0 : bp };
      }
    }

    // Only cascade base prices if the admin actually modified the base price of the pool
    const changedBasePrices = {};
    for (const p of pools) {
      const bp = parseInt(p.basePrice);
      if (isNaN(bp)) continue;

      const oldPool = oldPoolsMap[p.oldId || p.id];
      if (oldPool && parseInt(oldPool.basePrice) !== bp) {
        changedBasePrices[p.id] = bp;
      } else if (!oldPool) {
        // It's a newly added pool
        changedBasePrices[p.id] = bp;
      }
    }

    if (state.players && state.players.length > 0) {
      for (const player of state.players) {
        // If pool was renamed
        if (poolUpdateMap[player.pool]) {
          player.pool = poolUpdateMap[player.pool].id;
          // Sync basePrice if the player hasn't been sold
          if (player.status === 'PENDING') {
            if (changedBasePrices[player.pool] !== undefined) {
              player.basePrice = changedBasePrices[player.pool];
            } else if (poolUpdateMap[player.oldPool || player.pool]?.basePrice) {
              // Fallback to the new base price if the pool was renamed and didn't trigger changedBasePrices
              player.basePrice = poolUpdateMap[player.oldPool || player.pool].basePrice;
            }
          }
        }
        // If pool kept the same name, we only sync if the price was actually modified
        else if (changedBasePrices[player.pool] !== undefined) {
          if (player.status === 'PENDING') {
            player.basePrice = changedBasePrices[player.pool];
          }
        }
      }
    }

    saveState();
    io.emit('state:full', getPublicState());
    res.json({ message: 'League config saved', publicState: getPublicState() });
  });

  // Reset auction (clears player statuses + team budgets/rosters)
  router.post('/reset-auction', authenticate, requireAdmin, (req, res) => {
    const { password, storagePreference } = req.body;
    const state = getState();

    if (!password || password !== config.admin.password) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    if (storagePreference) {
      state.settings = state.settings || {};
      state.settings.storagePreference = storagePreference;
    }

    state.players.forEach(p => {
      p.status = 'PENDING';
      p.soldTo = null;
      p.soldFor = null;
    });

    for (const team of Object.values(state.teams)) {
      team.budget = state.leagueConfig.startingBudget;
      team.roster = [];
    }

    state.phase = 'SETUP';
    state.currentPlayerIndex = null;
    state.currentBid = { amount: 0, teamId: null, history: [] };
    state.timerEndsAt = null;
    state.timerPaused = false;
    state.timerRemainingOnPause = 0;
    state.unsoldPlayers = [];
    state.lastSoldPlayerId = null;

    clearAuctionTimer();
    saveState();
    io.emit('state:full', getPublicState());
    res.json({ message: 'Auction reset successfully', publicState: getPublicState() });
  });

  // Get current team passwords (admin only — not exposed in public state)
  router.get('/team-passwords', authenticate, requireAdmin, (req, res) => {
    const state = getState();
    const teams = {};
    for (const [id, team] of Object.entries(state.teams)) {
      teams[id] = { name: team.name, password: team.password };
    }
    res.json({ teams, dashboardPin: state.settings.dashboardPin });
  });

  // Update team passwords and/or dashboard PIN (works in any phase)
  router.post('/update-passwords', authenticate, requireAdmin, (req, res) => {
    const { teams, dashboardPin } = req.body;
    const state = getState();

    if (teams) {
      for (const [teamId, password] of Object.entries(teams)) {
        if (state.teams[teamId] && typeof password === 'string' && password.trim()) {
          state.teams[teamId].password = password.trim();
        }
      }
    }
    if (dashboardPin !== undefined) {
      state.settings.dashboardPin = String(dashboardPin).trim();
    }

    saveState();
    io.emit('auction:settingsChanged', getPublicState());
    res.json({ message: 'Passwords updated successfully' });
  });

  // Load test data
  router.post('/load-test-data', authenticate, requireAdmin, (req, res) => {
    try {
      const { password, storagePreference } = req.body;

      if (!password || password !== config.admin.password) {
        return res.status(401).json({ error: 'Invalid admin password' });
      }

      const state = getState();

      if (storagePreference) {
        state.settings = state.settings || {};
        state.settings.storagePreference = storagePreference;
      }

      state.phase = 'SETUP';

      const TEST_PLAYERS = {
        A: ['AB de Villiers', 'Babar Azam', 'Ben Stokes', 'Jasprit Bumrah', 'Joe Root', 'MS Dhoni'],
        B: ['Andre Russell', 'David Warner', 'Glenn Maxwell', 'Hardik Pandya', 'Kane Williamson',
          'KL Rahul', 'Mitchell Starc', 'Ravindra Jadeja', 'Rishabh Pant', 'Suryakumar Yadav', 'Trent Boult',
          'Avesh Khan', 'Bhuvneshwar Kumar', 'Deepak Chahar', 'Faf du Plessis', 'Ishan Kishan',
          'Kuldeep Yadav', 'Quinton de Kock', 'Shardul Thakur', 'Shubman Gill', 'Washington Sundar', 'Yuzvendra Chahal',
          'Chris Gayle', 'Lasith Malinga', 'Shane Watson', 'Kieron Pollard', 'Dwayne Bravo'],
      };
      const BASE_PRICES = { A: 3000, B: 1000 };

      // Set league config
      state.leagueConfig = {
        numTeams: 3,
        squadSize: 12,
        startingBudget: 45000,
        minBid: 100,
        pools: [
          { id: 'A', label: 'A', basePrice: 3000, count: 9 }, // 6 regular + 3 owners
          { id: 'B', label: 'B', basePrice: 1000, count: 27 },
        ],
      };

      const owner1Id = uuidv4();
      const owner2Id = uuidv4();
      const owner3Id = uuidv4();

      // Set teams
      state.teams = {
        team_1: { id: 'team_1', name: 'Team Alpha', password: 'alpha123', budget: 45000, roster: [], ownerIsPlayer: true, ownerPlayerId: owner1Id },
        team_2: { id: 'team_2', name: 'Team Beta', password: 'beta123', budget: 45000, roster: [], ownerIsPlayer: true, ownerPlayerId: owner2Id },
        team_3: { id: 'team_3', name: 'Team Gamma', password: 'gamma123', budget: 45000, roster: [], ownerIsPlayer: true, ownerPlayerId: owner3Id },
      };

      // Build players sorted by pool order then name
      const players = [
        { id: owner1Id, name: 'Owner Alpha', pool: 'A', basePrice: 0, status: 'PENDING', soldTo: null, soldFor: null, sortOrder: 0, extra: { type: 'owner', role: 'BAT' } },
        { id: owner2Id, name: 'Owner Beta', pool: 'A', basePrice: 0, status: 'PENDING', soldTo: null, soldFor: null, sortOrder: 0, extra: { type: 'owner', role: 'BOWL' } },
        { id: owner3Id, name: 'Owner Gamma', pool: 'A', basePrice: 0, status: 'PENDING', soldTo: null, soldFor: null, sortOrder: 0, extra: { type: 'owner', role: 'ALL' } },
      ];
      for (const pool of ['A', 'B']) {
        for (const name of TEST_PLAYERS[pool]) {
          players.push({
            id: uuidv4(),
            name,
            pool,
            basePrice: BASE_PRICES[pool],
            status: 'PENDING',
            soldTo: null,
            soldFor: null,
            sortOrder: 0,
          });
        }
      }
      players.sort((a, b) => {
        const poolOrder = ['A', 'B'];
        const pi = poolOrder.indexOf(a.pool) - poolOrder.indexOf(b.pool);
        if (pi !== 0) return pi;
        return a.name.localeCompare(b.name);
      });
      players.forEach((p, i) => { p.sortOrder = i; });

      state.players = players;
      state.currentPlayerIndex = null;
      state.currentBid = { amount: 0, teamId: null, history: [] };
      state.timerEndsAt = null;
      state.timerPaused = false;
      state.timerRemainingOnPause = 0;
      state.unsoldPlayers = [];

      clearAuctionTimer();
      saveState();
      io.emit('state:full', getPublicState());
      res.json({
        message: 'Test data loaded successfully',
        teams: 3,
        players: players.length,
        publicState: getPublicState(),
      });
    } catch (e) {
      console.error('LOAD TEST ERROR:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Rollback last sold player — returns them to PENDING, refunds team budget
  router.post('/rollback-last-sale', authenticate, requireAdmin, (req, res) => {
    const state = getState();

    if (state.phase !== 'SETUP') {
      return res.status(400).json({ error: 'Can only rollback between players (SETUP phase). Mark current player unsold or accept bid first.' });
    }

    if (!state.lastSoldPlayerId) {
      return res.status(400).json({ error: 'No recent sale to rollback' });
    }

    const player = state.players.find(p => p.id === state.lastSoldPlayerId);
    if (!player || player.status !== 'SOLD') {
      return res.status(400).json({ error: 'Last sold player not found or already rolled back' });
    }

    const team = state.teams[player.soldTo];
    const refundAmount = player.soldFor;
    const playerName = player.name;
    const teamName = team?.name || 'Unknown';

    // Return player to pool
    player.status = 'PENDING';
    player.soldTo = null;
    player.soldFor = null;

    // Remove from roster and refund budget
    if (team) {
      const idx = team.roster.findIndex(r => r.playerId === player.id);
      if (idx !== -1) team.roster.splice(idx, 1);
      team.budget += refundAmount;
    }

    // Recalculate owner averages for this pool (one less sold player now)
    syncOwnerAverages(state, player.pool);

    // Update lastSoldPlayerId to the next most recent sold player
    const remainingSold = state.players
      .filter(p => p.status === 'SOLD')
      .sort((a, b) => b.sortOrder - a.sortOrder);
    state.lastSoldPlayerId = remainingSold.length > 0 ? remainingSold[0].id : null;

    saveState();
    io.emit('state:full', getPublicState());

    res.json({ message: `Rolled back: ${playerName} returned to pool, ${refundAmount.toLocaleString()} pts refunded to ${teamName}` });
  });

  // Import full state from a previously exported JSON backup
  router.post('/import-state', authenticate, requireAdmin, (req, res) => {
    const { password, state: s, storagePreference } = req.body;

    if (!password || password !== config.admin.password) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Validate required fields
    const required = ['phase', 'leagueConfig', 'settings', 'players', 'teams', 'currentBid'];
    for (const field of required) {
      if (s[field] === undefined) {
        return res.status(400).json({ error: `Invalid backup file: missing field "${field}"` });
      }
    }

    const state = getState();

    state.phase = s.phase;
    state.leagueConfig = s.leagueConfig;
    // Merge settings so any new fields added since export are preserved with defaults
    state.settings = { ...state.settings, ...s.settings };
    if (storagePreference) {
      state.settings.storagePreference = storagePreference;
    }

    state.players = s.players;
    state.teams = s.teams;
    state.currentPlayerIndex = s.currentPlayerIndex ?? null;
    state.currentBid = s.currentBid || { amount: 0, teamId: null, history: [] };
    state.unsoldPlayers = s.unsoldPlayers || [];

    // If importing mid-auction, pause the timer so admin can review before resuming
    if (state.phase === 'LIVE') {
      state.timerPaused = true;
      state.timerRemainingOnPause = s.timerRemainingOnPause || (state.settings.timerSeconds * 1000);
      state.timerEndsAt = null;
    } else {
      state.timerPaused = false;
      state.timerRemainingOnPause = 0;
      state.timerEndsAt = null;
    }

    clearAuctionTimer();
    saveState();
    io.emit('state:full', getPublicState());

    res.json({ message: 'State imported successfully', phase: state.phase });
  });

  // Full reset — wipes everything back to factory defaults (requires admin password)
  router.post('/full-reset', authenticate, requireAdmin, (req, res) => {
    const { password, storagePreference } = req.body;

    if (!password || password !== config.admin.password) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const state = getState();

    if (storagePreference) {
      state.settings = state.settings || {};
      state.settings.storagePreference = storagePreference;
    }

    state.phase = 'SETUP';
    state.leagueConfig = {
      numTeams: 10,
      squadSize: 18,
      startingBudget: 50000,
      minBid: 1000,
      pools: DEFAULT_POOLS.map(p => ({ ...p })),
    };
    state.players = [];
    state.teams = {};
    state.currentPlayerIndex = null;
    state.currentBid = { amount: 0, teamId: null, history: [] };
    state.timerEndsAt = null;
    state.timerPaused = false;
    state.timerRemainingOnPause = 0;
    state.unsoldPlayers = [];

    clearAuctionTimer();
    saveState();
    io.emit('state:full', getPublicState());
    res.json({ message: 'Full reset complete — all data cleared', publicState: getPublicState() });
  });

  // Mock Auction Simulator (Test Only) -> programmatically acts out a bidding war
  router.post('/mock-simulate', authenticate, requireAdmin, async (req, res) => {
    try {
      const state = getState();
      const { startPlayer, processSold, processUnsold } = require('../auction');

      // Assume "Load Test Data" and "Reset Auction" are already done manually beforehand.
      state.phase = 'LIVE';
      state.lastSoldPlayerId = null;

      startPlayer(io);
      await new Promise(r => setTimeout(r, 100)); // allow state push

      const p = state.players[0]; // first player
      let curBase = parseInt(p.basePrice) || 1000;

      // Bid 1 (Team 1)
      state.currentBid = { amount: curBase, teamId: 'team_1', history: [{ amount: curBase, teamId: 'team_1', time: Date.now() }] };
      io.emit('auction:bidAccepted', state.currentBid);

      // Bid 2 (Team 2)
      curBase += 500;
      state.currentBid = { amount: curBase, teamId: 'team_2', history: [...state.currentBid.history, { amount: curBase, teamId: 'team_2', time: Date.now() }] };
      io.emit('auction:bidAccepted', state.currentBid);

      // Bid 3 (Team 1)
      curBase += 1000;
      state.currentBid = { amount: curBase, teamId: 'team_1', history: [...state.currentBid.history, { amount: curBase, teamId: 'team_1', time: Date.now() }] };
      io.emit('auction:bidAccepted', state.currentBid);

      await new Promise(r => setTimeout(r, 100));

      // Sell
      processSold(io);

      res.json({ message: 'Simulation complete', player: state.players[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
} // end createAdminRouter

module.exports = createAdminRouter;
