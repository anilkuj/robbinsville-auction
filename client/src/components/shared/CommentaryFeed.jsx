import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';

const EVENT_STYLES = {
    playerUp: { color: '#60a5fa', bgcolor: 'rgba(96, 165, 250, 0.1)', icon: '🏏' },
    bidPlaced: { color: '#fbbf24', bgcolor: 'rgba(251, 191, 36, 0.1)', icon: '💰' },
    sold: { color: '#34d399', bgcolor: 'rgba(52, 211, 153, 0.12)', icon: '🔨' },
    unsold: { color: '#f87171', bgcolor: 'rgba(248, 113, 113, 0.1)', icon: '⚪' },
    paused: { color: '#a78bfa', bgcolor: 'rgba(167, 139, 250, 0.1)', icon: '⏸' },
    resumed: { color: '#a78bfa', bgcolor: 'rgba(167, 139, 250, 0.1)', icon: '▶' },
    manualSale: { color: '#f472b6', bgcolor: 'rgba(244, 114, 182, 0.1)', icon: '🤝' },
};

export default function CommentaryFeed({ commentary = [] }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        if (commentary && commentary.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [commentary]);

    if (!Array.isArray(commentary) || commentary.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.disabled">Waiting for auction action...</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                    Real-time commentary will appear here once the auction starts.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            p: 2,
            height: '100%',
            overflowY: 'auto',
            bgcolor: '#0f172a'
        }}>
            {commentary.map((msg, idx) => {
                if (!msg || !msg.type) return null;
                const style = EVENT_STYLES[msg.type] || { color: '#94a3b8', bgcolor: 'transparent', icon: '•' };
                const timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();
                const time = isNaN(timestamp.getTime())
                    ? '--:--:--'
                    : timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                    <Paper
                        key={msg.id || idx}
                        elevation={0}
                        sx={{
                            p: 1.5,
                            bgcolor: style.bgcolor,
                            borderLeft: `3px solid ${style.color}`,
                            borderRadius: '0 8px 8px 0',
                            animation: idx === 0 ? 'fadeIn 0.5s ease-out' : 'none',
                            '@keyframes fadeIn': {
                                from: { opacity: 0, transform: 'translateY(-10px)' },
                                to: { opacity: 1, transform: 'translateY(0)' }
                            }
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography fontSize="0.9rem">{style.icon}</Typography>
                                <Typography
                                    variant="caption"
                                    fontWeight={800}
                                    sx={{ color: style.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                >
                                    {msg.type.replace(/([A-Z])/g, ' $1')}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.disabled" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {time}
                            </Typography>
                        </Box>
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#f1f5f9',
                                lineHeight: 1.5,
                                fontWeight: msg.type === 'sold' ? 700 : 400,
                                fontSize: msg.type === 'sold' ? '0.95rem' : '0.875rem'
                            }}
                        >
                            {msg.message}
                        </Typography>
                    </Paper>
                );
            })}
            <div ref={bottomRef} />
        </Box>
    );
}
