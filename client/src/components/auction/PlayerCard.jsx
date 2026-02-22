import React from 'react';
import { formatPts } from '../../utils/budgetCalc.js';

const POOL_COLORS = {
  A1: '#f59e0b', A2: '#f59e0b', A3: '#f59e0b',
  B1: '#3b82f6', B2: '#3b82f6', B3: '#3b82f6',
  C: '#8b5cf6',
  D: '#64748b',
};

function poolColor(pool) {
  return POOL_COLORS[pool] || '#64748b';
}

export default function PlayerCard({ player }) {
  if (!player) {
    return (
      <div style={{
        background: '#1e293b', borderRadius: '12px', padding: '2rem',
        textAlign: 'center', color: '#475569', fontSize: '1rem',
        border: '2px dashed #334155',
      }}>
        Waiting for next player…
      </div>
    );
  }

  const color = poolColor(player.pool);

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '12px',
      padding: '1.5rem',
      border: `2px solid ${color}40`,
      boxShadow: `0 0 24px ${color}20`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{
          background: color,
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.75rem',
          padding: '0.2rem 0.6rem',
          borderRadius: '999px',
          letterSpacing: '0.05em',
        }}>
          POOL {player.pool}
        </span>
      </div>

      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2, marginBottom: '0.5rem' }}>
        {player.name}
      </div>

      <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
        Base Price: <span style={{ color: '#94a3b8', fontWeight: 600 }}>{formatPts(player.basePrice)}</span>
      </div>
    </div>
  );
}
