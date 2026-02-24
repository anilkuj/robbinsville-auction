import React, { useEffect, useState, useCallback } from 'react';
import { useAuction } from '../contexts/AuctionContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from '../components/shared/Sidebar.jsx';
import PlayerCard from '../components/auction/PlayerCard.jsx';
import BidDisplay from '../components/auction/BidDisplay.jsx';
import CountdownTimer from '../components/auction/CountdownTimer.jsx';
import BidButton from '../components/auction/BidButton.jsx';
import BidHistory from '../components/auction/BidHistory.jsx';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { formatPts } from '../utils/budgetCalc.js';

export default function AuctionPage() {
  const { auctionState, connected, lastEvent } = useAuction();
  const { user } = useAuth();
  const [toast, setToast] = useState(null);
  const [leftWidth, setLeftWidth]   = useState(240);
  const [rightWidth, setRightWidth] = useState(380);

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
    <Box sx={{ display: 'flex', minHeight: '100vh', userSelect: 'none' }}>

      {/* Left sidebar */}
      <Box style={{ display: 'none' }} className="desktop-sidebar">
        <Sidebar width={leftWidth} />
      </Box>

      {/* Left drag handle */}
      <div
        className="desktop-sidebar drag-handle"
        style={{ display: 'none' }}
        onMouseDown={startDragLeft}
        title="Drag to resize"
      />

      {/* Main content + right panel wrapper */}
      <Box sx={{ flex: 1, display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>

        {/* Center content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <MobileHeader user={user} auctionState={auctionState} connected={connected} />

          {toast && (
            <Paper sx={{
              position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
              bgcolor: toast.type === 'sold' ? '#14532d' : '#1e293b',
              border: '1px solid',
              borderColor: toast.type === 'sold' ? 'success.main' : 'error.main',
              color: toast.type === 'sold' ? 'success.main' : 'error.main',
              borderRadius: 2.5, px: 3, py: 1.5,
              fontSize: '0.9rem', fontWeight: 600, zIndex: 1000,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              maxWidth: '90vw', textAlign: 'center',
            }}>
              {toast.msg}
            </Paper>
          )}

          <Box sx={{ flex: 1, p: 2, maxWidth: 600, mx: 'auto', width: '100%' }}>
            <PhaseBar phase={phase} playerCount={auctionState?.players?.length} />

            {phase === 'ENDED' && (
              <Paper sx={{ textAlign: 'center', p: 4, mt: 1 }}>
                <Typography sx={{ fontSize: '3rem', mb: 1 }}>🏆</Typography>
                <Typography variant="h5" fontWeight={800} color="primary" sx={{ mb: 0.5 }}>Auction Complete!</Typography>
                <Typography color="text.secondary">All players have been auctioned.</Typography>
              </Paper>
            )}

            {(phase === 'LIVE' || phase === 'PAUSED') && player && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <PlayerCard player={player} />
                <PlayerExtraData player={player} />
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                  <CountdownTimer
                    timerEndsAt={auctionState.timerEndsAt}
                    timerPaused={auctionState.timerPaused}
                    timerRemainingOnPause={auctionState.timerRemainingOnPause}
                    timerSeconds={settings?.timerSeconds ?? 30}
                    endMode={settings?.endMode ?? 'timer'}
                  />
                  <Box sx={{ flex: 1 }}>
                    <BidDisplay currentBid={currentBid} teams={teams} player={player} />
                  </Box>
                </Box>
                {user.role === 'team' && <BidButton />}
                <Paper sx={{ p: 2 }}>
                  <Typography variant="overline" color="text.disabled" display="block" sx={{ mb: 1 }}>
                    Bid History
                  </Typography>
                  <BidHistory history={currentBid?.history} />
                </Paper>
              </Box>
            )}

            {phase === 'SETUP' && (
              <Paper sx={{ textAlign: 'center', p: 4, mt: 1 }}>
                <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>⏳</Typography>
                <Typography color="text.secondary" fontSize="1.1rem">Waiting for next player…</Typography>
                {auctionState?.players?.length === 0 && (
                  <Typography color="text.disabled" fontSize="0.85rem" sx={{ mt: 0.5 }}>
                    Admin hasn't imported players yet.
                  </Typography>
                )}
              </Paper>
            )}

            {!auctionState && (
              <Typography color="text.disabled" sx={{ textAlign: 'center', p: 4 }}>Connecting…</Typography>
            )}

            {/* Mobile roster */}
            {roster.length > 0 && (
              <Paper className="mobile-roster" sx={{ mt: 2, overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={600}>My Squad</Typography>
                  <Typography variant="caption" color="text.disabled">{roster.length} player{roster.length !== 1 ? 's' : ''}</Typography>
                </Box>
                <Box sx={{ py: 0.5 }}>
                  <Box sx={{ px: 2, py: 0.5, display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 1 }}>
                    {['Player','Pool','Price'].map(h => (
                      <Typography key={h} variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h === 'Price' ? 'right' : 'left' }}>{h}</Typography>
                    ))}
                  </Box>
                  {roster.map((r, i) => (
                    <Box key={r.playerId || i} sx={{ px: 2, py: 0.5, display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 1, alignItems: 'center', bgcolor: i % 2 === 0 ? 'transparent' : 'background.default', borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" noWrap>{r.playerName}</Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 0.5, px: 0.5 }}>{r.pool}</Typography>
                      <Typography variant="body2" color="success.main" fontWeight={600} sx={{ textAlign: 'right' }}>{r.price.toLocaleString()}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}
          </Box>
        </Box>

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
      </Box>

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
    </Box>
  );
}

// ── Pool colour helper ─────────────────────────────────────────────────────────

function poolColor(poolId) {
  if (poolId.startsWith('A')) return { bg: '#1c0d00', border: '#f59e0b', text: '#f59e0b' };
  if (poolId.startsWith('B')) return { bg: '#0d1c35', border: '#3b82f6', text: '#60a5fa' };
  if (poolId === 'C')         return { bg: '#150d2e', border: '#8b5cf6', text: '#a78bfa' };
  return { bg: '#0f1a2e', border: '#64748b', text: '#94a3b8' };
}

// ── Player extra data card ─────────────────────────────────────────────────────

function PlayerExtraData({ player }) {
  if (!player?.extra) return null;
  const entries = Object.entries(player.extra).filter(([, v]) => v);
  if (entries.length === 0) return null;

  return (
    <Paper sx={{ overflow: 'hidden', display: 'grid', gridTemplateColumns: `repeat(${Math.min(entries.length, 4)}, 1fr)` }}>
      {entries.map(([k, v], i) => (
        <Box key={k} sx={{ p: '0.65rem 1rem', borderLeft: i > 0 ? '1px solid' : 'none', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.disabled" display="block" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, mb: 0.5 }}>
            {k}
          </Typography>
          <Typography variant="body2" fontWeight={600}>{v}</Typography>
        </Box>
      ))}
    </Paper>
  );
}

// ── Right panel ────────────────────────────────────────────────────────────────

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
    <Box sx={{
      width,
      flexShrink: 0,
      borderLeft: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, bgcolor: 'background.paper' }}>
        <Typography variant="overline" color="text.secondary" fontWeight={600}>Remaining Players</Typography>
        <Chip label={pending.length} size="small" color="primary" sx={{ height: 20, fontSize: '0.68rem' }} />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {pending.length === 0 ? (
          <Typography color="text.disabled" fontSize="0.8rem" sx={{ p: 2, textAlign: 'center' }}>No players remaining</Typography>
        ) : (
          orderedPools.map(poolId => {
            const poolPlayers = byPool[poolId];
            const clr = poolColor(poolId);
            return (
              <div key={poolId}>
                <div style={{
                  padding: '0.45rem 1rem',
                  background: clr.bg,
                  borderTop: `2px solid ${clr.border}`,
                  borderBottom: `1px solid ${clr.border}50`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  position: 'sticky', top: 0, zIndex: 1,
                }}>
                  <span style={{ color: clr.text, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Pool {poolId}</span>
                  <span style={{ color: clr.text, fontSize: '0.68rem', fontWeight: 700, opacity: 0.75 }}>{poolPlayers.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: GRID, background: '#0c1521', borderBottom: `1px solid ${clr.border}30` }}>
                  <PColHead label="Player" first />
                  <PColHead label="Pool" />
                  <PColHead label="Base" right />
                </div>
                {poolPlayers.map((p, rowIdx) => {
                  const isOnBlock = p.id === currentPlayerId;
                  const rowBg = isOnBlock ? '#0c1a10' : rowIdx % 2 === 0 ? 'transparent' : '#0d1825';
                  return (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: GRID, background: rowBg, borderBottom: '1px solid #0f172a' }}>
                      <PCell first style={{ color: isOnBlock ? '#22c55e' : '#cbd5e1', fontWeight: isOnBlock ? 700 : 400 }}>
                        {isOnBlock && <span style={{ marginRight: '4px' }}>▶</span>}{p.name}
                      </PCell>
                      <PCell center>
                        <span style={{ background: clr.bg, color: clr.text, border: `1px solid ${clr.border}50`, borderRadius: '4px', padding: '0.1rem 0.35rem', fontSize: '0.65rem', fontWeight: 700 }}>{p.pool}</span>
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
      </Box>
    </Box>
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

function PhaseBar({ phase, playerCount }) {
  const labels = {
    SETUP:  { text: 'Setup',     color: 'default' },
    LIVE:   { text: '● LIVE',    color: 'success' },
    PAUSED: { text: '⏸ Paused', color: 'warning' },
    ENDED:  { text: 'Ended',     color: 'default' },
  };
  const cfg = labels[phase] || labels.SETUP;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, mb: 0.5 }}>
      <Chip label={cfg.text} color={cfg.color} size="small" sx={{ fontWeight: 700 }} />
      {playerCount > 0 && <Typography variant="caption" color="text.disabled">{playerCount} players total</Typography>}
    </Box>
  );
}

function MobileHeader({ user, auctionState, connected }) {
  const team = auctionState?.teams?.[user?.teamId];
  const { logout } = useAuth();
  return (
    <AppBar position="sticky" sx={{ display: { md: 'none' } }}>
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: '52px !important', px: 2 }}>
        <Typography fontWeight={800} color="primary">🏏 RPL</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {team && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.primary" fontWeight={600} display="block">{team.name}</Typography>
              <Typography variant="caption" color="success.main">{formatPts(team.budget)}</Typography>
            </Box>
          )}
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<DashboardIcon sx={{ fontSize: '0.85rem !important' }} />}
            onClick={() => window.open('/dashboard', 'rpl-dashboard', 'width=1280,height=800,resizable=yes')}
            sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: '0.7rem', py: 0.25, px: 0.75, minWidth: 0 }}
          >
            Dashboard
          </Button>
          <FiberManualRecordIcon sx={{ fontSize: 10, color: connected ? 'success.main' : 'error.main' }} />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function fmtPts(n) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return n?.toLocaleString() ?? '0';
}
