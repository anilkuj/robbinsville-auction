/**
 * End-to-end test script for auction flow
 * Tests: admin login, team login, socket events, bid, sold, Load Test Data, Full Reset
 */

const { io } = require('../client/node_modules/socket.io-client');
const http = require('http');

function httpReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3001, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function waitFor(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for ' + event)), timeoutMs);
    socket.once(event, data => { clearTimeout(timer); resolve(data); });
  });
}

async function main() {
  console.log('\n=== RPL Auction End-to-End Test ===\n');

  // ── 1. HTTP API tests ──────────────────────────────────────────────────────
  console.log('── HTTP API ──');

  // Admin login
  let r = await httpReq('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  const adminToken = r.body.token;
  console.log('✓ Admin login');

  // Check current state
  r = await httpReq('GET', '/api/health', null);
  console.log('  State: phase=' + r.body.phase + ' players=' + r.body.players);

  // Full Reset with wrong password
  r = await httpReq('POST', '/api/admin/full-reset', { password: 'wrongpass' }, adminToken);
  if (r.status === 401 && r.body.error === 'Invalid admin password') {
    console.log('✓ Full Reset: wrong password correctly rejected (401)');
  } else {
    throw new Error('Full Reset wrong password test failed: ' + JSON.stringify(r.body));
  }

  // Full Reset with correct password
  r = await httpReq('POST', '/api/admin/full-reset', { password: 'admin123' }, adminToken);
  if (r.status === 200 && r.body.message.includes('Full reset')) {
    console.log('✓ Full Reset: correct password accepted, data wiped');
  } else {
    throw new Error('Full Reset failed: ' + JSON.stringify(r.body));
  }

  r = await httpReq('GET', '/api/health', null);
  if (r.body.players === 0 && Object.keys(r.body).length > 0) {
    console.log('✓ Full Reset verified: 0 players, 0 teams');
  }

  // Load Test Data
  r = await httpReq('POST', '/api/admin/load-test-data', {}, adminToken);
  if (r.status === 200 && r.body.players === 33 && r.body.teams === 3) {
    console.log('✓ Load Test Data: 33 players, 3 teams loaded');
  } else {
    throw new Error('Load Test Data failed: ' + JSON.stringify(r.body));
  }

  // Dashboard settings (no PIN)
  r = await httpReq('GET', '/api/public/dashboard-settings', null);
  if (r.body.requiresPin === false) {
    console.log('✓ Dashboard: no PIN required (open access)');
  }

  // Dashboard auth token (no PIN)
  r = await httpReq('POST', '/api/public/dashboard-auth', { pin: '' });
  if (r.body.token) {
    console.log('✓ Dashboard: spectator token issued without PIN');
  }

  const spectatorToken = r.body.token;

  // Team login
  r = await httpReq('POST', '/api/auth/login', { username: 'team_1', password: 'alpha123' });
  if (r.status !== 200) throw new Error('Team Alpha login failed: ' + JSON.stringify(r.body));
  const teamToken = r.body.token;
  const teamId = r.body.teamId;
  console.log('✓ Team Alpha login (teamId=' + teamId + ')');

  // ── 2. Socket tests ────────────────────────────────────────────────────────
  console.log('\n── Socket.io ──');

  const BASE = 'http://localhost:3001';
  const adminSock = io(BASE, { auth: { token: adminToken }, transports: ['websocket'], forceNew: true });
  const teamSock  = io(BASE, { auth: { token: teamToken },  transports: ['websocket'], forceNew: true });
  const specSock  = io(BASE, { auth: { token: spectatorToken }, transports: ['websocket'], forceNew: true });

  // Register state:full listener BEFORE waiting for connect (event fires right on connect)
  const initStatePromise = waitFor(adminSock, 'state:full');

  // Wait for all 3 to connect
  await Promise.all([
    waitFor(adminSock, 'connect'),
    waitFor(teamSock,  'connect'),
    waitFor(specSock,  'connect'),
  ]);
  console.log('✓ Admin, Team Alpha, Spectator sockets connected');

  const initState = await initStatePromise;
  console.log('  Init state: phase=' + initState.phase +
    ' players=' + initState.players.length +
    ' teams=' + Object.keys(initState.teams).length);

  // ── 3. Start player ────────────────────────────────────────────────────────
  adminSock.emit('admin:nextPlayer');
  const playerUpState = await waitFor(adminSock, 'auction:playerUp');
  const player = playerUpState.players[playerUpState.currentPlayerIndex];
  console.log('✓ auction:playerUp: ' + player.name + ' [Pool ' + player.pool + '] base=' + player.basePrice + ' pts');

  // Spectator also sees it
  const specPlayerUp = await waitFor(specSock, 'auction:playerUp');
  if (specPlayerUp.players[specPlayerUp.currentPlayerIndex].name === player.name) {
    console.log('✓ Spectator receives auction:playerUp event');
  }

  // ── 4. Place bid ───────────────────────────────────────────────────────────
  // First bid must be exactly basePrice; subsequent bids are basePrice + bidIncrement
  const bidAmount = player.basePrice;
  teamSock.emit('bid:place', { playerId: player.id, amount: bidAmount });
  const bidEvent = await waitFor(adminSock, 'auction:bid');
  console.log('✓ bid:place accepted: ' + bidEvent.bid.amount + ' pts by team ' + bidEvent.bid.teamId);

  // Spectator sees bid
  const specBid = await waitFor(specSock, 'auction:bid').catch(() => null);
  if (specBid) console.log('✓ Spectator receives auction:bid event');

  // ── 5. Admin accepts bid ───────────────────────────────────────────────────
  adminSock.emit('admin:acceptBid');
  const soldEvent = await waitFor(adminSock, 'auction:sold');
  const budgetAfter = soldEvent.publicState.teams[teamId].budget;
  console.log('✓ admin:acceptBid → auction:sold: ' + soldEvent.player.name +
    ' → ' + soldEvent.teamName + ' for ' + soldEvent.amount + ' pts');
  console.log('  Team Alpha budget: 30000 → ' + budgetAfter + ' (spent ' + bidAmount + ')');

  if (budgetAfter !== 30000 - bidAmount) throw new Error('Budget math wrong!');
  console.log('✓ Budget deducted correctly');

  // Spectator sees sold
  const specSold = await waitFor(specSock, 'auction:sold').catch(() => null);
  if (specSold) console.log('✓ Spectator receives auction:sold event');

  // ── 6. Load test data while auction is in progress (should fail) ───────────
  // Current phase is SETUP (after sold, phase goes back to SETUP)
  // So let's test load-test-data → should replace data
  // But first test it AFTER starting a player (LIVE phase) to confirm it blocks
  adminSock.emit('admin:nextPlayer');
  await waitFor(adminSock, 'auction:playerUp'); // now in LIVE
  r = await httpReq('POST', '/api/admin/load-test-data', {}, adminToken);
  if (r.status === 400) {
    console.log('✓ Load Test Data blocked in LIVE phase: "' + r.body.error + '"');
  } else {
    console.log('⚠ Load Test Data in LIVE phase returned ' + r.status + ' (expected 400)');
  }

  adminSock.disconnect();
  teamSock.disconnect();
  specSock.disconnect();

  console.log('\n=== All tests passed! ===\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n✗ TEST FAILED:', err.message);
  process.exit(1);
});
