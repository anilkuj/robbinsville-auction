const DEFAULT_POOLS = [
  { id: 'A1', label: 'A1', basePrice: 4500, count: 10 },
  { id: 'A2', label: 'A2', basePrice: 4000, count: 10 },
  { id: 'A3', label: 'A3', basePrice: 3500, count: 10 },
  { id: 'B1', label: 'B1', basePrice: 3000, count: 10 },
  { id: 'B2', label: 'B2', basePrice: 2700, count: 10 },
  { id: 'B3', label: 'B3', basePrice: 2500, count: 10 },
  { id: 'C',  label: 'C',  basePrice: 1500, count: 40 },
  { id: 'D',  label: 'D',  basePrice: 1000, count: 80 },
];

const state = {
  phase: 'SETUP', // SETUP | LIVE | PAUSED | ENDED
  leagueConfig: {
    numTeams: 10,
    squadSize: 18,
    startingBudget: 50000,
    minBid: 1000,
    pools: DEFAULT_POOLS,
  },
  settings: { timerSeconds: 30, bidIncrement: 500, timerBumpSeconds: 10, endMode: 'timer' },
  players: [],
  currentPlayerIndex: null,
  currentBid: { amount: 0, teamId: null, history: [] },
  timerEndsAt: null,       // epoch ms — server-authoritative
  timerPaused: false,
  timerRemainingOnPause: 0,
  teams: {},               // { teamId: { id, name, password, budget, roster: [] } }
  unsoldPlayers: [],       // array of player IDs
};

function getState() {
  return state;
}

module.exports = { getState, DEFAULT_POOLS };
