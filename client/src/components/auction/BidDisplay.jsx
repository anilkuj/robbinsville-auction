import React from 'react';
import { formatPts } from '../../utils/budgetCalc.js';

export default function BidDisplay({ currentBid, teams, player }) {
  const leadingTeam = currentBid?.teamId ? teams?.[currentBid.teamId] : null;
  const amount = currentBid?.amount;
  const hasBid = !!currentBid?.teamId;

  return (
    <div style={{
      background: '#0f172a',
      borderRadius: '10px',
      padding: '1rem 1.25rem',
      textAlign: 'center',
    }}>
      <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
        {hasBid ? 'Highest Bid' : 'Opening Bid'}
      </div>

      <div style={{
        fontSize: '2.2rem',
        fontWeight: 800,
        color: hasBid ? '#22c55e' : '#f59e0b',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
      }}>
        {formatPts(amount || player?.basePrice)}
      </div>

      {hasBid && leadingTeam && (
        <div style={{
          marginTop: '0.4rem',
          fontSize: '0.9rem',
          color: '#94a3b8',
          fontWeight: 600,
        }}>
          🏆 {leadingTeam.name}
        </div>
      )}

      {!hasBid && (
        <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#475569' }}>
          No bids yet
        </div>
      )}
    </div>
  );
}
