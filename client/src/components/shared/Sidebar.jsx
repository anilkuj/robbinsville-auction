import React from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import rplLogo from '../../assets/rpl-logo.jpg';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { formatPts } from '../../utils/budgetCalc.js';
import TeamLogo from './TeamLogo.jsx';
import { poolColor } from '../../theme.js';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LogoutIcon from '@mui/icons-material/Logout';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle.jsx';

export default function Sidebar({ width, isDrawer = false }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user, logout } = useAuth();
  const { auctionState, connected } = useAuction();

  const team = auctionState?.teams?.[user?.teamId];
  const squadSize = auctionState?.leagueConfig?.squadSize ?? 18;
  const roster = team?.roster ?? [];
  const currentBid = auctionState?.currentBid;

  const isLeading = currentBid?.teamId === user?.teamId;
  const currentBidAmount = isLeading ? (currentBid?.amount || 0) : 0;
  const auctionContext = useAuction();
  const preparedBid = auctionState?.preparedBid || auctionContext?.preparedBid || 0;
  const pendingSpend = isLeading ? currentBidAmount : (team && preparedBid > 0 ? preparedBid : 0);
  const effectiveRemaining = team ? (team.budget || 0) - pendingSpend : 0;

  return (
    <Paper
      square
      elevation={0}
      sx={{
        width: width ?? (isDrawer ? '100%' : 240),
        height: '100%',
        flexShrink: 0,
        borderRight: isDrawer ? 'none' : '1px solid',
        borderColor: 'divider',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, pb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <Box 
            component="img" 
            src={rplLogo} 
            sx={{ height: 60, width: 'auto', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} 
          />
        </motion.div>
        <Box sx={{ textAlign: 'center' }}>
          <Typography fontWeight={950} sx={{ letterSpacing: '0.05em', fontSize: '1.2rem', lineHeight: 1.1, color: 'primary.main' }}>
            RPL 2026
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6 }}>
            AUCTION SYSTEM
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, pt: 1, my: 1 }}>
        {team && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderTop: `4px solid ${team.color || '#3b82f6'}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <TeamLogo team={team} size={28} border={false} />
              <Typography fontWeight={700} sx={{ color: team.color || 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {team.name}
              </Typography>
            </Box>

            <Typography variant="overline" color="text.disabled" display="block" sx={{ mt: 1.5 }}>Budget Remaining</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography fontWeight={800} color={pendingSpend > 0 ? 'warning.main' : 'success.main'} fontSize="1.1rem">
                {formatPts(effectiveRemaining)}
              </Typography>
              {pendingSpend > 0 && (
                <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600, fontSize: '0.75rem' }}>
                  (-{formatPts(pendingSpend)})
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 2 }}>
              <Box sx={{ height: 8, display: 'flex', borderRadius: 4, overflow: 'hidden', bgcolor: 'background.default', mb: 0.75 }}>
                <Box sx={{ width: `${Math.min(100, (1 - (effectiveRemaining / (auctionState?.leagueConfig?.startingBudget || 1))) * 100)}%`, bgcolor: '#ef4444', opacity: 0.9 }} />
                <Box sx={{ width: `${Math.max(0, (effectiveRemaining / (auctionState?.leagueConfig?.startingBudget || 1)) * 100)}%`, bgcolor: '#16a34a', opacity: 0.9 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 900, fontSize: '0.7rem' }}>
                  {Math.round((1 - (effectiveRemaining / (auctionState?.leagueConfig?.startingBudget || 1))) * 100)}% SPENT
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {roster.length + (team.ownerIsPlayer ? (team.ownerPlayerIds || []).filter(oid => !roster.some(rp => rp.playerId === oid)).length : 0)} / {squadSize}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        {!team && user?.role === 'team' && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="overline" color="text.disabled">Team</Typography>
            <Typography fontWeight={700}>{user.name}</Typography>
          </Paper>
        )}

        {roster.length > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderTop: `4px solid ${team.color || '#3b82f6'}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TeamLogo team={team} size={24} border={false} />
              <Typography variant="overline" color="text.disabled" fontWeight={800}>My Squad</Typography>
            </Box>
            <List dense disablePadding sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {[...roster].sort((a,b) => (a.saleIndex || 0) - (b.saleIndex || 0)).map((r, i) => (
                <ListItem
                  key={r.playerId || i}
                  disablePadding
                  sx={{ borderTop: i > 0 ? '1px solid' : 'none', borderColor: 'divider', pt: i > 0 ? 0.5 : 0 }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{r.playerName}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
                      <Chip
                        label={r.pool}
                        size="small"
                        sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha(poolColor(r.pool), 0.2), color: poolColor(r.pool), fontWeight: 700 }}
                      />
                      <Typography variant="caption" color="success.main" fontWeight={700}>
                        {r.price.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>

      <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <FiberManualRecordIcon sx={{ fontSize: 10, color: connected ? 'success.main' : 'error.main' }} />
            <Typography variant="caption" color="text.disabled">{connected ? 'Live' : 'Reconnecting…'}</Typography>
          </Box>
          <ThemeToggle />
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          startIcon={<LogoutIcon />}
          onClick={logout}
          fullWidth
          sx={{ borderColor: 'divider', color: 'text.secondary' }}
        >
          Sign Out
        </Button>
      </Box>
    </Paper>
  );
}
