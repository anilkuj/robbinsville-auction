const fs = require('fs');
const path = require('path');

// Mock dependencies
const stateFile = path.join(__dirname, '../server/data/state.json');
const rawState = fs.readFileSync(stateFile, 'utf8');
const state = JSON.parse(rawState);

const SQUAD_SIZE = state.leagueConfig.squadSize || 18;
const MIN_BID = state.leagueConfig.minBid || 1000;

function isOwner(player) {
  if (!player.extra) return false;
  const typeKey = Object.keys(player.extra).find(k => String(k).trim().toLowerCase() === 'type' || String(k).trim().toLowerCase() === 'player_type');
  return typeKey ? String(player.extra[typeKey]).trim().toLowerCase() === 'owner' : false;
}

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

function syncOwnerAverages(state) {
  const owners = state.players.filter(p => isOwner(p));
  for (const owner of owners) {
    const avg = getBracketAverage(state.players, owner.sortOrder);
    if (avg > 0) {
      owner.soldFor = avg;
      owner.status = 'SOLD';
      
      if (owner.soldTo && state.teams[owner.soldTo]) {
        const team = state.teams[owner.soldTo];
        const entry = team.roster.find(r => r.playerId === owner.id);
        if (entry) {
          const diff = avg - entry.price;
          team.budget -= diff;
          entry.price = avg;
        } else {
           team.budget -= avg;
           team.roster.push({
             playerId: owner.id,
             playerName: owner.name,
             pool: owner.pool,
             price: avg,
             isOwner: true
           });
        }
      }
    }
  }
}

console.log('--- Starting Full Auction Simulation (Revised) ---');

// 1. Reset
state.phase = 'ENDED';
state.currentPlayerIndex = null;
state.unsoldPlayers = [];
state.commentary = [];
const teamIds = Object.keys(state.teams);
for (const tid of teamIds) {
  state.teams[tid].budget = state.leagueConfig.startingBudget || 50000;
  state.teams[tid].roster = [];
}

// 2. Pre-assign owners
for (const p of state.players) {
  if (isOwner(p)) {
    let teamId = null;
    const teamKey = Object.keys(p.extra || {}).find(k => k.toLowerCase().startsWith('team') || k === 'soldto');
    if (teamKey) {
       const teamName = p.extra[teamKey].toLowerCase().trim();
       const team = Object.values(state.teams).find(t => t.name.toLowerCase().trim() === teamName);
       if (team) teamId = team.id;
    }
    if (teamId) {
      p.status = 'SOLD';
      p.soldTo = teamId;
      // Price will be synced
    }
  } else {
    p.status = 'PENDING';
    p.soldTo = null;
    p.soldFor = null;
  }
}

// Ensure owners are in roster before calculating averages
syncOwnerAverages(state);

// 3. Sell non-owners
const nonOwners = state.players.filter(p => !isOwner(p));
for (const p of nonOwners) {
  // Logic to find team: Needs room and budget
  // Budget check: team.budget >= price
  // Must keep MIN_BID * spotsRemaining reserve
  
  const price = p.basePrice + (Math.floor(Math.random() * 20) * 100); // 0-2000 increment

  const eligibleTeams = teamIds.filter(tid => {
    const team = state.teams[tid];
    const spotsRemaining = SQUAD_SIZE - team.roster.length;
    if (spotsRemaining <= 0) return false;
    const reserve = (spotsRemaining - 1) * MIN_BID;
    return team.budget - price >= reserve;
  });

  if (eligibleTeams.length === 0) {
    p.status = 'UNSOLD';
    state.unsoldPlayers.push(p.id);
    continue;
  }

  // Pick team with most budget
  eligibleTeams.sort((a, b) => state.teams[b].budget - state.teams[a].budget);
  const teamId = eligibleTeams[0];
  const team = state.teams[teamId];

  p.status = 'SOLD';
  p.soldTo = teamId;
  p.soldFor = price;
  
  team.budget -= price;
  team.roster.push({
    playerId: p.id,
    playerName: p.name,
    pool: p.pool,
    price: price,
  });
}

// Final sync for owners
syncOwnerAverages(state);

console.log('Simulation complete.');
console.log('SOLD:', state.players.filter(p => p.status === 'SOLD').length);
console.log('UNSOLD:', state.players.filter(p => p.status === 'UNSOLD').length);
teamIds.forEach(tid => console.log(`${state.teams[tid].name}: ${state.teams[tid].roster.length} players, ${state.teams[tid].budget} pts`));

fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
