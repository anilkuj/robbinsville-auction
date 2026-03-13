import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function PlayerStats({ players }) {
    if (!players) return null;

    const sold = players.filter(p => p.status === 'SOLD').length;
    const unsold = players.filter(p => p.status === 'UNSOLD').length;
    const remaining = players.filter(p => !['SOLD', 'UNSOLD'].includes(p.status)).length;

    const StatItem = ({ label, count, color }) => (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            p: 1.5,
            minWidth: 90,
            borderRadius: 2,
            transition: 'all 0.2s',
            '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                transform: 'scale(1.05)'
            }
        }}>
            <Typography variant="h5" sx={{ color, fontWeight: 950, lineHeight: 1, mb: 0.5 }}>
                {count}
            </Typography>
            <Typography variant="caption" sx={{ 
                color: 'text.disabled', 
                fontWeight: 800, 
                fontSize: '0.75rem', 
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                {label}
            </Typography>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pr: 1 }}>
            <StatItem label="Sold" count={sold} color="success.light" />
            <StatItem label="Remaining" count={remaining} color="info.light" />
            <StatItem label="Unsold" count={unsold} color="error.light" />
        </Box>
    );
}
