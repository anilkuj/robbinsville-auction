import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export default function PlayerExtraData({ player, visibleKeys = [] }) {
    if (!player?.extra) return null;

    // Default fallback to all columns if visibleKeys is not configured or empty
    let entries = Object.entries(player.extra).filter(([, v]) => v);
    if (visibleKeys.length > 0) {
        entries = entries.filter(([k]) => visibleKeys.includes(k));
    }

    if (entries.length === 0) return null;

    return (
        <Paper sx={{ overflow: 'hidden', display: 'grid', gridTemplateColumns: `repeat(${Math.min(entries.length, 4)}, 1fr)` }}>
            {entries.map(([k, v], i) => (
                <Box key={k} sx={{ p: '0.65rem 1rem', borderLeft: i > 0 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, mb: 0.5 }}>
                        {k}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>{v}</Typography>
                </Box>
            ))}
        </Paper>
    );
}
