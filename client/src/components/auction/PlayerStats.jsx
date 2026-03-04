import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function PlayerStats({ players }) {
    if (!players) return null;

    const sold = players.filter(p => p.status === 'SOLD').length;
    const unsold = players.filter(p => p.status === 'UNSOLD').length;
    const remaining = players.filter(p => !['SOLD', 'UNSOLD'].includes(p.status)).length;

    const StatItem = ({ label, count, color }) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color, fontWeight: 800, lineHeight: 1 }}>
                {count}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                {label}
            </Typography>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center', pr: 2 }}>
            <StatItem label="Sold" count={sold} color="success.main" />
            <StatItem label="Remaining" count={remaining} color="info.main" />
            <StatItem label="Unsold" count={unsold} color="error.main" />
        </Box>
    );
}
