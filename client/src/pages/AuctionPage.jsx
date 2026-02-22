import React, { useEffect, useState } from 'react';
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

  const phase = auctionState?.phase;
  const player = auctionState?.players?.[auctionState?.currentPlayerIndex] ?? null;
  const currentBid = auctionState?.currentBid;
  const teams = auctionState?.teams;
  const settings = auctionState?.settings;
  const myTeam = auctionState?.teams?.[user?.teamId];
  const roster = myTeam?.roster ?? [];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left sidebar — hidden on mobile, shown on larger screens */}
      <div style={{ display: 'none' }} className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Main content + right panel wrapper */}
      <div style={{ flex: 1, display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>

        {/* Center content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Mobile header */}
          <MobileHeader user={user} auctionState={auctionState} connected={connected} />

          {/* Toast */}
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

            {/* Phase display */}
            <PhaseBar phase={phase} playerCount={auctionState?.players?.length} />

            {phase === 'ENDED' && (
              <div style={{
                textAlign: 'center', padding: '3rem 1rem',
                background: '#1e293b', borderRadius: '12px', marginTop: '1rem',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                <h2 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>Auction Complete!</h2>
                <p style={{ color: '#64748b' }}>All players have been auctioned.</p>
              </div>
            )}

            {(phase === 'LIVE' || phase === 'PAUSED') && player && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                <PlayerCard player={player} />

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
              <div style={{
                textAlign: 'center', padding: '3rem 1rem',
                background: '#1e293b', borderRadius: '12px', marginTop: '1rem',
              }}>
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
              <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
                Connecting…
              </div>
            )}

            {/* Mobile roster — shown below main content on small screens */}
            {roster.length > 0 && (
              <div className="mobile-roster" style={{
                marginTop: '1.5rem',
                background: '#1e293b',
                borderRadius: '10px',
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '0.6rem 1rem',
                  borderBottom: '1px solid #334155',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    My Squad
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                    {roster.length} player{roster.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ padding: '0.25rem 0' }}>
                  {/* Header row */}
                  <div style={{
                    padding: '0.3rem 1rem',
                    display: 'grid', gridTemplateColumns: '1fr auto auto',
                    gap: '0.5rem',
                  }}>
                    <span style={{ color: '#475569', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Player</span>
                    <span style={{ color: '#475569', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pool</span>
                    <span style={{ color: '#475569', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Price</span>
                  </div>
                  {roster.map((r, i) => (
                    <div key={r.playerId || i}>
                      <div style={{
                        padding: '0.35rem 1rem',
                        display: 'grid', gridTemplateColumns: '1fr auto auto',
                        gap: '0.5rem', alignItems: 'center',
                        background: i % 2 === 0 ? 'transparent' : '#0f172a20',
                        borderTop: '1px solid #0f172a',
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
                      {r.extra && Object.entries(r.extra).length > 0 && (
                        <div style={{
                          padding: '0.2rem 1rem 0.35rem',
                          display: 'flex', flexWrap: 'wrap', gap: '0.3rem',
                          background: i % 2 === 0 ? 'transparent' : '#0f172a20',
                          borderTop: '1px solid #0a0f1a',
                        }}>
                          {Object.entries(r.extra).map(([k, v]) => v && (
                            <span key={k} style={{
                              fontSize: '0.62rem', color: '#475569',
                              background: '#0f172a', borderRadius: '3px',
                              padding: '0.1rem 0.35rem',
                            }}>
                              <span style={{ color: '#334155' }}>{k}: </span>
                              <span style={{ color: '#64748b' }}>{v}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — remaining players with extra data, desktop only */}
        <div style={{ display: 'none' }} className="desktop-right-panel">
          <RemainingPlayersPanel
            players={auctionState?.players}
            pools={auctionState?.leagueConfig?.pools}
            currentPlayerId={player?.id ?? null}
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
      `}</style>
    </div>
  );
}

function RemainingPlayersPanel({ players, pools, currentPlayerId }) {
  if (!players || !pools) return null;

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
      width: '220px',
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
          Remaining
        </span>
        <span style={{
          background: '#1e293b', color: '#f59e0b',
          borderRadius: '999px', padding: '0.1rem 0.5rem',
          fontSize: '0.68rem', fontWeight: 700,
        }}>
          {pending.length}
        </span>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {pending.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#334155', fontSize: '0.8rem' }}>
            No players remaining
          </div>
        ) : (
          orderedPools.map(poolId => (
            <div key={poolId}>
              {/* Pool header */}
              <div style={{
                padding: '0.4rem 1rem',
                background: '#0f172a',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}>
                <span style={{ color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  Pool {poolId}
                </span>
                <span style={{ color: '#475569', fontSize: '0.65rem' }}>{byPool[poolId].length}</span>
              </div>

              {/* Players in pool */}
              {byPool[poolId].map((p) => {
                const isOnBlock = p.id === currentPlayerId;
                const hasExtra = p.extra && Object.keys(p.extra).length > 0;
                return (
                  <div key={p.id} style={{
                    borderBottom: '1px solid #0f172a',
                    background: isOnBlock ? '#0c1a10' : 'transparent',
                  }}>
                    <div style={{
                      padding: '0.35rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}>
                      <span style={{
                        fontSize: '0.78rem',
                        color: isOnBlock ? '#22c55e' : '#cbd5e1',
                        fontWeight: isOnBlock ? 700 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}>
                        {isOnBlock && <span style={{ marginRight: '4px' }}>▶</span>}
                        {p.name}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        color: isOnBlock ? '#22c55e' : '#475569',
                        fontWeight: isOnBlock ? 700 : 400,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}>
                        {fmtPts(p.basePrice)}
                      </span>
                    </div>
                    {hasExtra && (
                      <div style={{
                        padding: '0 1rem 0.3rem',
                        display: 'flex', flexWrap: 'wrap', gap: '0.25rem',
                      }}>
                        {Object.entries(p.extra).map(([k, v]) => v && (
                          <span key={k} style={{
                            fontSize: '0.6rem',
                            color: '#475569',
                            background: '#0f172a',
                            borderRadius: '3px',
                            padding: '0.08rem 0.3rem',
                          }}>
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PhaseBar({ phase, playerCount }) {
  const labels = {
    SETUP: { text: 'Setup', color: '#64748b' },
    LIVE: { text: '● LIVE', color: '#22c55e' },
    PAUSED: { text: '⏸ Paused', color: '#f59e0b' },
    ENDED: { text: 'Ended', color: '#94a3b8' },
  };
  const cfg = labels[phase] || labels.SETUP;

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.5rem 0', marginBottom: '0.25rem',
    }}>
      <span style={{ color: cfg.color, fontWeight: 700, fontSize: '0.9rem' }}>{cfg.text}</span>
      {playerCount > 0 && (
        <span style={{ color: '#475569', fontSize: '0.8rem' }}>{playerCount} players total</span>
      )}
    </div>
  );
}

function MobileHeader({ user, auctionState, connected }) {
  const team = auctionState?.teams?.[user?.teamId];
  const { logout } = useAuth();

  return (
    <div style={{
      background: '#1e293b',
      borderBottom: '1px solid #334155',
      padding: '0.75rem 1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem' }}>🏏</span>
        <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.95rem' }}>RPL</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {team && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 600 }}>{team.name}</div>
            <div style={{ color: '#22c55e', fontSize: '0.75rem' }}>
              {team.budget.toLocaleString()} pts
            </div>
          </div>
        )}
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: connected ? '#22c55e' : '#ef4444',
        }} />
      </div>
    </div>
  );
}

function fmtPts(n) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return n?.toLocaleString() ?? '0';
}
