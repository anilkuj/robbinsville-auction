const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load the raw backup
const rawBackup = fs.readFileSync(path.join(__dirname, 'backup_state.json'), 'utf-8');

function computeMaxBid(budget, currentRosterSize, maxRosterSize) {
    const spotsRemaining = maxRosterSize - currentRosterSize;
    if (spotsRemaining <= 0) return 0;
    if (spotsRemaining === 1) return budget;
    // Reserve minimal 1500 per slot to let teams blow heavy cash early on superstars
    let computedMax = budget - ((spotsRemaining - 1) * 1500);
    // Hard limit per player gracefully capped
    return Math.min(20000, computedMax);
}

async function fetchJSON(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Accept': 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`http://localhost:3001/api${endpoint}`, options);
    try {
        const text = await res.text();
        return { status: res.status, body: JSON.parse(text) };
    } catch {
        return { status: res.status, body: {} };
    }
}

function runSingleSimulation() {
    // Clone fresh state from string parsing
    const state = JSON.parse(rawBackup);

    // Safety check - force all players to PENDING and squads to empty just in case the backup had partials
    state.players.forEach(p => { p.status = 'PENDING'; p.soldTo = null; p.soldFor = null; });
    Object.values(state.teams).forEach(t => { t.budget = state.leagueConfig.startingBudget || 50000; t.roster = []; });
    state.unsoldPlayers = [];
    state.currentBid = { amount: 0, teamId: null, history: [] };

    const squadSize = state.leagueConfig.squadSize || 18;
    const minBid = state.leagueConfig.minBid || 1000;
    const bidIncrement = state.settings?.bidIncrement || 100;
    const basePrices = {};
    for (const p of state.leagueConfig.pools || []) {
        basePrices[p.id] = p.basePrice || 1000;
    }

    const A1Players = state.players.filter(p => p.pool === 'A1');
    A1Players.sort((a, b) => {
        const avgA = parseInt(a.extra?.Average_points || '0', 10);
        const avgB = parseInt(b.extra?.Average_points || '0', 10);
        return avgB - avgA;
    });
    const numSuperstars = Math.max(2, Math.floor(A1Players.length * 0.30));
    const superstarMap = new Map();
    A1Players.slice(0, numSuperstars).forEach((p, i) => {
        const rankPercentile = 1.0 - (i / numSuperstars); // 1.0 for #1 player, scaling down
        superstarMap.set(p.id, rankPercentile);
    });

    // 1. Pre-assign Owners and reserve their basePrice initially
    const ownerDocs = [];
    for (const t of Object.values(state.teams)) {
        if (t.ownerIsPlayer && t.ownerPlayerId) {
            const p = state.players.find(x => x.id === t.ownerPlayerId);
            if (p) {
                p.status = 'SOLD';
                p.soldTo = t.id;
                // Temporarily reserve base price so team doesn't blow that money
                // Pad A-pool owners heavily because the massive superstars will severely inflate the final A-pool average
                let reserve = p.basePrice || basePrices[p.pool] || 1000;
                if (p.pool === 'A1') reserve = reserve * 2.5;
                if (p.pool === 'A2') reserve = reserve * 1.5;

                p.soldFor = reserve;
                t.budget -= reserve;
                t.roster.push({
                    playerId: p.id,
                    playerName: p.name,
                    pool: p.pool,
                    price: reserve
                });
                ownerDocs.push(p);
            }
        }
    }

    let soldCount = ownerDocs.length;
    const poolStats = {};
    for (const poolId of Object.keys(basePrices)) {
        poolStats[poolId] = { totalCost: 0, count: 0 };
    }

    for (let i = 0; i < state.players.length; i++) {
        const player = state.players[i];
        if (player.status === 'SOLD') continue; // Skip owners already pre-assigned

        let currentAmount = player.basePrice || basePrices[player.pool] || minBid;
        let currentWinningTeam = null;
        let history = [];

        const teams = Object.values(state.teams);

        // Realistic Bids: define how "valuable" this player is randomly based on pool
        let playerDesireMultiplier = 1.0;
        let isSuperstar = false;

        if (player.pool === 'A1') {
            if (superstarMap.has(player.id)) { // Only true high-average performers trigger bidding wars
                const rankPct = superstarMap.get(player.id);
                // Hard floor based on rank. #1 Player starts at min 3.5x. 
                playerDesireMultiplier = 2.0 + (1.5 * rankPct) + Math.random() * 0.5;
                isSuperstar = true;
            } else {
                playerDesireMultiplier = 1.0 + Math.random() * 1.6; // up to 2.6x base (~7.8k)
            }
        }
        else if (player.pool === 'A2') playerDesireMultiplier = 1.0 + Math.random() * 1.2; // up to 2.2x base
        else if (player.pool === 'B') playerDesireMultiplier = 1.0 + Math.random() * 2.0;    // up to 3.0x base price
        else if (player.pool === 'C') playerDesireMultiplier = 1.0 + Math.random() * 1.5;    // up to 2.5x base price
        else playerDesireMultiplier = 1.0 + Math.random() * 1.0;                             // up to 2.0x base price

        let activeBidders = teams.filter(t => {
            const needed = squadSize - (t.roster?.length || 0);
            if (needed <= 0) return false;
            return computeMaxBid(t.budget, t.roster?.length || 0, squadSize) >= minBid;
        }).map(t => t.id);

        if (activeBidders.length > 0) {
            // Variable aggressive sequence: more bids for high pool players
            // Superstars need massive sequences (up to 80 bids) to organically traverse from 4k -> 15k+
            let maxSequence = isSuperstar ? 80 : (player.pool.startsWith('A') ? 40 : 20);
            let minSequence = isSuperstar ? 15 : 1;
            if (isSuperstar && superstarMap.get(player.id) > 0.8) minSequence = 35; // Top player guarantees mega-sequence

            let sequenceBids = Math.floor(Math.random() * (maxSequence - minSequence)) + minSequence;

            for (let j = 0; j < sequenceBids; j++) {
                const eligibleBidders = activeBidders.filter(teamId => {
                    if (teamId === currentWinningTeam) return false;
                    const t = state.teams[teamId];
                    const needed = squadSize - (t.roster?.length || 0);
                    if (needed <= 0) return false;

                    const maxBid = computeMaxBid(t.budget, t.roster?.length || 0, squadSize);

                    // The player's intrinsic valuation caps out the bid organically
                    const perceivedValue = (player.basePrice || basePrices[player.pool] || minBid) * playerDesireMultiplier;
                    if (currentAmount > perceivedValue) return false;

                    // Hard limit per bid to keep realism without breaking budget
                    const maxPercentage = isSuperstar ? 0.85 : 0.60;
                    if (currentAmount > maxBid * maxPercentage) return false;

                    const hardLimit = isSuperstar ? 20000 : 9600;
                    if (currentAmount > hardLimit) return false;

                    // Calculate potential next bid realistically
                    // Bots usually bid 1x, 2x, or 5x the standard increment randomly to show aggression
                    const incrementMultiplier = [1, 1, 1, 2, 2, 5][Math.floor(Math.random() * 6)];
                    const nextBidAmount = currentAmount + (j === 0 ? 0 : (bidIncrement * incrementMultiplier));

                    return maxBid >= nextBidAmount;
                });

                if (eligibleBidders.length === 0) break;

                const bidder = eligibleBidders[Math.floor(Math.random() * eligibleBidders.length)];
                currentWinningTeam = bidder;

                const incrementMultiplier = [1, 1, 1, 2, 2, 5][Math.floor(Math.random() * 6)];
                currentAmount += (j === 0 ? 0 : (bidIncrement * incrementMultiplier));
                history.push({ amount: currentAmount, teamId: bidder, time: Date.now() });
            }
        }

        if (!currentWinningTeam) {
            const capable = teams.filter(t => {
                const needed = squadSize - (t.roster?.length || 0);
                if (needed <= 0) return false;
                const maxBid = computeMaxBid(t.budget, t.roster?.length || 0, squadSize);
                return maxBid >= (player.basePrice || basePrices[player.pool] || minBid);
            });

            if (capable.length > 0) {
                capable.sort((a, b) => b.budget - a.budget);
                currentWinningTeam = capable[0].id;
                currentAmount = player.basePrice || basePrices[player.pool] || minBid;
            } else {
                const incomplete = teams.filter(t => (squadSize - (t.roster?.length || 0)) > 0);
                if (incomplete.length > 0) {
                    incomplete.sort((a, b) => b.budget - a.budget);
                    currentWinningTeam = incomplete[0].id;
                    // If forced, do base price to save them
                    currentAmount = player.basePrice || basePrices[player.pool] || minBid;
                } else {
                    player.status = 'UNSOLD';
                    state.unsoldPlayers.push(player.id);
                    continue; // Skip processing completely
                }
            }
        }

        // Process final sale outcome for non-owners
        player.status = 'SOLD';
        player.soldTo = currentWinningTeam;
        player.soldFor = currentAmount;

        const wTeam = state.teams[currentWinningTeam];
        wTeam.budget -= currentAmount;
        wTeam.roster.push({
            playerId: player.id,
            playerName: player.name,
            pool: player.pool,
            price: currentAmount,
        });

        if (poolStats[player.pool]) {
            poolStats[player.pool].totalCost += currentAmount;
            poolStats[player.pool].count += 1;
        }

        state.lastSoldPlayerId = player.id;
        soldCount++;
    }

    // 2. Adjust Owner Prices based on final true average
    let hasViolation = false;
    for (const owner of ownerDocs) {
        const poolId = owner.pool;
        let avgPrice = basePrices[poolId] || 1000;
        if (poolStats[poolId] && poolStats[poolId].count > 0) {
            // Round to nearest 100 since bidIncrement is usually 100
            avgPrice = Math.round((poolStats[poolId].totalCost / poolStats[poolId].count) / 100) * 100;
        }

        const team = state.teams[owner.soldTo];
        const reserve = owner.soldFor;

        // Refund initial reserve and apply true average
        team.budget += reserve;
        team.budget -= avgPrice;

        owner.soldFor = avgPrice;
        const rEntry = team.roster.find(r => r.playerId === owner.id);
        if (rEntry) rEntry.price = avgPrice;

        if (team.budget < 0) {
            hasViolation = true; // Mark seed invalid if adjusting average broke them
        }
    }

    return { state, soldCount, hasViolation };
}

