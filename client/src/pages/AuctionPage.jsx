import React, { useEffect, useState, useCallback } from 'react';
import rplLogo from '../assets/rpl-logo.jpg';
import { useAuction } from '../contexts/AuctionContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from '../components/shared/Sidebar.jsx';
import SquadGrid from '../components/auction/SquadGrid.jsx';
import PlayerCard from '../components/auction/PlayerCard.jsx';
import BidDisplay from '../components/auction/BidDisplay.jsx';
import CountdownTimer from '../components/auction/CountdownTimer.jsx';
import BidButton from '../components/auction/BidButton.jsx';
import BidHistory from '../components/auction/BidHistory.jsx';
import PlayerExtraData from '../components/auction/PlayerExtraData.jsx';
import RecentSoldPlayers from '../components/auction/RecentSoldPlayers.jsx';
import PlayerStats from '../components/auction/PlayerStats.jsx';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import DashboardView from '../components/admin/DashboardView.jsx';
import PlayerDataTab from '../components/shared/PlayerDataTab.jsx';
import CommentaryFeed from '../components/shared/CommentaryFeed.jsx';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import HistoryIcon from '@mui/icons-material/History';
import IconButton from '@mui/material/IconButton';
import ThemeToggle from '../components/shared/ThemeToggle.jsx';
import Drawer from '@mui/material/Drawer';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { formatPts } from '../utils/budgetCalc.js';
import { getAvgPointsKey, sortPlayersByPoints } from '../utils/playerSort.js';
import RemainingPlayersPanel from '../components/auction/RemainingPlayersPanel.jsx';
import PhaseBar from '../components/auction/PhaseBar.jsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuctionPage() {
  const { auctionState, connected, lastEvent, preparedBid } = useAuction();
  const { user, logout } = useAuth();
  
  const { phase, players = [], teams = {}, leagueConfig = {}, settings = {}, currentBid, currentPool, currentPlayerIndex } = auctionState || {};
  const player = players[currentPlayerIndex] ?? null;
  
  // Determine display pool at top-level
  let displayPool = currentPool || player?.pool;
  if (!displayPool && players.length > 0) {
    const soldPlayers = players.filter(p => p.status === 'SOLD');
    if (soldPlayers.length > 0) {
      displayPool = soldPlayers[soldPlayers.length - 1].pool;
    } else {
      displayPool = 'A1'; // Fallback
    }
  }

  const [toast, setToast] = useState(null);
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(380);
  const [isRightPaneOpen, setIsRightPaneOpen] = useState(() => window.innerWidth >= 1200);
  const [currentTab, setCurrentTab] = useState(0); // 0 = Live, 1 = Player Data, 2 = Dashboard
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === 'sold') {
      const { player, teamName, amount } = lastEvent.data;
      setToast({ type: 'sold', msg: `🏆 ${player.name} sold to ${teamName} for ${amount?.toLocaleString()} pts` });
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
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [leftWidth]);

  const startDragRight = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightWidth;
    const onMove = (ev) => setRightWidth(Math.max(220, Math.min(700, startW + startX - ev.clientX)));
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [rightWidth]);

  const myTeam = teams?.[user?.teamId];
  const roster = [...(myTeam?.roster ?? [])].sort((a, b) => (a.saleIndex || 0) - (b.saleIndex || 0));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', userSelect: 'none', bgcolor: 'background.default' }}>
      
      {/* Mobile/Responsive Drawer */}
      <Drawer
        anchor="left"
        open={isLeftDrawerOpen}
        onClose={() => setIsLeftDrawerOpen(false)}
        sx={{ display: { lg: 'none' } }}
        PaperProps={{ sx: { width: 280, bgcolor: 'background.paper' } }}
      >
        <Sidebar isDrawer onClose={() => setIsLeftDrawerOpen(false)} />
      </Drawer>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar (Desktop) */}
        {phase !== 'ENDED' && (
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, position: 'relative' }}>
            <Sidebar width={leftWidth} />
            <div
              className="drag-handle"
              onMouseDown={startDragLeft}
              title="Drag to resize"
            />
          </Box>
        )}

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <MobileHeader 
            user={user} 
            auctionState={auctionState} 
            connected={connected} 
            onMenuClick={() => setIsLeftDrawerOpen(true)}
            onHistoryClick={() => setIsRightDrawerOpen(true)}
          />

          {/* Right Drawer (Mobile) */}
          <Drawer
            anchor="right"
            open={isRightDrawerOpen}
            onClose={() => setIsRightDrawerOpen(false)}
            sx={{ display: { lg: 'none' } }}
            PaperProps={{ sx: { width: { xs: '75vw', sm: 320 }, bgcolor: 'background.paper' } }}
          >
            <Box sx={{ p: 1.5, px: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 56 }}>
                <Typography variant="overline" fontWeight={900} color="primary">Auction Intelligence</Typography>
                <Button size="small" onClick={() => setIsRightDrawerOpen(false)}>Close</Button>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {((phase === 'LIVE' || phase === 'PAUSED') && player) ? (
                    <Box sx={{ p: 1 }}>
                        <Typography variant="caption" color="text.disabled" sx={{ px: 1, fontWeight: 800, textTransform: 'uppercase' }}>Live Bids</Typography>
                        <BidHistory 
                            history={auctionState?.currentBid?.history} 
                            teams={auctionState?.teams} 
                        />
                    </Box>
                ) : (
                    <RemainingPlayersPanel
                        players={auctionState?.players}
                        pools={auctionState?.leagueConfig?.pools}
                        currentPlayerId={player?.id ?? null}
                        spilloverIds={auctionState?.leagueConfig?.spilloverPlayerIds || []}
                        width="100%"
                        isOpen={true}
                        setIsOpen={() => {}} // No-op for mobile
                        isMobileDrawer
                    />
                )}
            </Box>
          </Drawer>

          {/* New Prominent Branding Header */}
          <Box sx={{ 
            display: { xs: 'none', md: 'flex' }, 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            px: 3, 
            py: 2, 
            borderBottom: '1px solid', 
            borderColor: 'divider',
            bgcolor: 'background.paper' 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box 
                component="img" 
                src={rplLogo} 
                sx={{ height: 50, width: 'auto', borderRadius: '6px' }} 
              />
              <Box>
                <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '0.05em', lineHeight: 1.1, color: 'primary.main' }}>
                  ROBBINSVILLE PREMIER LEAGUE 2026
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Member Portal • {myTeam?.name}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Chip 
                label={auctionState?.phase || 'READY'} 
                color={
                  auctionState?.phase === 'LIVE' ? 'success' : 
                  auctionState?.phase === 'PAUSED' ? 'warning' : 
                  auctionState?.phase === 'ENDED' ? 'error' : 'default'
                }
                sx={{ 
                  fontWeight: 900, 
                  borderRadius: '6px',
                  height: 32,
                  px: 1,
                  fontSize: '0.9rem',
                  letterSpacing: '0.05em'
                }} 
              />
              <Box>
                <Typography variant="h5" fontWeight={900} color="success.main">
                  {formatPts(myTeam?.budget || 0)}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 800 }}>REMAINING BUDGET</Typography>
              </Box>
            </Box>
          </Box>

          {/* Notifications */}
          <Snackbar
            open={!!toast}
            autoHideDuration={5000}
            onClose={() => setToast(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              onClose={() => setToast(null)} 
              severity={toast?.type === 'sold' ? 'success' : 'info'} 
              variant="filled"
              sx={{ 
                width: '100%', 
                fontWeight: 800, 
                fontSize: '1.1rem',
                bgcolor: toast?.type === 'sold' ? 'success.main' : 'rgba(30, 41, 59, 0.9)',
                color: 'white',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                '& .MuiAlert-icon': { fontSize: '1.6rem' }
              }}
            >
              {toast?.msg}
            </Alert>
          </Snackbar>

          <Paper elevation={0} sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'transparent',
            px: 2
          }}>
            <Tabs 
              value={currentTab} 
              onChange={(_, v) => setCurrentTab(v)} 
              variant="scrollable" 
              scrollButtons="auto" 
              sx={{ 
                flex: 1,
                minHeight: 64,
                '& .MuiTabs-indicator': { height: 4, borderRadius: '4px 4px 0 0' }
              }}
            >
              <Tab label="Live Auction" sx={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }} />
              <Tab label="Commentary" sx={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }} />
              <Tab label="Player Data" sx={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }} />
              <Tab label="Dashboard" sx={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }} />
            </Tabs>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <PlayerStats players={auctionState?.players} />
            </Box>
          </Paper>

          <Box sx={{ flex: 1, p: { xs: 1.25, sm: 2 }, width: '100%', overflowX: 'hidden' }}>

            {currentTab === 1 && <CommentaryFeed commentary={auctionState?.commentary} />}

            {currentTab === 2 && <PlayerDataTab auctionState={auctionState} readOnly />}

            {currentTab === 3 && <DashboardView state={auctionState} hideRemaining={true} preparedBid={preparedBid} currentUser={user} />}

            {currentTab === 0 && (
              <>
                <PhaseBar phase={phase} />

                {phase === 'ENDED' && (
                  <SquadGrid 
                    teams={teams} 
                    players={players} 
                    singleTeamId={user.teamId} 
                  />
                )}

                {(phase === 'LIVE' || phase === 'PAUSED') && player && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 2 }, mt: { xs: 0, sm: 1 } }}>
                    <PlayerCard player={player} size="normal" />
                    <PlayerExtraData player={player} size="normal" visibleKeys={String(leagueConfig?.visibleExtraColumns || '').split(',').map(s => s.trim()).filter(Boolean)} />
                    <Box sx={{ 
                      display: 'flex', 
                      gap: { xs: 1, sm: 2 }, 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexDirection: { xs: 'column', xsm: 'row' } // Custom breakpoint or just column on mobile
                    }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2, 
                        width: '100%',
                        justifyContent: 'center'
                      }}>
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
                    </Box>
                    {user.role === 'team' && <BidButton />}
                    <RecentSoldPlayers players={players} currentPool={displayPool} teams={teams} />
                  </Box>
                )}

                {phase === 'SETUP' && (
                  <>
                    <Paper sx={{ textAlign: 'center', p: 4, mt: 1 }}>
                      <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>⏳</Typography>
                      <Typography color="text.secondary" fontSize="1.1rem">Waiting for next player…</Typography>
                      {auctionState?.players?.length === 0 && (
                        <Typography color="text.disabled" fontSize="0.85rem" sx={{ mt: 0.5 }}>
                          Admin hasn't imported players yet.
                        </Typography>
                      )}
                    </Paper>
                    <RecentSoldPlayers players={players} currentPool={displayPool} teams={teams} />
                  </>
                )}

                {!auctionState && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, gap: 2 }}>
                    <Typography color="text.disabled">Connecting…</Typography>
                    <Button variant="outlined" color="inherit" size="small" onClick={user?.logout || (() => {
                      localStorage.removeItem('rpl_token');
                      localStorage.removeItem('rpl_user');
                      window.location.href = '/login';
                    })} sx={{ borderColor: 'divider', color: 'text.secondary' }}>
                      Sign Out
                    </Button>
                  </Box>
                )}

                {/* Mobile roster */}
                {roster.length > 0 && (
                  <Paper className="mobile-roster" sx={{ mt: 2, overflow: 'hidden' }}>
                    <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="overline" color="text.secondary" fontWeight={600}>My Squad</Typography>
                      {currentBid?.teamId && teams[currentBid.teamId] && (
                        <Typography variant="caption" color="text.secondary">{teams[currentBid.teamId].name}</Typography>
                      )}
                      <Typography variant="caption" color="text.disabled">{roster.length} player{roster.length !== 1 ? 's' : ''}</Typography>
                    </Box>
                    <Box sx={{ py: 0.5 }}>
                      <Box sx={{ px: 2, py: 0.5, display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 1 }}>
                        {['Player', 'Pool', 'Price'].map(h => (
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
              </>
            )}
          </Box>
        </Box>

        {/* Right drag handle and panel */}
        {phase !== 'ENDED' && (
          <>
            {isRightPaneOpen && (
              <Box
                sx={{ display: { xs: 'none', lg: 'block' }, width: '5px', flexShrink: 0, cursor: 'col-resize', bgcolor: '#1e293b', zIndex: 10, '&:hover': { bgcolor: '#334155' } }}
                onMouseDown={startDragRight}
                title="Drag to resize"
              />
            )}

            <Box sx={{ display: { xs: 'none', lg: 'flex' }, width: { xs: '100%', lg: isRightPaneOpen ? rightWidth : 48 }, flexShrink: 0, position: 'relative' }}>
                {((phase === 'LIVE' || phase === 'PAUSED') && player && isRightPaneOpen) ? (
                    <Paper sx={{ width: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper', borderLeft: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="overline" fontWeight={900} color="primary">LIVE BID HISTORY</Typography>
                            <Button size="small" onClick={() => setIsRightPaneOpen(false)}>Close</Button>
                        </Box>
                        <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
                            <BidHistory 
                                history={auctionState?.currentBid?.history} 
                                teams={auctionState?.teams} 
                            />
                        </Box>
                        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                             <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 800 }}>
                                 * Latest bids shown at top
                             </Typography>
                        </Box>
                    </Paper>
                ) : (
                    <RemainingPlayersPanel
                        players={auctionState?.players}
                        pools={auctionState?.leagueConfig?.pools}
                        currentPlayerId={player?.id ?? null}
                        spilloverIds={auctionState?.leagueConfig?.spilloverPlayerIds || []}
                        width={rightWidth}
                        isOpen={isRightPaneOpen}
                        setIsOpen={setIsRightPaneOpen}
                    />
                )}
            </Box>
          </>
        )}
      </Box>

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-roster { display: none !important; }
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
  if (poolId === 'C') return { bg: '#150d2e', border: '#8b5cf6', text: '#a78bfa' };
  return { bg: '#0f1a2e', border: '#64748b', text: '#94a3b8' };
}

// ── Right panel ────────────────────────────────────────────────────────────────

// ── Phase Bar ──────────────────────────────────────────────────────────────────

function MobileHeader({ user, auctionState, connected, onMenuClick, onHistoryClick }) {
  const team = auctionState?.teams?.[user?.teamId];
  const { logout } = useAuth();
  return (
    <AppBar position="sticky" sx={{ 
      display: { lg: 'none' }, 
      bgcolor: 'background.paper',
      color: 'text.primary',
      borderBottom: `2px solid ${team?.color || 'transparent'}`,
      boxShadow: 'none'
    }}>
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px !important', px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={onMenuClick} sx={{ color: 'text.primary', mr: 0.5 }}>
            <MenuIcon />
          </IconButton>
          <Typography fontWeight={950} sx={{ fontSize: '1.1rem', letterSpacing: '0.01em', color: 'primary.main' }}>RPL 2026</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip 
            label={team ? formatPts(team.budget) : (auctionState?.phase || 'READY')} 
            color={
              auctionState?.phase === 'LIVE' ? 'success' : 
              auctionState?.phase === 'PAUSED' ? 'warning' : 
              auctionState?.phase === 'ENDED' ? 'error' : 'default'
            }
            sx={{ 
              fontWeight: 900, 
              borderRadius: '6px',
              height: 28,
              px: 0.5,
              fontSize: '0.75rem',
              letterSpacing: '0.02em',
              mr: 0.5
            }} 
          />
          {team && (
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 900, fontSize: '1rem', lineHeight: 1 }}>{formatPts(team?.budget || 0)}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={800} display="block" sx={{ fontSize: '0.55rem', opacity: 0.6 }}>{(team.name || '').toUpperCase()}</Typography>
            </Box>
          )}
          <IconButton size="small" onClick={onHistoryClick} sx={{ color: 'primary.main', bgcolor: 'rgba(56, 189, 248, 0.1)' }}>
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function fmtPts(n) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return n?.toLocaleString() ?? '0';
}
