const fs = require('fs');
const path = require('path');

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
  const sold = players.filter(p => p.sortOrder >= bracketStart && p.sortOrder <= bracketEnd && p.status === 'SOLD' && !isOwner(p));
  if (sold.length === 0) return 0;
  return Math.round(sold.reduce((s, p) => s + p.soldFor, 0) / sold.length);
}

function syncOwnerPrices(state) {
  state.players.filter(isOwner).forEach(owner => {
    const avg = getBracketAverage(state.players, owner.sortOrder);
    if (avg > 0) {
      const oldPrice = owner.soldFor || 0;
      owner.soldFor = avg;
      if (owner.soldTo && state.teams[owner.soldTo]) {
        const team = state.teams[owner.soldTo];
        const entry = team.roster.find(r => r.playerId === owner.id);
        if (entry) {
          team.budget += entry.price;
          team.budget -= avg;
          entry.price = avg;
        } else if (team.roster.length < SQUAD_SIZE) {
          team.budget -= avg;
          team.roster.push({ 
            playerId: owner.id, playerName: owner.name, pool: owner.pool, price: avg, isOwner: true 
          });
        }
      }
    }
  });
}

console.log('--- Final Full Auction Simulation ---');

// Reset
state.phase = 'ENDED';
state.currentPlayerIndex = null;
state.unsoldPlayers = [];
state.commentary = [];
const teamIds = Object.keys(state.teams);
teamIds.forEach(tid => {
  state.teams[tid].budget = state.leagueConfig.startingBudget || 50000;
  state.teams[tid].roster = [];
});

// Auctions by sortOrder
state.players.sort((a,b) => a.sortOrder - b.sortOrder);

for (const p of state.players) {
  if (isOwner(p)) {
    // Determine team
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
      // Budget/Roster handled in syncOwnerPrices
    }
  } else {
    // Auction non-owner
    const price = p.basePrice + (Math.floor(Math.random() * 15) * 100);
    const eligibleTeams = teamIds.filter(tid => {
      const team = state.teams[tid];
      const remainingSlots = SQUAD_SIZE - team.roster.length;
      if (remainingSlots <= 0) return false;
      const mustKeep = (remainingSlots - 1) * MIN_BID;
      return team.budget - price >= mustKeep;
    });

    if (eligibleTeams.length > 0) {
      eligibleTeams.sort((a,b) => state.teams[b].budget - state.teams[a].budget);
      const tid = eligibleTeams[0];
      const team = state.teams[tid];
      
      p.status = 'SOLD';
      p.soldTo = tid;
      p.soldFor = price;
      
      team.budget -= price;
      team.roster.push({
        playerId: p.id, playerName: p.name, pool: p.pool, price: price
      });
    } else {
      p.status = 'UNSOLD';
      state.unsoldPlayers.push(p.id);
    }
  }
  // Recalculate owners after every single player decision
  syncOwnerPrices(state);
}

// Final check
console.log('Results:');
console.log('SOLD:', state.players.filter(p => p.status === 'SOLD').length);
console.log('UNSOLD:', state.players.filter(p => p.status === 'UNSOLD').length);
teamIds.forEach(tid => console.log(`${state.teams[tid].name}: ${state.teams[tid].roster.length} players, ${state.teams[tid].budget} pts`));

fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
