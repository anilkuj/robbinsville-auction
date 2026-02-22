/**
 * Populate test data: 3 teams × 11 players, 3 pools (A/B/C), starting budget 30000
 *
 * Usage:  node scripts/populate-test-data.js
 *
 * Requires the server to be running on http://localhost:3001
 * Admin password defaults to 'admin123' — override with ADMIN_PASSWORD env var
 */

const BASE_URL = 'http://localhost:3001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const CSV = `name,pool
MS Dhoni,A
Virat Kohli,A
Rohit Sharma,A
AB de Villiers,A
Steve Smith,A
Joe Root,A
Ben Stokes,A
Jasprit Bumrah,A
Pat Cummins,A
Rashid Khan,A
Babar Azam,A
KL Rahul,B
Hardik Pandya,B
Rishabh Pant,B
David Warner,B
Kane Williamson,B
Trent Boult,B
Ravindra Jadeja,B
Andre Russell,B
Suryakumar Yadav,B
Mitchell Starc,B
Glenn Maxwell,B
Shubman Gill,C
Faf du Plessis,C
Quinton de Kock,C
Ishan Kishan,C
Shardul Thakur,C
Yuzvendra Chahal,C
Kuldeep Yadav,C
Bhuvneshwar Kumar,C
Deepak Chahar,C
Avesh Khan,C
Washington Sundar,C`;

async function main() {
  console.log('Connecting to server at', BASE_URL, '…\n');

  // 1. Login as admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.json().catch(() => ({}));
    throw new Error(`Login failed: ${err.error || loginRes.status}`);
  }
  const { token } = await loginRes.json();
  console.log('✓ Admin login successful');

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. Save league config
  const leagueRes = await fetch(`${BASE_URL}/api/admin/league-config`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      leagueConfig: {
        numTeams: 3,
        squadSize: 11,
        startingBudget: 30000,
        minBid: 500,
        pools: [
          { id: 'A', label: 'A', basePrice: 3000, count: 11 },
          { id: 'B', label: 'B', basePrice: 2000, count: 11 },
          { id: 'C', label: 'C', basePrice: 1000, count: 11 },
        ],
      },
      teams: {
        team_1: { name: 'Team Alpha', password: 'alpha123' },
        team_2: { name: 'Team Beta',  password: 'beta123'  },
        team_3: { name: 'Team Gamma', password: 'gamma123' },
      },
    }),
  });
  const leagueData = await leagueRes.json();
  if (!leagueRes.ok) throw new Error('League config failed: ' + JSON.stringify(leagueData));
  console.log('✓ League config saved — 3 teams, 30000 budget, pools A/B/C');

  // 3. Import players as CSV (multipart)
  const formData = new FormData();
  formData.append('file', new Blob([CSV], { type: 'text/csv' }), 'players.csv');

  const importRes = await fetch(`${BASE_URL}/api/admin/import-players`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // no Content-Type — let fetch set multipart boundary
    body: formData,
  });
  const importData = await importRes.json();
  if (!importRes.ok) throw new Error('Player import failed: ' + JSON.stringify(importData));
  console.log(`✓ ${importData.count} players imported (11 per pool)`);

  console.log('\n✅ Test data ready!\n');
  console.log('  Teams & passwords:');
  console.log('    Team Alpha  →  alpha123');
  console.log('    Team Beta   →  beta123');
  console.log('    Team Gamma  →  gamma123');
  console.log('\n  Pool base prices:');
  console.log('    Pool A  →  3000 pts  (MS Dhoni, Virat Kohli, …)');
  console.log('    Pool B  →  2000 pts  (KL Rahul, Hardik Pandya, …)');
  console.log('    Pool C  →  1000 pts  (Shubman Gill, Faf du Plessis, …)');
  console.log('\n  To reset back to a clean slate, use ☠ Full Reset in Admin → Exports & Reset\n');
}

main().catch(err => {
  console.error('\n✗', err.message);
  process.exit(1);
});
