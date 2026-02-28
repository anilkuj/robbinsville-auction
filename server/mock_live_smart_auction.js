require('dotenv').config();
// We won't require the backend 'state' or 'auction' modules so we don't accidentally mutate local process memory.
// Instead, we manipulate the fetched JSON state perfectly and submit it back via API.
function computeMaxBid(budget, currentRosterSize, maxRosterSize) {
    const spotsRemaining = maxRosterSize - currentRosterSize;
    if (spotsRemaining <= 0) return 0;
    if (spotsRemaining === 1) return budget;
    // Reserve exactly 1000 per spot to ensure later players are affordable
    let computedMax = budget - ((spotsRemaining - 1) * 1000);
    // User requested absolute cap of 15,000 per player to maintain balanced teams
    return Math.min(15000, computedMax);
}

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

async function simulateSmartLiveAuction() {
    console.log('Logging in as admin to fetch state...');
    const loginRes = await fetchJSON('/auth/login', 'POST', { username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
    if (loginRes.status !== 200) {
        throw new Error('Failed to log in: ' + JSON.stringify(loginRes.body));
    }
    const token = loginRes.body.token;

    console.log('Fetching live state from server...');
    const stateRes = await fetchJSON('/admin/export-state', 'GET', null, token);
    if (stateRes.status !== 200) {
        throw new Error('Failed to fetch state: ' + JSON.stringify(stateRes.body));
    }
    const state = stateRes.body;

    console.log('--- INITIALIZING LIVE SMART SIMULATION ---');
    console.log(`Loaded ${state.players.length} players, ${Object.keys(state.teams).length} teams.`);

    const squadSize = state.leagueConfig.squadSize || 12;
    const minBid = state.leagueConfig.minBid || 100;
    const basePrices = {};
    for (const p of state.leagueConfig.pools || []) {
        basePrices[p.id] = p.basePrice || 1000;
    }

    const numTeams = Object.keys(state.teams).length || 10;
    let soldCount = 0;
    console.log('--- STARTING SMART BIDDING ---');

    function simulateBidding(player) {
        let currentAmount = player.basePrice || basePrices[player.pool] || minBid;
        let currentWinningTeam = null;
        let history = [];

        const teams = Object.values(state.teams);
        // Only consider teams that still have spots AND can afford the minBid
        let activeBidders = teams.filter(t => {
            const needed = squadSize - (t.roster?.length || 0);
            if (needed <= 0) return false;
            return computeMaxBid(t.budget, t.roster?.length || 0, squadSize) >= minBid;
        }).map(t => t.id);

        // If no active bidders technically afford it safely, we'll skip sequence bidding and jump to fallback
        if (activeBidders.length > 0) {
            // Balanced aggressive bidding: 1 to 30 bids
            let sequenceBids = Math.floor(Math.random() * 30) + 1;

            for (let i = 0; i < sequenceBids; i++) {
                const eligibleBidders = activeBidders.filter(teamId => {
                    if (teamId === currentWinningTeam) return false;
                    const t = state.teams[teamId];

                    const needed = squadSize - (t.roster?.length || 0);
                    if (needed <= 0) return false;

                    const maxBid = computeMaxBid(t.budget, t.roster?.length || 0, squadSize);

                    // Very intelligent caps to use up budget smartly, up to 90% of max bid capacity
                    // And explicitly cut off any bidding that approaches 15k limit
                    if (currentAmount >= 15000) return false;
                    if (currentAmount > maxBid * 0.90) return false;

                    return maxBid >= (currentAmount + (i === 0 ? 0 : minBid));
                });

                if (eligibleBidders.length === 0) break;

                const bidder = eligibleBidders[Math.floor(Math.random() * eligibleBidders.length)];
                currentWinningTeam = bidder;
                currentAmount += (i === 0 ? 0 : minBid);
                history.push({ amount: currentAmount, teamId: bidder, time: Date.now() });
            }
        }

        if (!currentWinningTeam) {
            // Force the team with the smallest roster to buy at base price if they can afford it
            const capable = teams.filter(t => {
                const needed = squadSize - (t.roster?.length || 0);
                if (needed <= 0) return false;
                const maxBid = computeMaxBid(t.budget, t.roster?.length || 0, squadSize);
                return maxBid >= (player.basePrice || basePrices[player.pool] || minBid);
            });

            if (capable.length > 0) {
                // To ensure all players are sold, prioritize the team with the highest remaining budget
                capable.sort((a, b) => b.budget - a.budget);
                currentWinningTeam = capable[0].id;
                const finalAmt = player.basePrice || basePrices[player.pool] || minBid;
                state.currentBid = { amount: finalAmt, teamId: currentWinningTeam, history: [{ amount: finalAmt, teamId: currentWinningTeam, time: Date.now() }] };
                return true;
            } else {
                // ULTIMATE FALLBACK: Buy anyway even if it violates strict budget reserves to guarantee 100% sold rate
                const incomplete = teams.filter(t => (squadSize - (t.roster?.length || 0)) > 0);
                if (incomplete.length > 0) {
                    incomplete.sort((a, b) => b.budget - a.budget);
                    currentWinningTeam = incomplete[0].id;
                    const finalAmt = player.basePrice || basePrices[player.pool] || minBid;
                    state.currentBid = { amount: finalAmt, teamId: currentWinningTeam, history: [{ amount: finalAmt, teamId: currentWinningTeam, time: Date.now() }] };
                    return true;
                } else {
                    console.warn(`[!] EVERY TEAM IS FULL! Could not sell ${player.name} at base ${player.basePrice || basePrices[player.pool] || minBid}.`);
                    return false;
                }
            }
        }

        state.currentBid = { amount: currentAmount, teamId: currentWinningTeam, history };
        return true;
    }

    // Run until all pending players are processed
    let safetyCounter = 0;
    while (safetyCounter < 2000) {
        safetyCounter++;
        let idx = -1;
        // find next pending player (skip owners if they are already sold, or if they are magically pending)
        for (let i = 0; i < state.players.length; i++) {
            if (state.players[i].status === 'PENDING') {
                idx = i;
                break;
            }
        }

        if (idx === -1) break; // done

        state.currentPlayerIndex = idx;
        const player = state.players[idx];

        // Ensure starting currentBid is clean before proceeding
        state.currentBid = { amount: 0, teamId: null, history: [] };

        const sold = simulateBidding(player);

        // Inline pure "processSold" logic
        if (sold) {
            const wTeamId = state.currentBid.teamId;
            const wAmt = state.currentBid.amount;

            player.status = 'SOLD';
            player.soldTo = wTeamId;
            player.soldFor = wAmt;

            const wTeam = state.teams[wTeamId];
            wTeam.budget -= wAmt;
            wTeam.roster = wTeam.roster || [];
            wTeam.roster.push({
                playerId: player.id,
                playerName: player.name,
                pool: player.pool,
                price: wAmt,
            });

            state.lastSoldPlayerId = player.id;
            soldCount++;
        } else {
            player.status = 'UNSOLD';
            state.unsoldPlayers = state.unsoldPlayers || [];
            state.unsoldPlayers.push(player.id);
        }
    }

    console.log(`\n--- AUCTION COMPLETE: ${soldCount} players processed ---`);

    for (const team of Object.values(state.teams)) {
        console.log(`\n[${team.name}] Budget: ${team.budget} / ${state.leagueConfig.startingBudget} pts, Roster: ${(team.roster || []).length}/${squadSize}`);
    }

    console.log('\n--- PUSHING FINAL STATE TO RUNNING SERVER ---');
    try {
        console.log('Logging in as admin...');
        const loginRes = await fetchJSON('/auth/login', 'POST', { username: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
        if (loginRes.status !== 200) {
            throw new Error('Failed to log in: ' + JSON.stringify(loginRes.body));
        }
        const token = loginRes.body.token;

        console.log('Sending /admin/import-state request...');
        const importRes = await fetchJSON('/admin/import-state', 'POST', { password: process.env.ADMIN_PASSWORD || 'admin123', state: state }, token);

        if (importRes.status === 200) {
            console.log('SUCCESS! State is now live on the app.');
        } else {
            throw new Error('Failed to push state: ' + JSON.stringify(importRes.body));
        }
    } catch (err) {
        console.error('API Error:', err.message);
    }
}

simulateSmartLiveAuction().catch(console.error);
