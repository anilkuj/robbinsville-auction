const { v4: uuidv4 } = require('uuid');
const { getState } = require('./state');
const { startPlayer, processSold, computeMaxBid } = require('./auction');

// Dummy Socket.IO emitter
const io = { emit: () => { } };

async function simulateFullAuction() {
    const state = getState();

    console.log('--- INITIALIZING TEST DATA ---');
    state.phase = 'SETUP';

    const TEST_PLAYERS = {
        A: ['AB de Villiers', 'Babar Azam', 'Ben Stokes', 'Jasprit Bumrah', 'Joe Root',
            'MS Dhoni', 'Pat Cummins', 'Rashid Khan', 'Rohit Sharma', 'Steve Smith', 'Virat Kohli'],
        B: ['Andre Russell', 'David Warner', 'Glenn Maxwell', 'Hardik Pandya', 'Kane Williamson',
            'KL Rahul', 'Mitchell Starc', 'Ravindra Jadeja', 'Rishabh Pant', 'Suryakumar Yadav', 'Trent Boult'],
        C: ['Avesh Khan', 'Bhuvneshwar Kumar', 'Deepak Chahar', 'Faf du Plessis', 'Ishan Kishan',
            'Kuldeep Yadav', 'Quinton de Kock', 'Shardul Thakur', 'Shubman Gill', 'Washington Sundar', 'Yuzvendra Chahal'],
    };
    const BASE_PRICES = { A: 3000, B: 2000, C: 1000 };

    state.leagueConfig = {
        numTeams: 3,
        squadSize: 11,
        startingBudget: 30000,
        minBid: 500,
        pools: [
            { id: 'A', label: 'A', basePrice: 3000, count: 11 },
            { id: 'B', label: 'B', basePrice: 2000, count: 11 },
            { id: 'C', label: 'C', basePrice: 1000, count: 11 },
        ],
    };

    const owner1Id = uuidv4();
    const owner2Id = uuidv4();
    const owner3Id = uuidv4();

    state.teams = {
        team_1: { id: 'team_1', name: 'Team Alpha', password: 'alpha', budget: 30000, roster: [], ownerIsPlayer: true, ownerPlayerId: owner1Id },
        team_2: { id: 'team_2', name: 'Team Beta', password: 'beta', budget: 30000, roster: [], ownerIsPlayer: true, ownerPlayerId: owner2Id },
        team_3: { id: 'team_3', name: 'Team Gamma', password: 'gamma', budget: 30000, roster: [], ownerIsPlayer: true, ownerPlayerId: owner3Id },
    };

    const players = [
        { id: owner1Id, name: 'Owner Alpha', pool: 'A', basePrice: 0, status: 'PENDING', soldTo: null, soldFor: null, sortOrder: 0, extra: { type: 'owner', role: 'BAT' } },
        { id: owner2Id, name: 'Owner Beta', pool: 'A', basePrice: 0, status: 'PENDING', soldTo: null, soldFor: null, sortOrder: 0, extra: { type: 'owner', role: 'BOWL' } },
        { id: owner3Id, name: 'Owner Gamma', pool: 'A', basePrice: 0, status: 'PENDING', soldTo: null, soldFor: null, sortOrder: 0, extra: { type: 'owner', role: 'ALL' } },
    ];
    for (const pool of ['A', 'B', 'C']) {
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
        const poolOrder = ['A', 'B', 'C'];
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

    console.log('--- STARTING SIMULATION ---');
    let soldCount = 0;

    // Function to simulate bidding for the current player
    function simulateBidding(player) {
        let currentAmount = player.basePrice;
        let currentWinningTeam = null;
        let history = [];

        const teams = Object.values(state.teams);
        let activeBidders = teams.map(t => t.id);

        // Random number of bids (e.g., 1 to 5)
        let sequenceBids = Math.floor(Math.random() * 5) + 1;

        for (let i = 0; i < sequenceBids; i++) {
            // filter bidders that can afford
            const eligibleBidders = activeBidders.filter(teamId => {
                if (teamId === currentWinningTeam) return false;
                const t = state.teams[teamId];
                const maxBid = computeMaxBid(t.budget, t.roster.length, state.leagueConfig.squadSize, state.leagueConfig.minBid);
                return maxBid >= currentAmount;
            });

            if (eligibleBidders.length === 0) break; // Nobody else can bid

            const bidder = eligibleBidders[Math.floor(Math.random() * eligibleBidders.length)];
            currentWinningTeam = bidder;
            currentAmount += 500; // Increment of 500
            history.push({ amount: currentAmount, teamId: bidder, time: Date.now() });
        }

        // fallback if no bids
        if (!currentWinningTeam) {
            // give it to a random team capable of minimum base bid just to ensure everyone sells
            const capable = teams.filter(t => {
                const maxBid = computeMaxBid(t.budget, t.roster.length, state.leagueConfig.squadSize, state.leagueConfig.minBid);
                return maxBid >= player.basePrice;
            });
            if (capable.length > 0) {
                currentWinningTeam = capable[Math.floor(Math.random() * capable.length)].id;
            } else {
                // Very unlikely in this test with large budgets
                return false;
            }
        }

        state.currentBid = { amount: currentAmount, teamId: currentWinningTeam, history };
        return true;
    }

    // Iterate while there are pending non-owner players
    while (true) {
        startPlayer(io); // starts the next available pending player
        if (state.phase === 'ENDED') {
            break; // All non-owners sold
        }

        const player = state.players[state.currentPlayerIndex];
        if (player) {
            const sold = simulateBidding(player);
            if (sold) {
                processSold(io);
                soldCount++;
            } else {
                const { processUnsold } = require('./auction');
                processUnsold(io);
                console.log(`Player ${player.name} went UNSOLD.`);
            }
        } else {
            break;
        }
    }

    console.log(`\n--- AUCTION COMPLETE: ${soldCount} non-owners sold ---`);

    // Compute stats
    console.log('\n--- FINAL ROSTERS & BUDGETS ---');
    for (const team of Object.values(state.teams)) {
        console.log(`\n[${team.name}] Budget: ${team.budget} / ${state.leagueConfig.startingBudget} pts`);
        console.log(`Squad Size: ${team.roster.length} / ${state.leagueConfig.squadSize}`);
        console.log('Players:');
        team.roster.forEach(r => {
            let text = ` - ${r.playerName} (Pool ${r.pool}, ${r.price} pts)`;
            if (r.isOwner) text += ' [OWNER]';
            console.log(text);
        });
    }

    // Check remaining unsolds
    const pendingOrUnsold = state.players.filter(p => p.status !== 'SOLD');
    if (pendingOrUnsold.length > 0) {
        console.log(`\nRemaining Unsold/Pending: ${pendingOrUnsold.length}`);
        pendingOrUnsold.forEach(p => console.log(` - ${p.name} (${p.status})`));
    } else {
        console.log('\nAll 36 players successfully sold (including 3 owners resolving to averages).');
    }
}

simulateFullAuction().catch(console.error);
