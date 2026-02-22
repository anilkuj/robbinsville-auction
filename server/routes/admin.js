const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/authenticate');
const requireAdmin = require('../middleware/requireAdmin');
const { getState, DEFAULT_POOLS } = require('../state');
const { saveState } = require('../persistence');
const { getPublicState, clearAuctionTimer } = require('../auction');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Factory: accepts `io` so HTTP routes can broadcast socket events after mutations
function createAdminRouter(io) {
const router = express.Router();

// Import players from CSV
router.post('/import-players', authenticate, requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const csvText = req.file.buffer.toString('utf8');
    const records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

    const state = getState();
    const { pools, numTeams, squadSize } = state.leagueConfig;
    const expectedTotal = numTeams * squadSize;

    if (records.length !== expectedTotal) {
      return res.status(400).json({
        error: `CSV has ${records.length} players, expected ${expectedTotal} (${numTeams} teams × ${squadSize} players)`,
      });
    }

    // Validate pool counts
    const poolMap = {};
    pools.forEach(p => { poolMap[p.id] = { ...p, actual: 0 }; });

    for (const row of records) {
      if (!row.name || !row.name.trim()) {
        return res.status(400).json({ error: 'Each row must have a "name" column' });
      }
      const pool = row.pool?.trim().toUpperCase();
      if (!poolMap[pool]) {
        return res.status(400).json({ error: `Unknown pool "${row.pool}" in CSV. Valid pools: ${Object.keys(poolMap).join(', ')}` });
      }
      poolMap[pool].actual++;
    }

    for (const pool of pools) {
      if (poolMap[pool.id].actual !== pool.count) {
        return res.status(400).json({
          error: `Pool ${pool.id}: expected ${pool.count} players, found ${poolMap[pool.id].actual}`,
        });
      }
    }

    // Build players array sorted by pool order then name
    const poolOrder = pools.map(p => p.id);
    const players = records.map((row, idx) => ({
      id: uuidv4(),
      name: row.name.trim(),
      pool: row.pool.trim().toUpperCase(),
      basePrice: poolMap[row.pool.trim().toUpperCase()].basePrice,
      status: 'PENDING',
      soldTo: null,
      soldFor: null,
      sortOrder: idx,
    }));

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
    res.json({ message: `${players.length} players imported successfully`, count: players.length });
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

  const { leagueConfig, teams } = req.body;
  if (!leagueConfig || !teams) {
    return res.status(400).json({ error: 'leagueConfig and teams are required' });
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

  // Update league config
  state.leagueConfig = {
    numTeams: parseInt(numTeams),
    squadSize: parseInt(squadSize),
    startingBudget: parseInt(leagueConfig.startingBudget),
    minBid: parseInt(leagueConfig.minBid),
    pools: pools.map(p => ({
      id: String(p.id),
      label: String(p.label || p.id),
      basePrice: parseInt(p.basePrice),
      count: parseInt(p.count),
    })),
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
    };
  }
  state.teams = newTeams;

  saveState();
  io.emit('state:full', getPublicState());
  res.json({ message: 'League config saved', publicState: getPublicState() });
});

// Reset auction (clears player statuses + team budgets/rosters)
router.post('/reset-auction', authenticate, requireAdmin, (req, res) => {
  const state = getState();

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

  clearAuctionTimer();
  saveState();
  io.emit('state:full', getPublicState());
  res.json({ message: 'Auction reset successfully', publicState: getPublicState() });
});

// Full reset — wipes everything back to factory defaults
router.post('/full-reset', authenticate, requireAdmin, (req, res) => {
  const state = getState();

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

return router;
} // end createAdminRouter

module.exports = createAdminRouter;
