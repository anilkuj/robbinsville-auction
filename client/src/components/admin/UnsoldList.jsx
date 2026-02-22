import React from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { formatPts } from '../../utils/budgetCalc.js';

export default function UnsoldList() {
  const { auctionState, adminAction } = useAuction();

  if (!auctionState) return null;

  const { players, unsoldPlayers, phase } = auctionState;
  const unsold = players.filter(p => p.status === 'UNSOLD');

  if (unsold.length === 0) {
    return <div style={{ color: '#475569', fontSize: '0.85rem' }}>No unsold players.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {unsold.map(player => (
        <div key={player.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#0f172a', borderRadius: '7px', padding: '0.6rem 0.75rem',
          border: '1px solid #334155',
        }}>
          <div>
            <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>{player.name}</span>
            <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
              Pool {player.pool} · {formatPts(player.basePrice)}
            </span>
          </div>

          {phase === 'SETUP' && (
            <button
              onClick={() => adminAction('admin:reAuction', { playerId: player.id })}
              style={{
                background: '#1d4ed8', border: 'none', color: '#fff',
                borderRadius: '5px', padding: '0.3rem 0.6rem',
                fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Re-Auction
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
