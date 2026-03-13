import React from 'react';
import { formatPts } from '../../utils/budgetCalc.js';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TeamLogo from '../shared/TeamLogo.jsx';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { motion, AnimatePresence } from 'framer-motion';

export default function BidDisplay({ currentBid, teams, player, size = 'normal' }) {
  const isBig = size === 'big';
  const leadingTeam = currentBid?.teamId ? teams?.[currentBid.teamId] : null;
  const amount = currentBid?.amount;
  const hasBid = !!currentBid?.teamId;

  return (
    <Paper sx={{ p: isBig ? { xs: '0.8rem 1rem', md: '1.25rem 1.75rem' } : { xs: '0.5rem 0.75rem', sm: '1rem 1.25rem' }, textAlign: 'center', bgcolor: 'background.default', borderRadius: isBig ? 2 : 1 }}>
      <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: '0.1em', fontSize: isBig ? '0.8rem' : { xs: '0.6rem', sm: '0.75rem' }, fontWeight: 800, mb: 0.5, display: 'block' }}>
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
            variant={isBig ? "h5" : "h4"}
            fontWeight={950}
            sx={{
              color: hasBid ? (leadingTeam?.color || 'success.main') : 'primary.main',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              fontSize: isBig ? { xs: '1.25rem', md: '1.5rem' } : { xs: '1.4rem', sm: '2.125rem' }, // h4 is usually 2.125rem
              textShadow: isBig ? `0 0 10px ${hasBid ? (leadingTeam?.color || 'success.main') : 'primary.main'}20` : 'none'
            }}
          >
            {formatPts(amount || player?.basePrice)}
          </Typography>
        </motion.div>
      </AnimatePresence>
      <Box sx={{ minHeight: isBig ? 56 : { xs: 24, sm: 40 }, mt: { xs: 0.5, sm: 1 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {hasBid && leadingTeam && (
          <Chip
            icon={<TeamLogo team={leadingTeam} size={isBig ? 32 : { xs: 16, sm: 20 }} border={false} />}
            label={leadingTeam.name}
            size={isBig ? "big" : "small"}
            color="success"
            variant="outlined"
            sx={{ 
              fontWeight: 900, 
              borderColor: leadingTeam?.color || 'success.main',
              color: leadingTeam?.color || 'success.main',
              fontSize: isBig ? '1rem' : { xs: '0.65rem', sm: '0.8rem' },
              px: isBig ? 1.5 : 0,
              py: isBig ? 2.5 : 0,
              borderRadius: isBig ? 3 : 2,
              height: isBig ? 40 : { xs: 20, sm: 24 },
              '& .MuiChip-icon': {
                color: leadingTeam?.color || 'success.main'
              }
            }}
          />
        )}
        {!hasBid && (
          <Typography variant={isBig ? "body1" : "caption"} color="text.disabled" fontWeight={700} sx={{ fontSize: { xs: '0.65rem', sm: 'inherit' } }}>
            No bids yet
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
