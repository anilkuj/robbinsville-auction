import React from 'react';
import { formatPts } from '../../utils/budgetCalc.js';
import { poolColor } from '../../theme.js';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlayerCard({ player }) {
  if (!player) {
    return (
      <Card variant="outlined" sx={{ borderStyle: 'dashed', textAlign: 'center', p: 3 }}>
        <Typography color="text.disabled">Waiting for next player…</Typography>
      </Card>
    );
  }

  const color = poolColor(player.pool);

  return (
    <Card sx={{
      border: '1px solid',
      borderColor: `${color}40`,
      boxShadow: `0 0 24px ${color}20`,
      borderTop: `3px solid ${color}`,
    }}>
      <CardContent sx={{ position: 'relative' }}>
        <Box sx={{ mb: 1 }}>
          <Chip
            label={`POOL ${player.pool}`}
            size="small"
            sx={{ bgcolor: color, color: '#fff', fontWeight: 700, fontSize: '0.7rem' }}
          />
        </Box>
        <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.2, mb: 0.5 }}>
          {player.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Base Price:{' '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
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
                border: '4px solid #ef4444',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '2rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                pointerEvents: 'none',
                backgroundColor: 'rgba(255,255,255,0.8)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
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
