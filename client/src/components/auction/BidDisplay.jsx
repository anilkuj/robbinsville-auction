import React from 'react';
import { formatPts } from '../../utils/budgetCalc.js';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function BidDisplay({ currentBid, teams, player }) {
  const leadingTeam = currentBid?.teamId ? teams?.[currentBid.teamId] : null;
  const amount = currentBid?.amount;
  const hasBid = !!currentBid?.teamId;

  return (
    <Paper sx={{ p: '1rem 1.25rem', textAlign: 'center', bgcolor: 'background.default' }}>
      <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: '0.1em' }}>
        {hasBid ? 'Highest Bid' : 'Opening Bid'}
      </Typography>
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{
          color: hasBid ? 'success.main' : 'primary.main',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {formatPts(amount || player?.basePrice)}
      </Typography>
      {hasBid && leadingTeam && (
        <Chip
          icon={<EmojiEventsIcon sx={{ fontSize: '0.9rem !important' }} />}
          label={leadingTeam.name}
          size="small"
          color="success"
          variant="outlined"
          sx={{ mt: 0.75, fontWeight: 700 }}
        />
      )}
      {!hasBid && (
        <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
          No bids yet
        </Typography>
      )}
    </Paper>
  );
}
