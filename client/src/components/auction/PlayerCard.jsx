import React from 'react';
import { formatPts } from '../../utils/budgetCalc.js';
import { poolColor } from '../../theme.js';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

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
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
