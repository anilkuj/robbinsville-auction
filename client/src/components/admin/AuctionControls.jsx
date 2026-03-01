import React, { useState, useEffect } from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { computeMaxBid, formatPts } from '../../utils/budgetCalc.js';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

export default function AuctionControls() {
  const { auctionState, adminAction, adminError, clearAdminError, lastEvent } = useAuction();
  const [timer, setTimer] = useState('');
  const [increment, setIncrement] = useState('');
  const [bump, setBump] = useState('');
  const [pendingEndMode, setPendingEndMode] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [pendingRandomize, setPendingRandomize] = useState(null);

  // Manual sale state
  const [showManualSale, setShowManualSale] = useState(false);
  const [msPlayer, setMsPlayer] = useState('');
  const [msTeam, setMsTeam] = useState('');
  const [msAmount, setMsAmount] = useState('');
  const [msLocalError, setMsLocalError] = useState('');

  useEffect(() => {
    if (lastEvent?.type === 'sold') {
      setMsPlayer(''); setMsTeam(''); setMsAmount(''); setMsLocalError('');
      clearAdminError();
    }
  }, [lastEvent]);

  useEffect(() => {
    if (showManualSale && adminError) {
      setMsLocalError(adminError);
      clearAdminError();
    }
  }, [adminError, showManualSale]);

  if (!auctionState) return null;

  const { phase, timerPaused, timerEndsAt, settings } = auctionState;
  const isLive = phase === 'LIVE';
  const isSetup = phase === 'SETUP';

  const teamsWithMissingOwner = Object.values(auctionState.teams || {})
    .filter(t => t.ownerIsPlayer && !t.ownerPlayerId);
  const ownerBlocked = teamsWithMissingOwner.length > 0;
  const isManual = settings.endMode === 'manual';
  const awaitingHammer = isLive && isManual && !timerEndsAt;

  const displayEndMode = pendingEndMode ?? settings.endMode;
  const displayConfirm = pendingConfirm ?? settings.requireBidConfirm ?? true;
  const displayRandomize = pendingRandomize ?? settings.randomizePool ?? false;
  const hasChanges = timer || increment || bump !== '' || pendingEndMode !== null || pendingConfirm !== null || pendingRandomize !== null;

  // Manual sale derived values
  const { squadSize, minBid } = auctionState.leagueConfig || {};
  const availableForManualSale = (auctionState.players || [])
    .filter(p => p.status === 'PENDING' || p.status === 'UNSOLD')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'PENDING' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  const teamList = Object.values(auctionState.teams || {}).sort((a, b) => a.name.localeCompare(b.name));
  const selectedTeam = msTeam ? auctionState.teams[msTeam] : null;
  const msMaxBid = selectedTeam
    ? computeMaxBid(selectedTeam.budget, selectedTeam.roster.length, squadSize || 18, minBid || 1000)
    : null;
  const msAmountNum = parseInt(msAmount);
  const msAmountInvalid = msAmount !== '' && (isNaN(msAmountNum) || msAmountNum <= 0 || (msMaxBid !== null && msAmountNum > msMaxBid));
  const canSubmitManualSale = msPlayer && msTeam && msAmount !== '' && !msAmountInvalid;

  function submitManualSale() {
    if (!canSubmitManualSale) return;
    const playerName = availableForManualSale.find(p => p.id === msPlayer)?.name || msPlayer;
    if (confirm(`Sell ${playerName} to ${selectedTeam?.name} for ${msAmountNum.toLocaleString()} pts?`)) {
      setMsLocalError('');
      adminAction('admin:manualSale', { playerId: msPlayer, teamId: msTeam, saleAmount: msAmountNum });
    }
  }

  function saveSettings() {
    const updates = {};
    if (timer && parseInt(timer) > 0) updates.timerSeconds = parseInt(timer);
    if (increment && parseInt(increment) > 0) updates.bidIncrement = parseInt(increment);
    if (bump !== '' && parseInt(bump) >= 0) updates.timerBumpSeconds = parseInt(bump);
    if (pendingEndMode !== null) updates.endMode = pendingEndMode;
    if (pendingConfirm !== null) updates.requireBidConfirm = pendingConfirm;
    if (pendingRandomize !== null) updates.randomizePool = pendingRandomize;
    if (Object.keys(updates).length) {
      adminAction('admin:updateSettings', updates);
      setTimer(''); setIncrement(''); setBump('');
      setPendingEndMode(null); setPendingConfirm(null); setPendingRandomize(null);
    }
  }

  const isFirstPlayer = isSetup && (auctionState.players || []).every(p => p.status === 'PENDING');

  function handleNextPlayer() {
    if (isFirstPlayer) {
      if (!window.confirm('⚠ WAIT! Before starting the auction for the first player, please double-check that all Base Prices and Team Owner Info are correct. Proceed?')) {
        return;
      }
    }
    adminAction('admin:nextPlayer');
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

      {/* Awaiting hammer banner */}
      {awaitingHammer && (
        <Paper sx={{ bgcolor: '#2e1065', border: '1px solid #a855f7', borderRadius: 2, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography fontWeight={700} fontSize="0.85rem" color="#d8b4fe">🔨 Awaiting hammer</Typography>
            <Typography fontSize="0.75rem" color="#a855f7" mt={0.25}>
              {auctionState.currentBid?.teamId
                ? `Highest bid: ${auctionState.currentBid.amount.toLocaleString()} pts`
                : 'No bids — mark unsold or accept to pass'}
            </Typography>
          </Box>
          <Button variant="contained" sx={{ bgcolor: '#a855f7', '&:hover': { bgcolor: '#9333ea' } }} onClick={() => adminAction('admin:acceptBid')}>
            🔨 Hammer
          </Button>
        </Paper>
      )}

      {/* Owner blocked warning */}
      {ownerBlocked && isSetup && (
        <Alert severity="error" sx={{ fontSize: '0.8rem' }}>
          ⚠ Owner player not selected for: {teamsWithMissingOwner.map(t => t.name || t.id).join(', ')} — go to League Setup to fix.
        </Alert>
      )}

      {/* Phase action buttons */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button variant="contained" color="success" disabled={!isSetup || ownerBlocked} onClick={handleNextPlayer}>
          ▶ Next Player
        </Button>

        {isLive && !timerPaused && (
          <Button variant="contained" color="warning" onClick={() => adminAction('admin:pauseTimer')}>
            ⏸ Pause
          </Button>
        )}

        {isLive && timerPaused && (
          <Button variant="contained" color="info" onClick={() => adminAction('admin:resumeTimer')}>
            ▶ Resume
          </Button>
        )}

        {isLive && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              if (confirm('Are you sure you want to cancel the last bid received for this player?')) {
                adminAction('admin:cancelLastBid');
              }
            }}
          >
            ⎌ Cancel Last Bid
          </Button>
        )}

        {isLive && isManual && !awaitingHammer && (
          <Button variant="contained" sx={{ bgcolor: '#a855f7', '&:hover': { bgcolor: '#9333ea' } }} onClick={() => adminAction('admin:acceptBid')}>
            🔨 Hammer
          </Button>
        )}

        <Button variant="contained" color="error" disabled={!isLive} onClick={() => {
          if (confirm('Mark current player as unsold?')) adminAction('admin:markUnsold');
        }}>
          ✕ Mark Unsold
        </Button>
      </Box>

      {/* Live settings */}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>Timer (s) — current: {settings.timerSeconds}</Typography>
          <TextField size="small" type="number" inputProps={{ min: 5, max: 120 }} placeholder={String(settings.timerSeconds)} value={timer} onChange={e => setTimer(e.target.value)} sx={{ width: 90 }} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>Bid bump (s) — current: {settings.timerBumpSeconds ?? 10}</Typography>
          <TextField size="small" type="number" inputProps={{ min: 0, max: 60 }} placeholder={String(settings.timerBumpSeconds ?? 10)} value={bump} onChange={e => setBump(e.target.value)} sx={{ width: 90 }} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>Increment — current: {settings.bidIncrement?.toLocaleString()}</Typography>
          <TextField size="small" type="number" inputProps={{ min: 100 }} placeholder={String(settings.bidIncrement)} value={increment} onChange={e => setIncrement(e.target.value)} sx={{ width: 90 }} />
        </Box>

        <Box>
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>End mode</Typography>
          <ToggleButtonGroup exclusive size="small" value={displayEndMode} onChange={(_, val) => val && setPendingEndMode(val === settings.endMode ? null : val)}>
            <ToggleButton value="timer" sx={{ px: 1.5, fontSize: '0.78rem' }}>⏱ Timer</ToggleButton>
            <ToggleButton value="manual" sx={{ px: 1.5, fontSize: '0.78rem' }}>🔨 Manual</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>Bid confirmation</Typography>
          <ToggleButtonGroup exclusive size="small" value={String(displayConfirm)} onChange={(_, val) => val !== null && setPendingConfirm(val === 'true')}>
            <ToggleButton value="true" sx={{ px: 1.5, fontSize: '0.78rem', '&.Mui-selected': { color: 'success.main' } }}>✓ On</ToggleButton>
            <ToggleButton value="false" sx={{ px: 1.5, fontSize: '0.78rem', '&.Mui-selected': { color: 'error.main' } }}>✕ Off</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>Player order</Typography>
          <ToggleButtonGroup exclusive size="small" value={String(displayRandomize)} onChange={(_, val) => val !== null && setPendingRandomize(val === 'true')}>
            <ToggleButton value="false" sx={{ px: 1.5, fontSize: '0.78rem' }}>↕ Fixed</ToggleButton>
            <ToggleButton value="true" sx={{ px: 1.5, fontSize: '0.78rem' }}>🔀 Random</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Button variant="contained" color="inherit" disabled={!hasChanges} onClick={saveSettings} sx={{ alignSelf: 'flex-end' }}>
          Apply
        </Button>
      </Paper>

      {/* Manual Sale */}
      {(isSetup || phase === 'ENDED') && (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box
            onClick={() => { setShowManualSale(v => !v); setMsLocalError(''); }}
            sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Typography fontWeight={600} fontSize="0.85rem">💰 Manual Sale</Typography>
            <Typography variant="caption" color="text.disabled">{showManualSale ? '▲ Hide' : '▼ Expand'}</Typography>
          </Box>

          <Collapse in={showManualSale}>
            <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
                <FormControl size="small" sx={{ flex: '1 1 160px' }}>
                  <InputLabel>Player</InputLabel>
                  <Select label="Player" value={msPlayer} onChange={e => { setMsPlayer(e.target.value); setMsLocalError(''); }}>
                    <MenuItem value=""><em>— Select player —</em></MenuItem>
                    {availableForManualSale.length === 0 && <MenuItem value="" disabled>No players available</MenuItem>}
                    {availableForManualSale.map(p => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}{p.status === 'UNSOLD' ? ' (unsold)' : ''}{p.pool ? ` · ${p.pool}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: '1 1 140px' }}>
                  <InputLabel>Team</InputLabel>
                  <Select label="Team" value={msTeam} onChange={e => { setMsTeam(e.target.value); setMsAmount(''); setMsLocalError(''); }}>
                    <MenuItem value=""><em>— Select team —</em></MenuItem>
                    {teamList.map(t => (
                      <MenuItem key={t.id} value={t.id}>{t.name} ({formatPts(t.budget)})</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ flex: '1 1 120px' }}>
                  <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>
                    Sale amount
                    {msMaxBid !== null && (
                      <Box component="span" sx={{ ml: 0.75, color: msMaxBid <= 0 ? 'error.main' : 'success.main' }}>
                        (max: {formatPts(msMaxBid)})
                      </Box>
                    )}
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 1 }}
                    placeholder="pts"
                    value={msAmount}
                    onChange={e => { setMsAmount(e.target.value); setMsLocalError(''); }}
                    disabled={!msTeam}
                    error={msAmountInvalid}
                    fullWidth
                  />
                </Box>

                <Button variant="contained" color="success" disabled={!canSubmitManualSale} onClick={submitManualSale} sx={{ alignSelf: 'flex-end' }}>
                  Sell
                </Button>
              </Box>

              {selectedTeam && (
                <Typography variant="caption" color="text.disabled">
                  {selectedTeam.name}: budget {formatPts(selectedTeam.budget)}, roster {selectedTeam.roster.length}/{squadSize || 18}
                  {msMaxBid !== null && msMaxBid <= 0 && (
                    <Box component="span" color="error.main" ml={1}>⚠ Cannot purchase any more players</Box>
                  )}
                </Typography>
              )}

              {msLocalError && (
                <Alert severity="error" sx={{ py: 0.5, fontSize: '0.8rem' }}>⚠ {msLocalError}</Alert>
              )}
            </Box>
          </Collapse>
        </Paper>
      )}
    </Box>
  );
}
