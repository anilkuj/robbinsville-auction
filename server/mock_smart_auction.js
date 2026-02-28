const { v4: uuidv4 } = require('uuid');
const { getState } = require('./state');
const { startPlayer, processSold, computeMaxBid, processUnsold } = require('./auction');

// Dummy Socket.IO emitter
const io = { emit: () => { } };

async function fetchJSON(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Accept': 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`http://localhost:3001/api${endpoint}`, options);
    const text = await res.text();

    return { status: res.status, body: JSON.parse(text) };
}

async function simulateSmartAuction() {
    const state = getState();

    console.log('--- INITIALIZING SMART SIMULATION ---');
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

    state.leagueConfig = {
        numTeams: 3,
        squadSize: 12, // Smart Fix: 11 non-owners + 1 owner = 12 total spots per team
        startingBudget: 45000, // Smart Fix: Increased to 45k so teams never run out of money
        minBid: 100,
        pools: [
            { id: 'A', label: 'A', basePrice: 3000, count: 9 }, // 6 regular + 3 owners
            { id: 'B', label: 'B', basePrice: 1000, count: 27 },
        ],
    };

    const owner1Id = uuidv4();
    const owner2Id = uuidv4();
    const owner3Id = uuidv4();

    state.teams = {
        team_1: { id: 'team_1', name: 'Team Alpha', password: 'alpha', budget: state.leagueConfig.startingBudget, roster: [], ownerIsPlayer: true, ownerPlayerId: owner1Id },
        team_2: { id: 'team_2', name: 'Team Beta', password: 'beta', budget: state.leagueConfig.startingBudget, roster: [], ownerIsPlayer: true, ownerPlayerId: owner2Id },
        team_3: { id: 'team_3', name: 'Team Gamma', password: 'gamma', budget: state.leagueConfig.startingBudget, roster: [], ownerIsPlayer: true, ownerPlayerId: owner3Id },
    };

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
    state.settings = { ...state.settings, randomizePool: true, timerSeconds: 30 };

    console.log('--- STARTING SMART BIDDING ---');
    let soldCount = 0;

    function simulateBidding(player) {
        let currentAmount = player.basePrice;
        let currentWinningTeam = null;
        let history = [];

        const teams = Object.values(state.teams);
        let activeBidders = teams.map(t => t.id);

        // Aggressive random bids: Up to 100 bids
        let sequenceBids = Math.floor(Math.random() * 100) + 5;

        for (let i = 0; i < sequenceBids; i++) {
            const eligibleBidders = activeBidders.filter(teamId => {
                if (teamId === currentWinningTeam) return false;
                const t = state.teams[teamId];

                // Intelligence: strictly limit to exactly 12 spots
                const needed = state.leagueConfig.squadSize - t.roster.length;
                if (needed <= 0) return false;

                const maxBid = computeMaxBid(t.budget, t.roster.length, state.leagueConfig.squadSize, 1000);

                // Aggressive intelligent caps to use up budget smartly
                if (player.pool === 'B' && currentAmount > Math.min(maxBid * 0.5, 12000)) return false;
                if (player.pool === 'A' && currentAmount > Math.min(maxBid * 0.9, 25000)) return false;

                return maxBid >= (currentAmount + (i === 0 ? 0 : state.leagueConfig.minBid));
            });

            if (eligibleBidders.length === 0) break;

            const bidder = eligibleBidders[Math.floor(Math.random() * eligibleBidders.length)];
            currentWinningTeam = bidder;
            currentAmount += (i === 0 ? 0 : state.leagueConfig.minBid);
            history.push({ amount: currentAmount, teamId: bidder, time: Date.now() });
        }

        if (!currentWinningTeam) {
            // Force the team with the smallest roster (who has the most remaining need) to buy at base price
            const capable = teams.filter(t => {
                const needed = state.leagueConfig.squadSize - t.roster.length;
                if (needed <= 0) return false;
                const maxBid = computeMaxBid(t.budget, t.roster.length, state.leagueConfig.squadSize, 1000);
                return maxBid >= player.basePrice;
            });

            if (capable.length > 0) {
                capable.sort((a, b) => a.roster.length - b.roster.length);
                currentWinningTeam = capable[0].id;
                state.currentBid = { amount: player.basePrice, teamId: currentWinningTeam, history: [{ amount: player.basePrice, teamId: currentWinningTeam, time: Date.now() }] };
                return true;
            } else {
                console.warn(`[!] No team could afford ${player.name} at ${player.basePrice} pts.`);
                return false;
            }
        }

        state.currentBid = { amount: currentAmount, teamId: currentWinningTeam, history };
        return true;
    }

    while (true) {
        startPlayer(io);
        if (state.phase === 'ENDED') break;

        const player = state.players[state.currentPlayerIndex];
        if (player) {
            const sold = simulateBidding(player);
            if (sold) {
                processSold(io);
                soldCount++;
            } else {
                processUnsold(io);
            }
        } else {
            break;
        }
    }

    console.log(`\n--- AUCTION COMPLETE: ${soldCount} non-owners sold ---`);

    // Compute stats
    for (const team of Object.values(state.teams)) {
        console.log(`\n[${team.name}] Budget: ${team.budget} / ${state.leagueConfig.startingBudget} pts, Roster: ${team.roster.length}/${state.leagueConfig.squadSize}`);
    }

    console.log('\n--- PUSHING FINAL STATE TO RUNNING SERVER ---');
    try {
        // 1. Log in
        console.log('Logging in as admin...');
        const loginRes = await fetchJSON('/auth/login', 'POST', { username: 'admin', password: 'admin123' });
        if (loginRes.status !== 200) {
            throw new Error('Failed to log in: ' + JSON.stringify(loginRes.body));
        }
        const token = loginRes.body.token;

        // 2. Import state
        console.log('Sending /admin/import-state request...');
        const importRes = await fetchJSON('/admin/import-state', 'POST', { password: 'admin123', state: state }, token);

        if (importRes.status === 200) {
            console.log('SUCCESS! State is now live on the app.');
        } else {
            throw new Error('Failed to push state: ' + JSON.stringify(importRes.body));
        }
    } catch (err) {
        console.error('API Error:', err.message);
    }
}

simulateSmartAuction().catch(console.error);
