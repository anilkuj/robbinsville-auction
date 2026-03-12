import React from 'react';
import { formatPts } from '../../utils/budgetCalc.js';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TeamLogo from '../shared/TeamLogo.jsx';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { motion, AnimatePresence } from 'framer-motion';

export default function BidDisplay({ currentBid, teams, player }) {
  const leadingTeam = currentBid?.teamId ? teams?.[currentBid.teamId] : null;
  const amount = currentBid?.amount;
  const hasBid = !!currentBid?.teamId;

  return (
    <Paper sx={{ p: '1rem 1.25rem', textAlign: 'center', bgcolor: 'background.default' }}>
      <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: '0.1em' }}>
        {hasBid ? 'Highest Bid' : 'Opening Bid'}
      </Typography>

      {/* Animated Bid Amount */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={amount || player?.basePrice}
          initial={{ y: 20, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
              color: hasBid ? (leadingTeam?.color || 'success.main') : 'primary.main',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {formatPts(amount || player?.basePrice)}
          </Typography>
        </motion.div>
      </AnimatePresence>
      {hasBid && leadingTeam && (
        <Chip
          icon={<TeamLogo team={leadingTeam} size={20} border={false} />}
          label={leadingTeam.name}
          size="small"
          color="success"
          variant="outlined"
          sx={{ 
            mt: 0.75, 
            fontWeight: 700, 
            borderColor: leadingTeam?.color || 'success.main',
            color: leadingTeam?.color || 'success.main',
            '& .MuiChip-icon': {
              color: leadingTeam?.color || 'success.main'
            }
          }}
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
