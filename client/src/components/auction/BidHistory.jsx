import React, { useEffect, useRef } from 'react';
import { formatPts } from '../../utils/budgetCalc.js';

export default function BidHistory({ history = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length]);

  if (history.length === 0) {
    return (
      <div style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
        No bids yet
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto' }}>
      {[...history].reverse().map((entry, i) => (
        <div key={i} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.4rem 0.75rem',
          background: i === 0 ? '#14532d30' : '#1e293b',
          borderRadius: '6px',
          border: i === 0 ? '1px solid #22c55e40' : '1px solid #334155',
        }}>
          <span style={{ color: i === 0 ? '#22c55e' : '#94a3b8', fontWeight: i === 0 ? 700 : 400, fontSize: '0.9rem' }}>
            {entry.teamName}
          </span>
          <span style={{ color: i === 0 ? '#22c55e' : '#64748b', fontWeight: 600, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
            {formatPts(entry.amount)}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
