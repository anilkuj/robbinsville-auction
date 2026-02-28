const API_BASE = 'http://localhost:3001/api';

async function fetchJSON(endpoint, method = 'GET', body = null, token = null) {
    const headers = { 'Accept': 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const text = await res.text();

    return { status: res.status, body: JSON.parse(text) };
}

async function runMockAuction() {
    console.log('--- STARTING EXPRESS NATIVE MOCK AUCTION ---');

    console.log('[1] Logging in...');
    const adminRes = await fetchJSON('/auth/login', 'POST', { username: 'admin', password: 'admin123' });
    const adminToken = adminRes.body.token;

    console.log('[2] Resetting auction...');
    await fetchJSON('/admin/reset-auction', 'POST', { password: 'admin123', storagePreference: 'local' }, adminToken);

    console.log('[3] Triggering Native Simulation...');
    let simRes = await fetchJSON('/admin/mock-simulate', 'POST', {}, adminToken);

    const soldPlayer = simRes.body.player;
    console.log(`\n--- AUCTION RESULTS ---`);
    console.log(`Player: ${soldPlayer.name}`);
    console.log(`Status: ${soldPlayer.status}`);
    console.log(`Sold To: ${soldPlayer.soldTo === 'team_1' ? 'Team Alpha' : (soldPlayer.soldTo === 'team_2' ? 'Team Beta' : soldPlayer.soldTo)}`);
    console.log(`Sold For: ${soldPlayer.soldFor} pts`);

    console.log('\n--- SIMULATION SUCCESSFUL ---');
}

runMockAuction().catch(e => console.error('FAILED:', e.message));
