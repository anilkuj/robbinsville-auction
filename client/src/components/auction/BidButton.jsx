import React, { useState, useEffect } from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { computeMaxBid, formatPts } from '../../utils/budgetCalc.js';

export default function BidButton() {
  const { auctionState, placeBid, socket } = useAuction();
  const { user } = useAuth();
  const [customAmount, setCustomAmount] = useState('');
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

  // Reset custom amount when player changes
  useEffect(() => {
    setCustomAmount('');
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

  const minNextBid = currentBid.teamId === null
    ? player.basePrice
    : currentBid.amount + bidIncrement;

  const maxBid = computeMaxBid(team.budget, team.roster.length, squadSize, minBid);

  // Minimum cost to reserve per remaining player (cheapest pool base price)
  const minPlayerCost = pools?.length
    ? Math.min(...pools.map(p => p.basePrice))
    : minBid;

  const isLeading = currentBid.teamId === user.teamId;
  const rosterFull = team.roster.length >= squadSize;
  const cantAfford = minNextBid > maxBid;
  const disabled = timerPaused || isLeading || rosterFull || cantAfford;

  let disabledReason = '';
  if (timerPaused) disabledReason = 'Auction paused';
  else if (isLeading) disabledReason = 'You are leading';
  else if (rosterFull) disabledReason = 'Squad full';
  else if (cantAfford) disabledReason = `Max: ${formatPts(maxBid)}`;

  // Custom amount parsing and validation
  const parsedCustom = customAmount !== '' ? parseInt(customAmount) : null;
  const effectiveBid = parsedCustom && parsedCustom >= minNextBid ? parsedCustom : minNextBid;

  // Reserve check: after this bid, must have enough for remaining slots at minimum player cost
  const slotsAfterThis = Math.max(0, squadSize - team.roster.length - 1);
  const maxAffordable = team.budget - slotsAfterThis * minPlayerCost;

  let customError = null;
  if (parsedCustom !== null) {
    if (parsedCustom < minNextBid) customError = `Min bid is ${formatPts(minNextBid)}`;
    else if (parsedCustom > maxAffordable) customError = `Max bid is ${formatPts(maxAffordable)} — must keep ${formatPts(slotsAfterThis * minPlayerCost)} for ${slotsAfterThis} remaining player${slotsAfterThis !== 1 ? 's' : ''}`;
    else if (parsedCustom > maxBid) customError = `Max bid is ${formatPts(maxBid)}`;
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
    setCustomAmount('');
    setFeedback({ type: 'ok', msg: `Bid ${formatPts(amount)} placed!` });
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>

        {/* Custom amount row */}
        {!disabled && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%', maxWidth: '320px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '3px' }}>Custom amount</div>
              <input
                type="number"
                style={{
                  background: '#0f172a',
                  border: `1px solid ${customError ? '#ef4444' : '#334155'}`,
                  color: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.95rem',
                  width: '100%',
                  outline: 'none',
                }}
                placeholder={minNextBid}
                value={customAmount}
                min={minNextBid}
                max={maxBid}
                onChange={e => setCustomAmount(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.5, paddingTop: '1rem' }}>
              Min: {formatPts(minNextBid)}<br />
              Max: {formatPts(maxBid)}
            </div>
          </div>
        )}

        {customError && (
          <div style={{ color: '#ef4444', fontSize: '0.8rem', width: '100%', maxWidth: '320px' }}>
            {customError}
          </div>
        )}

        <button
          onClick={handleBidClick}
          disabled={disabled || !!customError}
          style={{
            width: '100%',
            maxWidth: '320px',
            padding: '1rem',
            fontSize: '1.1rem',
            fontWeight: 700,
            borderRadius: '10px',
            border: 'none',
            cursor: (disabled || customError) ? 'not-allowed' : 'pointer',
            background: (disabled || customError) ? '#1e293b' : 'linear-gradient(135deg, #f59e0b, #ef4444)',
            color: (disabled || customError) ? '#475569' : '#fff',
            transition: 'all 0.15s',
            letterSpacing: '0.02em',
            boxShadow: (disabled || customError) ? 'none' : '0 4px 20px #f59e0b40',
          }}
        >
          {disabled ? (disabledReason || '—') : `BID ${formatPts(effectiveBid)}`}
        </button>

        {feedback && (
          <div style={{
            fontSize: '0.85rem',
            color: feedback.type === 'ok' ? '#22c55e' : '#ef4444',
            textAlign: 'center',
            padding: '0.3rem 0.75rem',
            background: feedback.type === 'ok' ? '#14532d30' : '#7f1d1d30',
            borderRadius: '6px',
          }}>
            {feedback.msg}
          </div>
        )}
      </div>

      {/* Budget warning modal */}
      {budgetWarn && (
        <Modal onClose={() => setBudgetWarn(null)}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</div>
            <h3 style={{ color: '#f59e0b', marginBottom: '0.75rem', fontSize: '1.1rem' }}>Budget Warning</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Bidding <strong style={{ color: '#f1f5f9' }}>{formatPts(budgetWarn.amount)}</strong> will leave you with{' '}
              <strong style={{ color: '#ef4444' }}>{formatPts(budgetWarn.budgetAfter)}</strong>.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              You still need <strong style={{ color: '#f1f5f9' }}>{budgetWarn.slotsAfterThis}</strong> more player{budgetWarn.slotsAfterThis !== 1 ? 's' : ''} —
              at minimum <strong style={{ color: '#f1f5f9' }}>{formatPts(budgetWarn.minPlayerCost)}</strong> each,
              you need at least <strong style={{ color: '#ef4444' }}>{formatPts(budgetWarn.minNeeded)}</strong> in reserve.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setBudgetWarn(null)} style={cancelBtnStyle}>OK, Cancel Bid</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation modal */}
      {confirmBid !== null && (
        <Modal onClose={() => setConfirmBid(null)}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏏</div>
            <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Confirm Bid</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              Bid <strong style={{ color: '#f59e0b', fontSize: '1.3rem' }}>{formatPts(confirmBid)}</strong>
            </p>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              for <strong style={{ color: '#f1f5f9' }}>{player.name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setConfirmBid(null)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={() => doBid(confirmBid)} style={confirmBtnStyle}>Confirm Bid</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1e293b', borderRadius: '16px', padding: '2rem',
        maxWidth: '360px', width: '100%', border: '1px solid #334155',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
      }}>
        {children}
      </div>
    </div>
  );
}

const cancelBtnStyle = {
  padding: '0.65rem 1.25rem',
  background: '#334155', border: 'none', borderRadius: '8px',
  color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
};
const confirmBtnStyle = {
  padding: '0.65rem 1.5rem',
  background: 'linear-gradient(135deg, #f59e0b, #ef4444)', border: 'none', borderRadius: '8px',
  color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
  boxShadow: '0 4px 15px #f59e0b40',
};