async function findPerfectSeed() {
    console.log('--- STARTING 5,000 ITERATION MAXIMUM UTILIZATION SEARCH ---');
    console.log('Requirements: 180 sold, 18 per team, 0 negative budgets, realistic pricing, owner exclusions...');
    console.log('Goal: Maximize budget utilization across the league.');

    let attempts = 0;
    let bestState = null;
    let minRemainingBudget = Infinity;

    while (attempts < 5000) {
        attempts++;
        const { state, soldCount, hasViolation } = runSingleSimulation();

        // Condition 1: 180 sold
        if (soldCount !== 180) continue;

        // Condition 2: No retrospective violations
        if (hasViolation) continue;

        const teamsArray = Object.values(state.teams);

        // Condition 3: EXACTLY No negative budgets
        const anyNegative = teamsArray.some(t => t.budget < 0);
        if (anyNegative) continue;

        // Condition 4: Exact sizes
        const anyIncomplete = teamsArray.some(t => t.roster.length !== 18);
        if (anyIncomplete) continue;

        // Calculate utilization metric
        const totalRemaining = teamsArray.reduce((sum, t) => sum + t.budget, 0);

        if (totalRemaining < minRemainingBudget) {
            minRemainingBudget = totalRemaining;
            bestState = state;
            console.log(`[Attempt ${attempts}] Found new valid seed! Remaining league budget: ${totalRemaining} pts`);
        }
    }

    if (bestState) {
        console.log(`\n======================================================`);
        console.log(`🎉 BEST SEED FOUND OUT OF 5,000 ATTEMPTS!`);
        console.log(`Total Remaining Budget Across League: ${minRemainingBudget} pts`);
        console.log(`======================================================`);

        const teamsArray = Object.values(bestState.teams);
        for (const team of teamsArray) {
            console.log(`[${team.name}] Budget: ${team.budget} pts, Roster: ${team.roster.length}/18`);
        }

        console.log('\n--- PUSHING PERFECT STATE TO RUNNING SERVER ---');
        try {
            const loginRes = await fetchJSON('/auth/login', 'POST', { username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
            if (loginRes.status !== 200) throw new Error('Failed to log in: ' + JSON.stringify(loginRes.body));

            const token = loginRes.body.token;
            const importRes = await fetchJSON('/admin/import-state', 'POST', { password: process.env.ADMIN_PASSWORD || 'admin123', state: bestState }, token);

            if (importRes.status === 200) {
                console.log('SUCCESS! Perfect state is now live on the app.');
            } else {
                throw new Error('Failed to push state: ' + JSON.stringify(importRes.body));
            }
        } catch (err) {
            console.error('API Error:', err.message);
        }
    } else {
        console.log('FAILED to find any valid seeds without negative budgets in 5,000 attempts! Constraints too tight.');
    }
}

findPerfectSeed().catch(console.error);
