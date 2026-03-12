import { motion } from 'framer-motion';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

export default function PhaseBar({ phase }) {
    const labels = {
        SETUP: { text: 'AUCTION SETUP', color: 'text.secondary', bg: 'rgba(255,255,255,0.05)' },
        LIVE: { text: '● LIVE AUCTION', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
        PAUSED: { text: '⏸ AUCTION PAUSED', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
        ENDED: { text: 'AUCTION ENDED', color: 'text.disabled', bg: 'rgba(255,255,255,0.05)' },
    };
    const cfg = labels[phase] || labels.SETUP;
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
            <motion.div
                key={phase}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Paper sx={{ 
                    px: 1.5, 
                    py: 0.5, 
                    bgcolor: cfg.bg, 
                    border: '1px solid currentColor', 
                    borderColor: 'divider',
                    color: cfg.color,
                    borderRadius: 10,
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    letterSpacing: '0.1em'
                }}>
                    {cfg.text}
                </Paper>
            </motion.div>
        </Box>
    );
}
