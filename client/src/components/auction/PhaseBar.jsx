import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

export default function PhaseBar({ phase }) {
    const labels = {
        SETUP: { text: 'Setup', color: 'default' },
        LIVE: { text: '● LIVE', color: 'success' },
        PAUSED: { text: '⏸ Paused', color: 'warning' },
        ENDED: { text: 'Ended', color: 'default' },
    };
    const cfg = labels[phase] || labels.SETUP;
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, mb: 0.5 }}>
            <Chip label={cfg.text} color={cfg.color} size="small" sx={{ fontWeight: 700 }} />

        </Box>
    );
}
