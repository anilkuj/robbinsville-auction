import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { formatPts } from '../../utils/budgetCalc.js';
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

export default function Sidebar({ width }) {
  const { user, logout } = useAuth();
  const { auctionState, connected } = useAuction();

  const team = auctionState?.teams?.[user?.teamId];
  const squadSize = auctionState?.leagueConfig?.squadSize ?? 18;
  const roster = team?.roster ?? [];
  const currentBid = auctionState?.currentBid;

  const isLeading = currentBid?.teamId === user?.teamId;
  const currentBidAmount = isLeading ? currentBid.amount : 0;
  const preparedBid = auctionState?.preparedBid || useAuction().preparedBid;
  const pendingSpend = isLeading ? currentBidAmount : (team && preparedBid > 0 ? preparedBid : 0);
  const effectiveRemaining = team ? team.budget - pendingSpend : 0;

  return (
    <Paper
      square
      sx={{
        width: width ?? 240,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
        bgcolor: 'background.paper',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <Typography fontWeight={800} color="primary" sx={{ textAlign: 'center', pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        🏏 RPL Auction
      </Typography>

      {team && (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Typography variant="overline" color="text.disabled">Your Team</Typography>
          <Typography fontWeight={700} sx={{ mt: 0.25 }}>{team.name}</Typography>

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

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
            <Typography variant="caption" color="text.disabled">Squad</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{roster.length} / {squadSize}</Typography>
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
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Typography variant="overline" color="text.disabled">My Squad</Typography>
          <List dense disablePadding sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {roster.map((r, i) => (
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
                      sx={{ height: 18, fontSize: '0.6rem', bgcolor: `${poolColor(r.pool)}20`, color: poolColor(r.pool), fontWeight: 700 }}
                    />
                    <Typography variant="caption" color="success.main" fontWeight={700}>
                      {r.price.toLocaleString()} pts
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <FiberManualRecordIcon sx={{ fontSize: 10, color: connected ? 'success.main' : 'error.main' }} />
          <Typography variant="caption" color="text.disabled">{connected ? 'Live' : 'Reconnecting…'}</Typography>
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
