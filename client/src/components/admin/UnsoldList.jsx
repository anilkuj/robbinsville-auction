import React, { useState } from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { formatPts } from '../../utils/budgetCalc.js';
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

  if (unsold.length === 0) {
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
      {unsold.map(player => {
        const isEditing = editing?.playerId === player.id;
        return (
          <Paper key={player.id} variant="outlined" sx={{ p: 1.25 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <TextField
                  size="small"
                  type="number"
                  inputProps={{ min: 1 }}
                  value={editing?.basePrice ?? ''}
                  onChange={e => setEditing(prev => ({ ...prev, basePrice: e.target.value }))}
                  autoFocus
                  sx={{ width: 100 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmReAuction();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                />
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
