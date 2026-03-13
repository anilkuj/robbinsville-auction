import React, { useEffect, useRef } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

const getEventStyle = (type, theme) => {
    const styles = {
        playerUp: { color: theme.palette.info.main, bgcolor: alpha(theme.palette.info.main, 0.15), icon: '🏏' },
        bidPlaced: { color: theme.palette.warning.main, bgcolor: alpha(theme.palette.warning.main, 0.15), icon: '💰' },
        sold: { color: theme.palette.success.main, bgcolor: alpha(theme.palette.success.main, 0.15), icon: '🔨' },
        unsold: { color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.15), icon: '⚪' },
        paused: { color: theme.palette.secondary.main, bgcolor: alpha(theme.palette.secondary.main, 0.1), icon: '⏸' },
        resumed: { color: theme.palette.secondary.main, bgcolor: alpha(theme.palette.secondary.main, 0.1), icon: '▶' },
        manualSale: { color: theme.palette.secondary.dark, bgcolor: alpha(theme.palette.secondary.dark, 0.1), icon: '🤝' },
    };
    return styles[type] || { color: theme.palette.text.disabled, bgcolor: 'transparent', icon: '•' };
};

export default function CommentaryFeed({ commentary = [] }) {
    const theme = useTheme();
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
            bgcolor: 'background.default'
        }}>
            {commentary.map((msg, idx) => {
                if (!msg || !msg.type) return null;
                const style = getEventStyle(msg.type, theme);
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
                                color: 'text.primary',
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
