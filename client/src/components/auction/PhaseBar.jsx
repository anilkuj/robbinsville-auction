import { motion } from 'framer-motion';
import { useTheme, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

export default function PhaseBar({ phase, size = 'normal' }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isBig = size === 'big';
    
    const labels = {
        SETUP: { text: 'AUCTION SETUP', color: 'text.secondary', bg: isDark ? 'rgba(255,255,255,0.05)' : alpha(theme.palette.text.primary, 0.03) },
        LIVE: { text: '● LIVE AUCTION', color: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.1) },
        PAUSED: { text: '⏸ AUCTION PAUSED', color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.1) },
        ENDED: { text: 'AUCTION ENDED', color: 'text.disabled', bg: isDark ? 'rgba(255,255,255,0.05)' : alpha(theme.palette.text.primary, 0.03) },
    };
    
    const cfg = labels[phase] || labels.SETUP;
    
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', py: isBig ? 1 : 0.5 }}>
            <motion.div
                key={phase}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Paper sx={{ 
                    px: isBig ? 2 : 1.5, 
                    py: isBig ? 0.65 : 0.5, 
                    bgcolor: cfg.bg, 
                    border: '1px solid currentColor', 
                    borderColor: 'divider',
                    color: cfg.color,
                    borderRadius: isBig ? 16 : 10,
                    fontSize: isBig ? '0.7rem' : '0.65rem',
                    fontWeight: 1000,
                    letterSpacing: '0.1em'
                }}>
                    {cfg.text}
                </Paper>
            </motion.div>
        </Box>
    );
}
