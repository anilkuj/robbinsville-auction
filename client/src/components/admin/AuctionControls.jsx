import React, { useState, useEffect } from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { computeMaxBid, formatPts } from '../../utils/budgetCalc.js';

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
  const { auctionState, adminAction, adminError, clearAdminError, lastEvent } = useAuction();
  const [timer, setTimer] = useState('');
  const [increment, setIncrement] = useState('');
  const [bump, setBump] = useState('');
  const [pendingEndMode, setPendingEndMode] = useState(null); // null = no change pending
  const [pendingConfirm, setPendingConfirm] = useState(null); // null = no change pending

  // Manual sale state
  const [showManualSale, setShowManualSale] = useState(false);
  const [msPlayer, setMsPlayer] = useState('');
  const [msTeam, setMsTeam] = useState('');
  const [msAmount, setMsAmount] = useState('');
  const [msLocalError, setMsLocalError] = useState('');

  // Reset manual sale form after a successful sold event
  useEffect(() => {
    if (lastEvent?.type === 'sold') {
      setMsPlayer('');
      setMsTeam('');
      setMsAmount('');
      setMsLocalError('');
      clearAdminError();
    }
  }, [lastEvent]);

  // Show server-side admin errors in the manual sale panel when it's open
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
  const isManual = settings.endMode === 'manual';
  const awaitingHammer = isLive && isManual && !timerEndsAt;

  const displayEndMode = pendingEndMode ?? settings.endMode;
  const displayConfirm = pendingConfirm ?? settings.requireBidConfirm ?? true;
  const hasChanges = timer || increment || bump !== '' || pendingEndMode !== null || pendingConfirm !== null;

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

      {/* Manual Sale */}
      {(isSetup || phase === 'ENDED') && (
        <div style={{ background: '#0f172a', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
          <button
            onClick={() => { setShowManualSale(v => !v); setMsLocalError(''); }}
            style={{
              width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600,
            }}
          >
            <span>💰 Manual Sale</span>
            <span style={{ fontSize: '0.75rem' }}>{showManualSale ? '▲ Hide' : '▼ Expand'}</span>
          </button>

          {showManualSale && (
            <div style={{ padding: '0.75rem 1rem 1rem', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>

                {/* Player dropdown */}
                <div style={{ flex: '1 1 160px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '4px' }}>Player</div>
                  <select
                    value={msPlayer}
                    onChange={e => { setMsPlayer(e.target.value); setMsLocalError(''); }}
                    style={{
                      width: '100%', background: '#1e293b', border: '1px solid #334155', color: msPlayer ? '#f1f5f9' : '#64748b',
                      borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.85rem',
                    }}
                  >
                    <option value="">— Select player —</option>
                    {availableForManualSale.length === 0 && (
                      <option disabled>No players available</option>
                    )}
                    {availableForManualSale.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.status === 'UNSOLD' ? ' (unsold)' : ''}{p.pool ? ` · ${p.pool}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team dropdown */}
                <div style={{ flex: '1 1 140px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '4px' }}>Team</div>
                  <select
                    value={msTeam}
                    onChange={e => { setMsTeam(e.target.value); setMsAmount(''); setMsLocalError(''); }}
                    style={{
                      width: '100%', background: '#1e293b', border: '1px solid #334155', color: msTeam ? '#f1f5f9' : '#64748b',
                      borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.85rem',
                    }}
                  >
                    <option value="">— Select team —</option>
                    {teamList.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({formatPts(t.budget)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount input */}
                <div style={{ flex: '1 1 120px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '4px' }}>
                    Sale amount
                    {msMaxBid !== null && (
                      <span style={{ marginLeft: '6px', color: msMaxBid <= 0 ? '#ef4444' : '#22c55e' }}>
                        (max: {formatPts(msMaxBid)})
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    placeholder="pts"
                    value={msAmount}
                    onChange={e => { setMsAmount(e.target.value); setMsLocalError(''); }}
                    disabled={!msTeam}
                    style={{
                      width: '100%', background: '#1e293b',
                      border: `1px solid ${msAmountInvalid ? '#ef4444' : '#334155'}`,
                      color: '#f1f5f9', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.85rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Submit */}
                <button
                  style={btn('#16a34a', !canSubmitManualSale)}
                  disabled={!canSubmitManualSale}
                  onClick={submitManualSale}
                >
                  Sell
                </button>
              </div>

              {/* Inline budget info for selected team */}
              {selectedTeam && (
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {selectedTeam.name}: budget {formatPts(selectedTeam.budget)}, roster {selectedTeam.roster.length}/{squadSize || 18}
                  {msMaxBid !== null && msMaxBid <= 0 && (
                    <span style={{ color: '#ef4444', marginLeft: '8px' }}>⚠ Cannot purchase any more players (budget fully reserved)</span>
                  )}
                </div>
              )}

              {/* Error message */}
              {msLocalError && (
                <div style={{
                  background: '#450a0a', border: '1px solid #ef4444', borderRadius: '6px',
                  padding: '0.5rem 0.75rem', color: '#fca5a5', fontSize: '0.8rem',
                }}>
                  ⚠ {msLocalError}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
