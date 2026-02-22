import React, { useState } from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';

const btn = (color, disabled = false) => ({
  padding: '0.6rem 1.2rem',
  borderRadius: '7px',
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 600,
  fontSize: '0.9rem',
  opacity: disabled ? 0.4 : 1,
  background: color,
  color: '#fff',
  transition: 'opacity 0.15s',
});

export default function AuctionControls() {
  const { auctionState, adminAction } = useAuction();
  const [timer, setTimer] = useState('');
  const [increment, setIncrement] = useState('');
  const [bump, setBump] = useState('');
  const [pendingEndMode, setPendingEndMode] = useState(null); // null = no change pending
  const [pendingConfirm, setPendingConfirm] = useState(null); // null = no change pending

  if (!auctionState) return null;

  const { phase, timerPaused, timerEndsAt, settings } = auctionState;
  const isLive = phase === 'LIVE';
  const isSetup = phase === 'SETUP';
  const isManual = settings.endMode === 'manual';
  const awaitingHammer = isLive && isManual && !timerEndsAt;

  const displayEndMode = pendingEndMode ?? settings.endMode;
  const displayConfirm = pendingConfirm ?? settings.requireBidConfirm ?? true;
  const hasChanges = timer || increment || bump !== '' || pendingEndMode !== null || pendingConfirm !== null;

  function saveSettings() {
    const updates = {};
    if (timer && parseInt(timer) > 0) updates.timerSeconds = parseInt(timer);
    if (increment && parseInt(increment) > 0) updates.bidIncrement = parseInt(increment);
    if (bump !== '' && parseInt(bump) >= 0) updates.timerBumpSeconds = parseInt(bump);
    if (pendingEndMode !== null) updates.endMode = pendingEndMode;
    if (pendingConfirm !== null) updates.requireBidConfirm = pendingConfirm;
    if (Object.keys(updates).length) {
      adminAction('admin:updateSettings', updates);
      setTimer('');
      setIncrement('');
      setBump('');
      setPendingEndMode(null);
      setPendingConfirm(null);
    }
  }

  const inputStyle = {
    background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
    borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.9rem', width: '90px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Awaiting hammer banner */}
      {awaitingHammer && (
        <div style={{
          background: '#2e1065', border: '1px solid #a855f7',
          borderRadius: '8px', padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div>
            <div style={{ color: '#d8b4fe', fontWeight: 700, fontSize: '0.85rem' }}>🔨 Awaiting hammer</div>
            <div style={{ color: '#a855f7', fontSize: '0.75rem', marginTop: '2px' }}>
              {auctionState.currentBid?.teamId
                ? `Highest bid: ${auctionState.currentBid.amount.toLocaleString()} pts`
                : 'No bids — mark unsold or accept to pass'}
            </div>
          </div>
          <button
            style={{ ...btn('#a855f7'), fontSize: '1rem', padding: '0.5rem 1.2rem' }}
            onClick={() => adminAction('admin:acceptBid')}
          >
            🔨 Hammer
          </button>
        </div>
      )}

      {/* Phase action buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
        <button
          style={btn('#22c55e', !isSetup)}
          disabled={!isSetup}
          onClick={() => adminAction('admin:nextPlayer')}
        >
          ▶ Next Player
        </button>

        {isLive && !timerPaused && (
          <button
            style={btn('#f59e0b')}
            onClick={() => adminAction('admin:pauseTimer')}
          >
            ⏸ Pause
          </button>
        )}

        {isLive && timerPaused && (
          <button
            style={btn('#3b82f6')}
            onClick={() => adminAction('admin:resumeTimer')}
          >
            ▶ Resume
          </button>
        )}

        {/* Accept Bid always visible in manual mode while live */}
        {isLive && isManual && !awaitingHammer && (
          <button
            style={btn('#a855f7')}
            onClick={() => adminAction('admin:acceptBid')}
          >
            🔨 Hammer
          </button>
        )}

        <button
          style={btn('#ef4444', !isLive)}
          disabled={!isLive}
          onClick={() => {
            if (confirm('Mark current player as unsold?')) {
              adminAction('admin:markUnsold');
            }
          }}
        >
          ✕ Mark Unsold
        </button>
      </div>

      {/* Live settings */}
      <div style={{ background: '#0f172a', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <div>
          <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '4px' }}>
            Timer (s) — current: {settings.timerSeconds}
          </div>
          <input
            style={inputStyle}
            type="number" min="5" max="120"
            placeholder={settings.timerSeconds}
            value={timer}
            onChange={e => setTimer(e.target.value)}
          />
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '4px' }}>
            Bid bump (s) — current: {settings.timerBumpSeconds ?? 10}
          </div>
          <input
            style={inputStyle}
            type="number" min="0" max="60"
            placeholder={settings.timerBumpSeconds ?? 10}
            value={bump}
            onChange={e => setBump(e.target.value)}
          />
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '4px' }}>
            Increment — current: {settings.bidIncrement.toLocaleString()}
          </div>
          <input
            style={inputStyle}
            type="number" min="100"
            placeholder={settings.bidIncrement}
            value={increment}
            onChange={e => setIncrement(e.target.value)}
          />
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '4px' }}>
            End mode
          </div>
          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #334155' }}>
            {['timer', 'manual'].map(mode => (
              <button
                key={mode}
                onClick={() => setPendingEndMode(mode === settings.endMode && pendingEndMode === null ? null : mode)}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: displayEndMode === mode ? (mode === 'manual' ? '#a855f7' : '#3b82f6') : '#0f172a',
                  color: displayEndMode === mode ? '#fff' : '#64748b',
                  border: pendingEndMode === mode ? '1px dashed #94a3b8' : 'none',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                }}
              >
                {mode === 'timer' ? '⏱ Timer' : '🔨 Manual'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '4px' }}>
            Bid confirmation
          </div>
          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #334155' }}>
            {[true, false].map(val => (
              <button
                key={String(val)}
                onClick={() => setPendingConfirm(val === displayConfirm && pendingConfirm === null ? null : val)}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: displayConfirm === val ? (val ? '#22c55e' : '#ef4444') : '#0f172a',
                  color: displayConfirm === val ? '#fff' : '#64748b',
                  border: pendingConfirm === val ? '1px dashed #94a3b8' : 'none',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                }}
              >
                {val ? '✓ On' : '✕ Off'}
              </button>
            ))}
          </div>
        </div>

        <button
          style={btn('#475569', !hasChanges)}
          disabled={!hasChanges}
          onClick={saveSettings}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
