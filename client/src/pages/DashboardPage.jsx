import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export default function DashboardPage() {
  const [pinRequired, setPinRequired] = useState(null); // null = loading
  const [spectatorToken, setSpectatorToken] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [rightWidth, setRightWidth] = useState(380);

  const startDragRight = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightWidth;
    const onMove = (ev) => setRightWidth(Math.max(220, Math.min(700, startW + startX - ev.clientX)));
    const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [rightWidth]);
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

  const { phase, teams, leagueConfig, players, currentPlayerIndex } = state;
  const startingBudget = leagueConfig?.startingBudget ?? 0;
  const squadSize      = leagueConfig?.squadSize ?? 0;
  const currentPlayer  = (phase === 'LIVE' || phase === 'PAUSED') ? players?.[currentPlayerIndex] : null;

  const teamList = Object.values(teams).sort((a, b) => a.name.localeCompare(b.name));

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
          <PhaseChip phase={phase} awaitingHammer={phase === 'LIVE' && !state.timerEndsAt && state.settings?.endMode === 'manual'} />
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

      {/* ── Current player banner (when LIVE) ── */}
      {currentPlayer && (
        <div style={{
          background: phase === 'PAUSED' ? '#1c0a00' : '#0c1a10',
          borderBottom: `1px solid ${phase === 'PAUSED' ? '#92400e' : '#166534'}`,
          padding: '0.6rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>On Block</span>
            <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{currentPlayer.name}</span>
            <span style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: '4px',
              padding: '0.1rem 0.4rem', fontSize: '0.7rem', color: '#94a3b8',
            }}>{currentPlayer.pool}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Current Bid</span>
            <span style={{ fontWeight: 800, color: '#22c55e', fontSize: '1.1rem' }}>
              {state.currentBid?.amount?.toLocaleString()} pts
            </span>
            {state.currentBid?.teamId && (
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                — {teams[state.currentBid.teamId]?.name}
              </span>
            )}
          </div>
          {phase === 'PAUSED' && (
            <span style={{ color: '#f59e0b', fontSize: '0.78rem', fontWeight: 600 }}>⏸ PAUSED</span>
          )}
        </div>
      )}

      {/* ── Main content: teams grid + remaining players pane ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Teams grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem',
          }}>
            {teamList.map(team => (
              <TeamCard
                key={team.id}
                team={team}
                startingBudget={startingBudget}
                squadSize={squadSize}
                isLeading={state.currentBid?.teamId === team.id}
              />
            ))}
          </div>

          {teamList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#475569' }}>
              No teams configured yet. Admin needs to complete League Setup.
            </div>
          )}
        </div>

        {/* Right drag handle */}
        <div
          onMouseDown={startDragRight}
          title="Drag to resize"
          style={{ width: '5px', flexShrink: 0, cursor: 'col-resize', background: '#1e293b', transition: 'background 0.15s', zIndex: 10 }}
          onMouseEnter={e => e.currentTarget.style.background = '#334155'}
          onMouseLeave={e => e.currentTarget.style.background = '#1e293b'}
        />

        {/* Remaining players pane */}
        <RemainingPlayersPane
          players={players}
          pools={leagueConfig?.pools ?? []}
          currentPlayerId={currentPlayer?.id ?? null}
          width={rightWidth}
        />
      </div>
    </div>
  );
}

// ── Remaining Players Pane ────────────────────────────────────────────────────

