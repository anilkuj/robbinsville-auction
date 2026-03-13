import React from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import { formatPts } from '../../utils/budgetCalc.js';
import { poolColor } from '../../theme.js';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlayerCard({ player, size = 'normal' }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isBig = size === 'big';
  if (!player) {
    return (
      <Card variant="outlined" sx={{ borderStyle: 'dashed', textAlign: 'center', p: isBig ? 6 : 3, bgcolor: isDark ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
        <Typography color={isDark ? "text.disabled" : "text.secondary"} variant={isBig ? "h4" : "body1"} fontWeight={600}>
          Waiting for next player…
        </Typography>
      </Card>
    );
  }

  const color = poolColor(player.pool);

  return (
    <Card sx={{
      border: '1px solid',
      borderColor: isBig ? `${color}80` : `${color}40`,
      boxShadow: isBig ? `0 0 40px ${color}40` : `0 0 24px ${color}20`,
      borderTop: `${isBig ? '5px' : '3px'} solid ${color}`,
      transition: 'all 0.3s ease',
      bgcolor: 'background.paper',
    }}>
      <CardContent sx={{ position: 'relative', py: { xs: 1, sm: isBig ? 2 : 2 }, px: { xs: 1.5, sm: isBig ? 1.5 : 2 } }}>
        <Box sx={{ mb: { xs: 0.5, sm: isBig ? 3 : 1 } }}>
          <Chip
            label={`POOL ${player.pool}`}
            size={isBig ? 'medium' : 'small'}
            sx={{ 
                bgcolor: color, 
                color: '#fff', 
                fontWeight: 900, 
                fontSize: { xs: '0.6rem', sm: isBig ? '1rem' : '0.7rem' },
                px: { xs: 0.25, sm: isBig ? 1.5 : 0.5 },
                height: { xs: 18, sm: 'auto' },
                boxShadow: isBig ? `0 0 20px ${color}` : 'none'
            }}
          />
        </Box>
        <Typography variant={isBig ? 'h6' : 'h6'} fontWeight={950} sx={{ 
            lineHeight: 1.1, 
            mb: { xs: 0.25, sm: isBig ? 0.75 : 0.5 }, 
            textTransform: 'uppercase',
            letterSpacing: isBig ? '0.01em' : 'normal',
            textShadow: isBig && isDark ? `0 0 10px ${color}30` : 'none',
            fontSize: { xs: '0.95rem', sm: isBig ? '1.3rem' : '1.1rem' },
            color: 'text.primary'
        }}>
          {player.name}
        </Typography>
        <Typography variant="caption" color={isDark ? "text.secondary" : "text.primary"} sx={{ fontWeight: 800, fontSize: { xs: '0.65rem', sm: '0.75rem' }, letterSpacing: '0.02em' }}>
          BASE PRICE:{' '}
          <Box component="span" sx={{ color: color, fontWeight: 950, fontSize: { xs: '0.9rem', sm: isBig ? '1.05rem' : '1.1rem' }, ml: 1, textShadow: !isDark ? `0 1px 2px ${alpha(color, 0.2)}` : 'none' }}>
            {formatPts(player.basePrice)}
          </Box>
        </Typography>

        {/* SOLD Stamp Animation */}
        <AnimatePresence>
          {player.status === 'SOLD' && (
            <motion.div
              initial={{ scale: 3, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: -15 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '60%',
                transform: 'translate(-50%, -50%) rotate(-15deg)',
                color: '#ef4444',
                fontSize: isBig ? '2rem' : '1.5rem',
                border: isBig ? '5px solid #ef4444' : '3px solid #ef4444',
                padding: '4px 12px',
                fontWeight: 900,
                textTransform: 'uppercase',
                pointerEvents: 'none',
                backgroundColor: isDark ? alpha('#fff', 0.9) : alpha(theme.palette.background.paper, 0.95),
                boxShadow: isDark ? '0 8px 24px rgba(239, 68, 68, 0.5)' : '0 4px 12px rgba(239, 68, 68, 0.2)',
                zIndex: 10
              }}
            >
              SOLD
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
