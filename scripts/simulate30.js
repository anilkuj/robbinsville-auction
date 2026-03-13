const { getState } = require('../server/state');
const { saveState, loadState } = require('../server/persistence');
const { isOwner, syncOwnerAverages } = require('../server/auction');

async function run() {
  console.log('--- STARTING PARTIAL SIMULATION (30 PLAYERS) ---');
  
  console.log('Loading current state...');
  const success = await loadState();
  if (!success) {
    console.error('Failed to load state. Ensure server/data/state.json exists.');
    process.exit(1);
  }
  
  const state = getState();

  // Reset for a fresh start of the first 30
  console.log('Resetting auction state for simulation...');
  state.phase = 'SETUP';
  state.currentPlayerIndex = null;
  state.lastSoldPlayerId = null;
  state.unsoldPlayers = [];
  
  const teamIds = Object.keys(state.teams);
  teamIds.forEach(tid => {
    state.teams[tid].budget = state.leagueConfig.startingBudget || 50000;
    state.teams[tid].roster = [];
  });

  state.players.forEach(p => {
    p.status = 'PENDING';
    p.soldTo = null;
    p.soldFor = null;
    p.saleIndex = null;
    p.soldAt = null;
  });

  // Sort by rank (sortOrder)
  state.players.sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const SQUAD_SIZE = state.leagueConfig.squadSize || 18;
  const MIN_BID = state.leagueConfig.minBid || 1000;

  console.log('Simulating first 30 eligible players (including Owners)...');
  let playersProcessed = 0;
  let totalSaleIndex = 0;

  for (const p of state.players) {
    if (playersProcessed >= 30) break;
    
    // Skip spillover players for the first 30
    if (state.leagueConfig.spilloverPlayerIds?.includes(p.id)) continue;

    if (isOwner(p)) {
       // Owners are automatically assigned
       const teamKey = Object.keys(p.extra || {}).find(k => k.toLowerCase().startsWith('team') || k === 'soldto');
       let team = null;
       if (teamKey) {
           const teamName = p.extra[teamKey].trim().toLowerCase();
           team = Object.values(state.teams).find(t => t.name.trim().toLowerCase() === teamName);
       }
       if (team) {
           totalSaleIndex++;
           playersProcessed++;
           p.status = 'SOLD';
           p.soldTo = team.id;
           p.soldFor = 0; // Will be synced
           p.saleIndex = totalSaleIndex;
           p.soldAt = Date.now();
           team.roster.push({
               playerId: p.id,
               playerName: p.name,
               pool: p.pool,
               price: 0,
               saleIndex: p.saleIndex,
               soldAt: p.soldAt,
               isOwner: true,
               extra: p.extra
           });
           console.log(`[OWNER] Assigned ${p.name} to ${team.name} (#${playersProcessed}/30)`);
       }
       continue;
    }

    // Regular player auction logic
    const eligibleTeams = teamIds.filter(tid => {
        const team = state.teams[tid];
        const remainingSlots = SQUAD_SIZE - team.roster.length;
        if (remainingSlots <= 0) return false;
        
        // Ensure they can still afford the rest of the squad
        const mustKeep = (remainingSlots - 1) * MIN_BID;
        return team.budget - p.basePrice >= mustKeep;
    });

    if (eligibleTeams.length > 0) {
        // Pick team with most budget
        eligibleTeams.sort((a,b) => state.teams[b].budget - state.teams[a].budget);
        const tid = eligibleTeams[0];
        const team = state.teams[tid];
        
        // Random price between base and base + 5000
        const price = p.basePrice + Math.floor(Math.random() * 50) * 100;
        
        totalSaleIndex++;
        playersProcessed++;
        p.status = 'SOLD';
        p.soldTo = tid;
        p.soldFor = price;
        p.saleIndex = totalSaleIndex;
        p.soldAt = Date.now();
        team.budget -= price;
        team.roster.push({
            playerId: p.id,
            playerName: p.name,
            pool: p.pool,
            price: price,
            saleIndex: p.saleIndex,
            soldAt: p.soldAt,
            extra: p.extra
        });
        console.log(`[SOLD] ${p.name} (${p.pool}) to ${team.name} for ${price.toLocaleString()} pts. (#${playersProcessed}/30)`);
    } else {
        console.log(`[UNSOLD] No team can afford ${p.name} (#${playersProcessed}/30)`);
        p.status = 'UNSOLD';
        state.unsoldPlayers.push(p.id);
        playersProcessed++;
    }
  }

  console.log('Syncing owner averages...');
  syncOwnerAverages(state);
  
  console.log('Finalizing state...');
  state.phase = 'SETUP'; // Return to setup so admin can continue or review
  
  saveState();
  
  // Wait for persistence write
  setTimeout(() => {
    console.log('--- SIMULATION COMPLETE ---');
    process.exit(0);
  }, 1000);
}

run().catch(err => {
  console.error('Fatal error during simulation:', err);
  process.exit(1);
});
