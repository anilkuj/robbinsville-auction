require('dotenv').config();
fetch('http://localhost:3001/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) })
    .then(r => r.json())
    .then(d => fetch('http://localhost:3001/api/admin/export-state', { headers: { Authorization: 'Bearer ' + d.token } }))
    .then(r => r.json())
    .then(s => {
        const a1s = s.players.filter(p => p.pool === 'A1').sort((a, b) => b.soldFor - a.soldFor);
        console.log('Top A1 Performers Bids:');
        a1s.slice(0, 10).forEach(p => {
            console.log(`- ${p.name} (Avg Points: ${p.extra?.Average_points}): ${p.soldFor} pts`);
        });
    });
