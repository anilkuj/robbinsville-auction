import React, { useState, useEffect } from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { computeMaxBid, formatPts } from '../../utils/budgetCalc.js';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';

export default function BidButton() {
  const { auctionState, placeBid, socket, preparedBid, setPreparedBid } = useAuction();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState(null);
  const [confirmBid, setConfirmBid] = useState(null);
  const [budgetWarn, setBudgetWarn] = useState(null);

  useEffect(() => {
    if (!socket) return;
    const onRejected = ({ reason }) => {
      setFeedback({ type: 'err', msg: reason });
      setConfirmBid(null);
    };
    socket.on('bid:rejected', onRejected);
    return () => socket.off('bid:rejected', onRejected);
  }, [socket]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  useEffect(() => {
    setConfirmBid(null);
    setBudgetWarn(null);
  }, [auctionState?.currentPlayerIndex]);

  if (!auctionState || auctionState.phase !== 'LIVE') return null;
  const player = auctionState.players?.[auctionState.currentPlayerIndex];
  if (!player) return null;
  const team = auctionState.teams?.[user?.teamId];
  if (!team) return null;

  const { squadSize, minBid, pools } = auctionState.leagueConfig;
  const { bidIncrement } = auctionState.settings;
  const { currentBid, timerPaused } = auctionState;

  const minNextBid = currentBid.teamId === null ? player.basePrice : currentBid.amount + bidIncrement;
  const maxBid = computeMaxBid(team.budget, team.roster.length, squadSize, minBid);
  const minPlayerCost = pools?.length ? Math.min(...pools.map(p => p.basePrice)) : minBid;

  const isLeading = currentBid.teamId === user.teamId;
  const rosterFull = team.roster.length >= squadSize;
  const cantAfford = minNextBid > maxBid;
  const disabled = timerPaused || isLeading || rosterFull || cantAfford;

  let disabledReason = '';
  if (timerPaused) disabledReason = 'Auction paused';
  else if (isLeading) disabledReason = 'You are leading';
  else if (rosterFull) disabledReason = 'Squad full';
  else if (cantAfford) disabledReason = `Max: ${formatPts(maxBid)}`;

  const effectiveBid = preparedBid !== null && preparedBid >= minNextBid ? preparedBid : minNextBid;

  const slotsAfterThis = Math.max(0, squadSize - team.roster.length - 1);
  const maxAffordable = team.budget - slotsAfterThis * minPlayerCost;

  let customError = null;
  if (preparedBid !== null) {
    if (preparedBid < minNextBid) customError = `Min bid is ${formatPts(minNextBid)}`;
    else if (preparedBid > maxAffordable) customError = `Max bid is ${formatPts(maxAffordable)} — must keep ${formatPts(slotsAfterThis * minPlayerCost)} for ${slotsAfterThis} remaining player${slotsAfterThis !== 1 ? 's' : ''}`;
    else if (preparedBid > maxBid) customError = `Max bid is ${formatPts(maxBid)}`;
  }

  function handleIncrement(delta) {
    const startVal = preparedBid !== null ? preparedBid : minNextBid;
    let newVal = startVal + delta;
    if (newVal < minNextBid) newVal = minNextBid;
    if (newVal > maxBid) newVal = maxBid;
    setPreparedBid(newVal);
  }

  function handleBidClick() {
    if (disabled || customError) return;
    const budgetAfter = team.budget - effectiveBid;
    const minNeeded = slotsAfterThis * minPlayerCost;
    if (slotsAfterThis > 0 && budgetAfter < minNeeded) {
      setBudgetWarn({ amount: effectiveBid, slotsAfterThis, budgetAfter, minNeeded, minPlayerCost });
      return;
    }
    if (auctionState.settings.requireBidConfirm ?? true) {
      setConfirmBid(effectiveBid);
    } else {
      doBid(effectiveBid);
    }
  }

  function doBid(amount) {
    placeBid(player.id, amount);
    setConfirmBid(null);
    setBudgetWarn(null);
    setPreparedBid(null);
    setFeedback({ type: 'ok', msg: `Bid ${formatPts(amount)} placed!` });
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, width: '100%', maxWidth: 340 }}>
        {!disabled && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 0.5, sm: 1.5 }, 
            alignItems: { xs: 'center', sm: 'flex-start' }, 
            width: '100%' 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', flex: 1 }}>
              <Button
                variant="outlined"
                sx={{ minWidth: 40, px: 0, height: 40 }}
                onClick={() => handleIncrement(-100)}
                disabled={disabled || (preparedBid !== null ? preparedBid : minNextBid) <= minNextBid}
              >
                -
              </Button>
              <TextField
                type="number"
                label="Custom amount"
                size="small"
                placeholder={String(minNextBid)}
                value={preparedBid !== null ? String(preparedBid) : ''}
                onChange={e => {
                  const val = e.target.value;
                  setPreparedBid(val === '' ? null : parseInt(val, 10));
                }}
                error={!!customError}
                inputProps={{ min: minNextBid, max: maxBid, step: 100 }}
                fullWidth
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBidClick();
                  }
                }}
                sx={{
                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { display: 'none' },
                  '& input[type=number]': { MozAppearance: 'textfield' }
                }}
              />
              <Button
                variant="outlined"
                sx={{ minWidth: 40, px: 0, height: 40 }}
                onClick={() => handleIncrement(100)}
                disabled={disabled || (preparedBid !== null ? preparedBid : minNextBid) >= maxBid}
              >
                +
              </Button>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'row', sm: 'column' }, 
              gap: { xs: 2, sm: 0 },
              minWidth: { xs: '100%', sm: 80 },
              justifyContent: 'center',
              mt: { xs: 0.5, sm: 0 }
            }}>
              <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                MIN: {formatPts(minNextBid)}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                MAX: {formatPts(maxBid)}
              </Typography>
            </Box>
          </Box>
        )}

        <Box sx={{ minHeight: { xs: 20, sm: 42 }, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          {customError && (
            <Typography variant="caption" color="error" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              {customError}
            </Typography>
          )}
        </Box>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleBidClick}
          disabled={disabled || !!customError}
          fullWidth
          sx={{ 
            maxWidth: 320, 
            py: { xs: 1.25, sm: 1.5 }, 
            fontSize: { xs: '1rem', sm: '1.1rem' },
            boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)'
          }}
        >
          {disabled ? (disabledReason || '—') : `BID ${formatPts(effectiveBid)}`}
        </Button>

        <Box sx={{ minHeight: 48, width: '100%', maxWidth: 320, mt: 1 }}>
          {feedback && (
            <Alert
              severity={feedback.type === 'ok' ? 'success' : 'error'}
              sx={{ py: 0 }}
            >
              {feedback.msg}
            </Alert>
          )}
        </Box>
      </Box>

      {/* Budget warning dialog */}
      <Dialog open={!!budgetWarn} onClose={() => setBudgetWarn(null)} maxWidth="xs" fullWidth>
        <DialogTitle>⚠️ Budget Warning</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Bidding <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{budgetWarn && formatPts(budgetWarn.amount)}</Box> will
            leave you with <Box component="span" color="error.main" fontWeight={700}>{budgetWarn && formatPts(budgetWarn.budgetAfter)}</Box>.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You still need <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{budgetWarn?.slotsAfterThis}</Box> more
            player{budgetWarn?.slotsAfterThis !== 1 ? 's' : ''} — at minimum{' '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{budgetWarn && formatPts(budgetWarn.minPlayerCost)}</Box> each,
            you need at least <Box component="span" color="error.main" fontWeight={700}>{budgetWarn && formatPts(budgetWarn.minNeeded)}</Box> in reserve.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBudgetWarn(null)} variant="outlined" color="inherit">OK, Cancel Bid</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm bid dialog */}
      <Dialog open={confirmBid !== null} onClose={() => setConfirmBid(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center' }}>🏏 Confirm Bid</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Bid <Box component="span" color="primary.main" sx={{ fontSize: '1.3rem', fontWeight: 800 }}>{confirmBid !== null && formatPts(confirmBid)}</Box>
          </Typography>
          <Typography variant="body2" color="text.disabled">
            for <Box component="span" color="text.primary" fontWeight={700}>{player.name}</Box>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1 }}>
          <Button onClick={() => setConfirmBid(null)} variant="outlined" color="inherit">Cancel</Button>
          <Button onClick={() => doBid(confirmBid)} variant="contained" color="primary">Confirm Bid</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
