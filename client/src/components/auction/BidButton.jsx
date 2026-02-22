import React, { useState, useEffect } from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { computeMaxBid, formatPts } from '../../utils/budgetCalc.js';

export default function BidButton() {
  const { auctionState, placeBid, socket } = useAuction();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState(null); // { type: 'ok'|'err', msg }

  useEffect(() => {
    if (!socket) return;
    const onRejected = ({ reason }) => setFeedback({ type: 'err', msg: reason });
    socket.on('bid:rejected', onRejected);
    return () => socket.off('bid:rejected', onRejected);
  }, [socket]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  if (!auctionState || auctionState.phase !== 'LIVE') return null;

  const player = auctionState.players?.[auctionState.currentPlayerIndex];
  if (!player) return null;

  const team = auctionState.teams?.[user?.teamId];
  if (!team) return null;

  const { squadSize, minBid } = auctionState.leagueConfig;
  const { bidIncrement } = auctionState.settings;
  const { currentBid, timerPaused } = auctionState;

  const nextBidAmount = currentBid.teamId === null
    ? player.basePrice
    : currentBid.amount + bidIncrement;

  const maxBid = computeMaxBid(team.budget, team.roster.length, squadSize, minBid);
  const isLeading = currentBid.teamId === user.teamId;
  const rosterFull = team.roster.length >= squadSize;
  const cantAfford = nextBidAmount > maxBid;
  const disabled = timerPaused || isLeading || rosterFull || cantAfford;

  let disabledReason = '';
  if (timerPaused) disabledReason = 'Auction paused';
  else if (isLeading) disabledReason = 'You are leading';
  else if (rosterFull) disabledReason = 'Squad full';
  else if (cantAfford) disabledReason = `Max: ${formatPts(maxBid)}`;

  function handleBid() {
    if (disabled) return;
    placeBid(player.id, nextBidAmount);
    setFeedback({ type: 'ok', msg: `Bid ${formatPts(nextBidAmount)} placed!` });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <button
        onClick={handleBid}
        disabled={disabled}
        style={{
          width: '100%',
          maxWidth: '320px',
          padding: '1rem',
          fontSize: '1.1rem',
          fontWeight: 700,
          borderRadius: '10px',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#1e293b' : 'linear-gradient(135deg, #f59e0b, #ef4444)',
          color: disabled ? '#475569' : '#fff',
          transition: 'all 0.15s',
          letterSpacing: '0.02em',
          boxShadow: disabled ? 'none' : '0 4px 20px #f59e0b40',
        }}
      >
        {disabled ? (disabledReason || '—') : `BID ${formatPts(nextBidAmount)}`}
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
  );
}
