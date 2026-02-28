import React, { useState } from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { formatPts } from '../../utils/budgetCalc.js';
import { getAvgPointsKey, sortPlayersByPoints } from '../../utils/playerSort.js';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Collapse from '@mui/material/Collapse';

export default function UnsoldList() {
  const { auctionState, adminAction } = useAuction();
  const [editing, setEditing] = useState(null);

  if (!auctionState) return null;

  const { players, phase } = auctionState;
  const unsold = players.filter(p => p.status === 'UNSOLD');
  const avgKey = getAvgPointsKey(players);
  const sortedUnsold = sortPlayersByPoints(unsold, avgKey);

  if (sortedUnsold.length === 0) {
    return <Typography color="text.disabled" fontSize="0.85rem">No unsold players.</Typography>;
  }

  function startEdit(player) {
    setEditing({ playerId: player.id, basePrice: String(player.basePrice) });
  }

  function confirmReAuction() {
    const parsed = parseInt(editing.basePrice);
    if (isNaN(parsed) || parsed <= 0) return;
    adminAction('admin:reAuction', { playerId: editing.playerId, basePrice: parsed });
    setEditing(null);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {sortedUnsold.map(player => {
        const isEditing = editing?.playerId === player.id;
        return (
          <Paper key={player.id} variant="outlined" sx={{ p: 1.25 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1 }}>
              <Box>
                <Typography component="span" fontWeight={600} fontSize="0.9rem">{player.name}</Typography>
                <Typography component="span" color="text.disabled" fontSize="0.8rem" ml={1}>
                  Pool {player.pool} · {formatPts(player.basePrice)}
                </Typography>
              </Box>

              {phase === 'SETUP' && !isEditing && (
                <Button size="small" variant="contained" color="info" onClick={() => startEdit(player)}>
                  Re-Auction
                </Button>
              )}
            </Box>

            <Collapse in={isEditing}>
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">Base price:</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ minWidth: 36, px: 0 }}
                  onClick={() => {
                    const curr = parseInt(editing?.basePrice) || 0;
                    setEditing(prev => ({ ...prev, basePrice: String(Math.max(100, curr - 100)) }));
                  }}
                >
                  -
                </Button>
                <TextField
                  size="small"
                  type="number"
                  inputProps={{ min: 100, step: 100 }}
                  value={editing?.basePrice ?? ''}
                  onChange={e => setEditing(prev => ({ ...prev, basePrice: e.target.value }))}
                  autoFocus
                  sx={{
                    width: 90,
                    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { display: 'none' },
                    '& input[type=number]': { MozAppearance: 'textfield' }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmReAuction();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ minWidth: 36, px: 0 }}
                  onClick={() => {
                    const curr = parseInt(editing?.basePrice) || 0;
                    setEditing(prev => ({ ...prev, basePrice: String(curr + 100) }));
                  }}
                >
                  +
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  disabled={!editing?.basePrice || parseInt(editing.basePrice) <= 0}
                  onClick={confirmReAuction}
                >
                  Confirm
                </Button>
                <Button size="small" variant="outlined" color="inherit" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </Box>
            </Collapse>
          </Paper>
        );
      })}
    </Box>
  );
}
