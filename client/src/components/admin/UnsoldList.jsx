import React, { useState } from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { formatPts } from '../../utils/budgetCalc.js';

export default function UnsoldList() {
  const { auctionState, adminAction } = useAuction();
  const [editing, setEditing] = useState(null); // { playerId, basePrice }

  if (!auctionState) return null;

  const { players, phase } = auctionState;
  const unsold = players.filter(p => p.status === 'UNSOLD');

  if (unsold.length === 0) {
    return <div style={{ color: '#475569', fontSize: '0.85rem' }}>No unsold players.</div>;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {unsold.map(player => {
        const isEditing = editing?.playerId === player.id;
        return (
          <div key={player.id} style={{
            background: '#0f172a', borderRadius: '7px', padding: '0.6rem 0.75rem',
            border: '1px solid #334155',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>{player.name}</span>
                <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                  Pool {player.pool} · {formatPts(player.basePrice)}
                </span>
              </div>

              {phase === 'SETUP' && !isEditing && (
                <button
                  onClick={() => startEdit(player)}
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

            {isEditing && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  Base price:
                </label>
                <input
                  type="number"
                  min="1"
                  value={editing.basePrice}
                  onChange={e => setEditing(prev => ({ ...prev, basePrice: e.target.value }))}
                  style={{
                    width: '90px', background: '#1e293b', border: '1px solid #475569',
                    borderRadius: '4px', color: '#f1f5f9', padding: '0.2rem 0.4rem',
                    fontSize: '0.8rem',
                  }}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmReAuction();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                />
                <button
                  onClick={confirmReAuction}
                  disabled={!editing.basePrice || parseInt(editing.basePrice) <= 0}
                  style={{
                    background: '#16a34a', border: 'none', color: '#fff',
                    borderRadius: '5px', padding: '0.25rem 0.55rem',
                    fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                    opacity: (!editing.basePrice || parseInt(editing.basePrice) <= 0) ? 0.5 : 1,
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setEditing(null)}
                  style={{
                    background: '#334155', border: 'none', color: '#cbd5e1',
                    borderRadius: '5px', padding: '0.25rem 0.55rem',
                    fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
