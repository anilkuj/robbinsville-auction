import React, { useEffect, useState, useCallback } from 'react';
import { useAuction } from '../contexts/AuctionContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from '../components/shared/Sidebar.jsx';
import PlayerCard from '../components/auction/PlayerCard.jsx';
import BidDisplay from '../components/auction/BidDisplay.jsx';
import CountdownTimer from '../components/auction/CountdownTimer.jsx';
import BidButton from '../components/auction/BidButton.jsx';
import BidHistory from '../components/auction/BidHistory.jsx';

export default function AuctionPage() {
  const { auctionState, connected, lastEvent } = useAuction();
  const { user } = useAuth();
  const [toast, setToast] = useState(null);
  const [leftWidth, setLeftWidth]   = useState(240);
  const [rightWidth, setRightWidth] = useState(380);

  // Show toasts for sold/unsold events
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'sold') {
      const { player, teamName, amount } = lastEvent.data;
      setToast({ type: 'sold', msg: `🏆 ${player.name} sold to ${teamName} for ${amount.toLocaleString()} pts` });
    } else if (lastEvent.type === 'unsold') {
      const { player } = lastEvent.data;
      setToast({ type: 'unsold', msg: `❌ ${player.name} went unsold` });
    }
  }, [lastEvent]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Drag-to-resize helpers
  const startDragLeft = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftWidth;
    const onMove = (ev) => setLeftWidth(Math.max(160, Math.min(480, startW + ev.clientX - startX)));
    const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [leftWidth]);

  const startDragRight = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightWidth;
    const onMove = (ev) => setRightWidth(Math.max(220, Math.min(700, startW + startX - ev.clientX)));
    const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [rightWidth]);

  const phase = auctionState?.phase;
  const player = auctionState?.players?.[auctionState?.currentPlayerIndex] ?? null;
  const currentBid = auctionState?.currentBid;
  const teams = auctionState?.teams;
  const settings = auctionState?.settings;
  const myTeam = auctionState?.teams?.[user?.teamId];
  const roster = myTeam?.roster ?? [];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', userSelect: 'none' }}>

      {/* Left sidebar */}
      <div style={{ display: 'none', width: leftWidth, flexShrink: 0 }} className="desktop-sidebar">
        <Sidebar width={leftWidth} />
      </div>

      {/* Left drag handle */}
      <div
        className="desktop-sidebar drag-handle"
        style={{ display: 'none' }}
        onMouseDown={startDragLeft}
        title="Drag to resize"
      />

      {/* Main content + right panel wrapper */}
      <div style={{ flex: 1, display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>

        {/* Center content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <MobileHeader user={user} auctionState={auctionState} connected={connected} />

          {toast && (
            <div style={{
              position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
              background: toast.type === 'sold' ? '#14532d' : '#1e293b',
              border: `1px solid ${toast.type === 'sold' ? '#22c55e' : '#ef4444'}`,
              color: toast.type === 'sold' ? '#22c55e' : '#ef4444',
              borderRadius: '10px', padding: '0.75rem 1.5rem',
              fontSize: '0.9rem', fontWeight: 600, zIndex: 1000,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              maxWidth: '90vw', textAlign: 'center',
            }}>
              {toast.msg}
            </div>
          )}

          <div style={{ flex: 1, padding: '1rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <PhaseBar phase={phase} playerCount={auctionState?.players?.length} />

            {phase === 'ENDED' && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#1e293b', borderRadius: '12px', marginTop: '1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                <h2 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>Auction Complete!</h2>
                <p style={{ color: '#64748b' }}>All players have been auctioned.</p>
              </div>
            )}

            {(phase === 'LIVE' || phase === 'PAUSED') && player && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                <PlayerCard player={player} />
                <PlayerExtraData player={player} />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
                  <CountdownTimer
                    timerEndsAt={auctionState.timerEndsAt}
                    timerPaused={auctionState.timerPaused}
                    timerRemainingOnPause={auctionState.timerRemainingOnPause}
                    timerSeconds={settings?.timerSeconds ?? 30}
                    endMode={settings?.endMode ?? 'timer'}
                  />
                  <div style={{ flex: 1 }}>
                    <BidDisplay currentBid={currentBid} teams={teams} player={player} />
                  </div>
                </div>
                {user.role === 'team' && <BidButton />}
                <div style={{ background: '#1e293b', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                    Bid History
                  </div>
                  <BidHistory history={currentBid?.history} />
                </div>
              </div>
            )}

            {phase === 'SETUP' && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#1e293b', borderRadius: '12px', marginTop: '1rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
                <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Waiting for next player…</p>
                {auctionState?.players?.length === 0 && (
                  <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Admin hasn't imported players yet.
                  </p>
                )}
              </div>
            )}

            {!auctionState && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>Connecting…</div>
            )}

            {/* Mobile roster */}
            {roster.length > 0 && (
              <div className="mobile-roster" style={{ marginTop: '1.5rem', background: '#1e293b', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>My Squad</span>
                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{roster.length} player{roster.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ padding: '0.25rem 0' }}>
                  <div style={{ padding: '0.3rem 1rem', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem' }}>
                    <span style={{ color: '#475569', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Player</span>
                    <span style={{ color: '#475569', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pool</span>
                    <span style={{ color: '#475569', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Price</span>
                  </div>
                  {roster.map((r, i) => (
                    <div key={r.playerId || i} style={{ padding: '0.35rem 1rem', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem', alignItems: 'center', background: i % 2 === 0 ? 'transparent' : '#0f172a30', borderTop: '1px solid #0f172a' }}>
                      <span style={{ fontSize: '0.82rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.playerName}</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', padding: '0.1rem 0.3rem' }}>{r.pool}</span>
                      <span style={{ fontSize: '0.82rem', color: '#22c55e', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{r.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right drag handle */}
        <div
          className="desktop-right-panel drag-handle"
          style={{ display: 'none' }}
          onMouseDown={startDragRight}
          title="Drag to resize"
        />

        {/* Right panel */}
        <div style={{ display: 'none' }} className="desktop-right-panel">
          <RemainingPlayersPanel
            players={auctionState?.players}
            pools={auctionState?.leagueConfig?.pools}
            currentPlayerId={player?.id ?? null}
            width={rightWidth}
          />
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-roster { display: none !important; }
        }
        @media (min-width: 1100px) {
          .desktop-right-panel { display: flex !important; }
        }
        .drag-handle {
          width: 5px !important;
          flex-shrink: 0;
          cursor: col-resize;
          background: #1e293b;
          transition: background 0.15s;
          z-index: 10;
        }
        .drag-handle:hover { background: #334155; }
      `}</style>
    </div>
  );
}

// ── Pool colour helper ─────────────────────────────────────────────────────────

function poolColor(poolId) {
  if (poolId.startsWith('A')) return { bg: '#1c0d00', border: '#f59e0b', text: '#f59e0b' };
  if (poolId.startsWith('B')) return { bg: '#0d1c35', border: '#3b82f6', text: '#60a5fa' };
  if (poolId === 'C')         return { bg: '#150d2e', border: '#8b5cf6', text: '#a78bfa' };
  return { bg: '#0f1a2e', border: '#64748b', text: '#94a3b8' };
}

// ── Player extra data card (shown on bid screen) ───────────────────────────────

function PlayerExtraData({ player }) {
  if (!player?.extra) return null;
  const entries = Object.entries(player.extra).filter(([, v]) => v);
  if (entries.length === 0) return null;

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '10px',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(entries.length, 4)}, 1fr)`,
    }}>
      {entries.map(([k, v], i) => (
        <div key={k} style={{
          padding: '0.65rem 1rem',
          borderLeft: i > 0 ? '1px solid #334155' : 'none',
        }}>
          <div style={{ color: '#64748b', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '4px' }}>
            {k}
          </div>
          <div style={{ color: '#f1f5f9', fontSize: '0.92rem', fontWeight: 600 }}>
            {v}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Right panel (simplified: Name · Pool · Base only) ─────────────────────────

function RemainingPlayersPanel({ players, pools, currentPlayerId, width = 280 }) {
  if (!players || !pools) return null;

  const pending = players.filter(p => p.status === 'PENDING');
  const poolOrder = pools.map(p => p.id);
  const byPool = {};
  for (const p of pending) {
    if (!byPool[p.pool]) byPool[p.pool] = [];
    byPool[p.pool].push(p);
  }
  const orderedPools = poolOrder.filter(id => byPool[id]?.length > 0);

  const GRID = 'minmax(0,1fr) auto auto';

  return (
    <div style={{
      width,
      flexShrink: 0,
      borderLeft: '1px solid #1e293b',
      background: '#0a111e',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100vh',
      position: 'sticky',
      top: 0,
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
                  <PColHead label="Player" first />
                  <PColHead label="Pool" />
                  <PColHead label="Base" right />
                </div>

                {/* Player rows */}
                {poolPlayers.map((p, rowIdx) => {
                  const isOnBlock = p.id === currentPlayerId;
                  const rowBg = isOnBlock ? '#0c1a10' : rowIdx % 2 === 0 ? 'transparent' : '#0d1825';
                  return (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: GRID, background: rowBg, borderBottom: '1px solid #0f172a' }}>
                      <PCell first style={{ color: isOnBlock ? '#22c55e' : '#cbd5e1', fontWeight: isOnBlock ? 700 : 400 }}>
                        {isOnBlock && <span style={{ marginRight: '4px' }}>▶</span>}{p.name}
                      </PCell>
                      <PCell center>
                        <span style={{
                          background: clr.bg, color: clr.text,
                          border: `1px solid ${clr.border}50`,
                          borderRadius: '4px', padding: '0.1rem 0.35rem',
                          fontSize: '0.65rem', fontWeight: 700,
                        }}>{p.pool}</span>
                      </PCell>
                      <PCell right style={{ color: isOnBlock ? '#22c55e' : '#475569', fontWeight: isOnBlock ? 700 : 400 }}>
                        {fmtPts(p.basePrice)}
                      </PCell>
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

function PColHead({ label, first, right }) {
  return (
    <span style={{
      padding: '0.3rem 0.6rem',
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

function PCell({ children, first, right, center, style = {} }) {
  return (
    <span style={{
      padding: '0.32rem 0.6rem',
      fontSize: '0.74rem',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      borderLeft: first ? 'none' : '1px solid #1e293b',
      textAlign: right ? 'right' : center ? 'center' : 'left',
      alignSelf: 'center',
      display: 'flex', alignItems: 'center',
      justifyContent: right ? 'flex-end' : center ? 'center' : 'flex-start',
      ...(first && { paddingLeft: '1rem' }),
      ...(right && { paddingRight: '1rem' }),
      ...style,
    }}>{children}</span>
  );
}

// ── Other components ───────────────────────────────────────────────────────────

function PhaseBar({ phase, playerCount }) {
  const labels = {
    SETUP: { text: 'Setup', color: '#64748b' },
    LIVE: { text: '● LIVE', color: '#22c55e' },
    PAUSED: { text: '⏸ Paused', color: '#f59e0b' },
    ENDED: { text: 'Ended', color: '#94a3b8' },
  };
  const cfg = labels[phase] || labels.SETUP;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', marginBottom: '0.25rem' }}>
      <span style={{ color: cfg.color, fontWeight: 700, fontSize: '0.9rem' }}>{cfg.text}</span>
      {playerCount > 0 && <span style={{ color: '#475569', fontSize: '0.8rem' }}>{playerCount} players total</span>}
    </div>
  );
}

function MobileHeader({ user, auctionState, connected }) {
  const team = auctionState?.teams?.[user?.teamId];
  const { logout } = useAuth();
  return (
    <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem' }}>🏏</span>
        <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.95rem' }}>RPL</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {team && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 600 }}>{team.name}</div>
            <div style={{ color: '#22c55e', fontSize: '0.75rem' }}>{team.budget.toLocaleString()} pts</div>
          </div>
        )}
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444' }} />
      </div>
    </div>
  );
}

function fmtPts(n) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return n?.toLocaleString() ?? '0';
}