function RemainingPlayersPane({ players, pools, currentPlayerId, width = 380 }) {
  const pending = players.filter(p => p.status === 'PENDING');

  const poolOrder = pools.map(p => p.id);
  const byPool = {};
  for (const p of pending) {
    if (!byPool[p.pool]) byPool[p.pool] = [];
    byPool[p.pool].push(p);
  }
  const orderedPools = poolOrder.filter(id => byPool[id]?.length > 0);

  return (
    <div style={{
      width,
      flexShrink: 0,
      borderLeft: '1px solid #1e293b',
      background: '#0a111e',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Pane header */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        background: '#0f172a',
      }}>
        <span style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Remaining Players
        </span>
        <span style={{ background: '#1e293b', color: '#f59e0b', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.68rem', fontWeight: 700 }}>
          {pending.length}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {pending.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#334155', fontSize: '0.8rem' }}>
            No players remaining
          </div>
        ) : (
          orderedPools.map(poolId => {
            const poolPlayers = byPool[poolId];
            const clr = poolColor(poolId);
            const GRID = 'minmax(0,1fr) auto auto';

            return (
              <div key={poolId}>
                {/* Pool header */}
                <div style={{
                  padding: '0.45rem 1rem',
                  background: clr.bg,
                  borderTop: `2px solid ${clr.border}`,
                  borderBottom: `1px solid ${clr.border}50`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}>
                  <span style={{ color: clr.text, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                    Pool {poolId}
                  </span>
                  <span style={{ color: clr.text, fontSize: '0.68rem', fontWeight: 700, opacity: 0.75 }}>
                    {poolPlayers.length}
                  </span>
                </div>

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: GRID, background: '#0c1521', borderBottom: `1px solid ${clr.border}30` }}>
                  <DColHead label="Player" first />
                  <DColHead label="Pool" />
                  <DColHead label="Base" right />
                </div>

                {/* Player rows */}
                {poolPlayers.map((player, rowIdx) => {
                  const isOnBlock = player.id === currentPlayerId;
                  const rowBg = isOnBlock ? '#0c1a10' : rowIdx % 2 === 0 ? 'transparent' : '#0d1825';
                  return (
                    <div key={player.id} style={{ display: 'grid', gridTemplateColumns: GRID, background: rowBg, borderBottom: '1px solid #0f172a' }}>
                      <DCell first style={{ color: isOnBlock ? '#22c55e' : '#cbd5e1', fontWeight: isOnBlock ? 700 : 400 }}>
                        {isOnBlock && <span style={{ marginRight: '4px' }}>▶</span>}
                        {player.name}
                      </DCell>
                      <DCell center>
                        <span style={{
                          background: clr.bg, color: clr.text,
                          border: `1px solid ${clr.border}50`,
                          borderRadius: '4px', padding: '0.1rem 0.35rem',
                          fontSize: '0.65rem', fontWeight: 700,
                        }}>{player.pool}</span>
                      </DCell>
                      <DCell right style={{ color: isOnBlock ? '#22c55e' : '#475569', fontWeight: isOnBlock ? 700 : 400 }}>
                        {fmtPts(player.basePrice)}
                      </DCell>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Team Card ─────────────────────────────────────────────────────────────────

function TeamCard({ team, startingBudget, squadSize, isLeading }) {
  const spent     = startingBudget - team.budget;
  const spentPct  = startingBudget > 0 ? (spent / startingBudget) * 100 : 0;
  const roster    = team.roster ?? [];

  return (
    <div style={{
      background: '#1e293b',
      border: `1px solid ${isLeading ? '#22c55e' : '#334155'}`,
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: isLeading ? '0 0 0 1px #22c55e40' : 'none',
      transition: 'border-color 0.3s',
    }}>
      {/* Team header */}
      <div style={{
        padding: '0.85rem 1rem',
        borderBottom: '1px solid #334155',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>🏏</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{team.name}</span>
          {isLeading && (
            <span style={{
              background: '#14532d', color: '#22c55e', border: '1px solid #22c55e40',
              borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.65rem', fontWeight: 700,
            }}>● LEADING</span>
          )}
        </div>
        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
          {roster.length} / {squadSize} players
        </span>
      </div>

      {/* Budget stats */}
      <div style={{ padding: '0.85rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', borderBottom: '1px solid #1e293b' }}>
        <Stat label="Initial Budget" value={fmtPts(startingBudget)} color="#94a3b8" />
        <Stat label="Spent"          value={fmtPts(spent)}          color="#ef4444" />
        <Stat label="Remaining"      value={fmtPts(team.budget)}    color="#22c55e" />
      </div>

      {/* Spend progress bar */}
      <div style={{ padding: '0 1rem 0.75rem' }}>
        <div style={{ height: '4px', background: '#0f172a', borderRadius: '2px', marginTop: '0.6rem' }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            width: `${Math.min(100, spentPct)}%`,
            background: spentPct > 80 ? '#ef4444' : spentPct > 60 ? '#f59e0b' : '#22c55e',
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
          <span style={{ fontSize: '0.65rem', color: '#475569' }}>0</span>
          <span style={{ fontSize: '0.65rem', color: '#475569' }}>{spentPct.toFixed(0)}% spent</span>
          <span style={{ fontSize: '0.65rem', color: '#475569' }}>{fmtPts(startingBudget)}</span>
        </div>
      </div>

      {/* Roster list */}
      {roster.length > 0 ? (
        <div style={{ borderTop: '1px solid #334155' }}>
          <div style={{
            padding: '0.4rem 1rem',
            display: 'grid', gridTemplateColumns: '1fr auto auto',
            gap: '0.5rem',
          }}>
            <span style={{ color: '#475569', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Player</span>
            <span style={{ color: '#475569', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pool</span>
            <span style={{ color: '#475569', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Price</span>
          </div>
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {roster.map((r, i) => (
              <div key={i} style={{
                borderTop: '1px solid #1e293b',
                background: i % 2 === 0 ? 'transparent' : '#0f172a20',
              }}>
                <div style={{
                  padding: '0.35rem 1rem',
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: '0.5rem', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.82rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.playerName}
                  </span>
                  <span style={{
                    fontSize: '0.68rem', color: '#64748b',
                    background: '#0f172a', border: '1px solid #334155',
                    borderRadius: '4px', padding: '0.1rem 0.3rem',
                  }}>
                    {r.pool}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#22c55e', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {r.price.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #334155', color: '#334155', fontSize: '0.8rem', textAlign: 'center' }}>
          No players yet
        </div>
      )}
    </div>
  );
}

// ── Panel helpers ─────────────────────────────────────────────────────────────

function poolColor(poolId) {
  if (poolId.startsWith('A')) return { bg: '#1c0d00', border: '#f59e0b', text: '#f59e0b' };
  if (poolId.startsWith('B')) return { bg: '#0d1c35', border: '#3b82f6', text: '#60a5fa' };
  if (poolId === 'C')         return { bg: '#150d2e', border: '#8b5cf6', text: '#a78bfa' };
  return { bg: '#0f1a2e', border: '#64748b', text: '#94a3b8' };
}

function DColHead({ label, first, right }) {
  return (
    <span style={{
      padding: '0.32rem 0.6rem',
      fontSize: '0.62rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      color: '#64748b',
      borderLeft: first ? 'none' : '1px solid #1e293b',
      textAlign: right ? 'right' : first ? 'left' : 'center',
      whiteSpace: 'nowrap',
      ...(first && { paddingLeft: '1rem' }),
      ...(right && { paddingRight: '1rem' }),
    }}>{label}</span>
  );
}

function DCell({ children, first, right, center, style = {} }) {
  return (
    <span style={{
      padding: '0.32rem 0.6rem',
      fontSize: '0.74rem',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      borderLeft: first ? 'none' : '1px solid #1e293b',
      display: 'flex', alignItems: 'center',
      justifyContent: right ? 'flex-end' : center ? 'center' : 'flex-start',
      ...(first && { paddingLeft: '1rem' }),
      ...(right && { paddingRight: '1rem' }),
      ...style,
    }}>{children}</span>
  );
}

// ── Other helpers ─────────────────────────────────────────────────────────────

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ color: '#475569', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
      <div style={{ color, fontWeight: 700, fontSize: '0.88rem' }}>{value}</div>
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

function fmtPts(n) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return n?.toLocaleString() ?? '0';
}
