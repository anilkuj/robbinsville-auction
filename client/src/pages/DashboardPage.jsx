import React, { useEffect, useState, useRef } from 'react';
import DashboardView from '../components/admin/DashboardView.jsx';
import { io } from 'socket.io-client';

export default function DashboardPage() {
  const [pinRequired, setPinRequired] = useState(null); // null = loading
  const [spectatorToken, setSpectatorToken] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  // Step 1: Fetch dashboard settings to know if PIN is required
  useEffect(() => {
    fetch('/api/public/dashboard-settings')
      .then(r => r.json())
      .then(data => setPinRequired(data.requiresPin))
      .catch(() => setPinRequired(false));
  }, []);

  // Step 2: Connect socket once PIN gate is cleared
  useEffect(() => {
    if (pinRequired === null) return; // still loading settings
    if (pinRequired && !spectatorToken) return; // waiting for PIN

    const socketOpts = {
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 5000,
    };
    if (spectatorToken) socketOpts.auth = { token: spectatorToken };

    const socket = io('/', socketOpts);
    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      if (err.message === 'Dashboard requires PIN authentication') {
        setPinRequired(true);
        setSpectatorToken(null);
      }
    });

    const set = (s) => setState(s);
    socket.on('state:full',              set);
    socket.on('auction:playerUp',        set);
    socket.on('auction:paused',          set);
    socket.on('auction:resumed',         set);
    socket.on('auction:settingsChanged', set);
    socket.on('auction:phaseChange',     set);
    socket.on('auction:awaitingHammer',  set);
    socket.on('auction:bid',    ({ publicState }) => setState(publicState));
    socket.on('auction:sold',   ({ publicState }) => setState(publicState));
    socket.on('auction:unsold', ({ publicState }) => setState(publicState));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [pinRequired, spectatorToken]);

  async function handlePinSubmit(e) {
    e.preventDefault();
    setPinError('');
    setPinLoading(true);
    try {
      const res = await fetch('/api/public/dashboard-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'Invalid PIN');
        return;
      }
      setSpectatorToken(data.token);
    } catch {
      setPinError('Connection error — is the server running?');
    } finally {
      setPinLoading(false);
    }
  }

  // ── Loading PIN settings ──────────────────────────────────────────────────
  if (pinRequired === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#475569', fontSize: '1rem' }}>
        Connecting…
      </div>
    );
  }

  // ── PIN gate ──────────────────────────────────────────────────────────────
  if (pinRequired && !spectatorToken) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a' }}>
        <div style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
          padding: '2.5rem 2rem', width: '320px', display: 'flex', flexDirection: 'column', gap: '1.25rem',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏏</div>
            <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: '1.15rem' }}>RPL Dashboard</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>Enter the PIN to view the live auction</div>
          </div>

          <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="password"
              placeholder="Enter PIN"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              autoFocus
              style={{
                background: '#0f172a', border: `1px solid ${pinError ? '#ef4444' : '#334155'}`,
                color: '#f1f5f9', borderRadius: '8px',
                padding: '0.6rem 0.9rem', fontSize: '1rem',
                outline: 'none', textAlign: 'center', letterSpacing: '0.2em',
              }}
            />
            {pinError && (
              <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>{pinError}</div>
            )}
            <button
              type="submit"
              disabled={!pinInput || pinLoading}
              style={{
                background: pinInput && !pinLoading ? '#f59e0b' : '#334155',
                color: '#fff', border: 'none', borderRadius: '8px',
                padding: '0.65rem', fontSize: '0.95rem', fontWeight: 700,
                cursor: pinInput && !pinLoading ? 'pointer' : 'not-allowed',
              }}
            >
              {pinLoading ? 'Checking…' : 'Enter Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Connecting to socket ───────────────────────────────────────────────────
  if (!state) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#475569', fontSize: '1rem' }}>
        Connecting to auction…
      </div>
    );
  }

  const { phase, players } = state;

  const totalSold   = players.filter(p => p.status === 'SOLD').length;
  const totalUnsold = players.filter(p => p.status === 'UNSOLD').length;
  const totalPending = players.filter(p => p.status === 'PENDING').length;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        background: '#1e293b', borderBottom: '1px solid #334155',
        padding: '0.75rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🏏</span>
          <div>
            <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1.05rem' }}>RPL Auction</div>
            <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Live Team Dashboard</div>
          </div>
          {phase !== 'SETUP' && <PhaseChip phase={phase} awaitingHammer={phase === 'LIVE' && !state.timerEndsAt && state.settings?.endMode === 'manual'} />}
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {/* Auction stats */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            {[
              { label: 'Sold',    val: totalSold,    color: '#22c55e' },
              { label: 'Unsold',  val: totalUnsold,  color: '#ef4444' },
              { label: 'Pending', val: totalPending, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ color: s.color, fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}>{s.val}</div>
                <div style={{ color: '#475569', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Connection dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444' }} />
            {connected ? 'Live' : 'Reconnecting…'}
          </div>
        </div>
      </div>

      <DashboardView state={state} />
    </div>
  );
}

function PhaseChip({ phase, awaitingHammer }) {
  const cfg = {
    SETUP:  { label: 'Setup',       bg: '#1e293b', color: '#64748b' },
    LIVE:   { label: '● Live',      bg: '#14532d', color: '#22c55e' },
    PAUSED: { label: '⏸ Paused',    bg: '#451a03', color: '#f59e0b' },
    ENDED:  { label: 'Ended',       bg: '#1e293b', color: '#94a3b8' },
  }[phase] || { label: phase, bg: '#1e293b', color: '#94a3b8' };

  if (awaitingHammer) {
    cfg.label = '🔨 Hammer';
    cfg.bg    = '#2e1065';
    cfg.color = '#a855f7';
  }

  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: '999px', padding: '0.15rem 0.65rem',
      fontSize: '0.72rem', fontWeight: 700,
    }}>
      {cfg.label}
    </span>
  );
}

