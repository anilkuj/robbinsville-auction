import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export default function PlayerExtraData({ player, visibleKeys = [], size = 'normal' }) {
    const isBig = size === 'big';
    if (!player?.extra) return null;

    // Default fallback to all columns if visibleKeys is not configured or empty
    let entries = Object.entries(player.extra).filter(([, v]) => v);
    if (visibleKeys.length > 0) {
        entries = entries.filter(([k]) => visibleKeys.includes(k));
    }

    if (entries.length === 0) return null;

    return (
        <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
                xs: '1fr', 
                sm: entries.length > 2 ? 'repeat(2, 1fr)' : '1fr', 
                md: `repeat(${Math.min(entries.length, isBig ? 3 : 4)}, 1fr)` 
            }, 
            gap: isBig ? 3 : 1.5 
        }}>
            {entries.map(([k, v]) => (
                <Paper key={k} sx={{ 
                    p: isBig ? 3 : 2, 
                    bgcolor: 'rgba(30, 41, 59, 0.4)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid',
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: isBig ? 3 : 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    '&:hover': {
                        bgcolor: 'rgba(30, 41, 59, 0.6)',
                        borderColor: 'primary.main',
                        transform: 'translateY(-2px)'
                    }
                }}>
                    <Typography variant="caption" sx={{ 
                        color: 'text.disabled', 
                        textTransform: 'uppercase', 
                        letterSpacing: isBig ? '0.1em' : '0.1em', 
                        fontWeight: 900, 
                        fontSize: isBig ? '0.62rem' : '0.65rem',
                        mb: 0.5
                    }}>
                        {k}
                    </Typography>
                    <Typography variant={isBig ? "body2" : "body1"} sx={{ 
                        fontWeight: 950, 
                        color: 'primary.main', // All Orange as requested
                        lineHeight: 1.1,
                        fontSize: isBig ? '0.9rem' : 'inherit',
                        textShadow: isBig ? '0 0 8px rgba(245, 158, 11, 0.15)' : 'none'
                    }}>
                        {v}
                    </Typography>
                </Paper>
            ))}
        </Box>
    );
}
