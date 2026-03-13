import React, { useState, useCallback } from 'react';
import rplLogo from '../assets/rpl-logo.jpg';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAuction } from '../contexts/AuctionContext.jsx';
import HostSidebar from '../components/shared/HostSidebar.jsx';
import SquadGrid from '../components/auction/SquadGrid.jsx';
import RemainingPlayersPanel from '../components/auction/RemainingPlayersPanel.jsx';
import PhaseBar from '../components/auction/PhaseBar.jsx';
import PlayerCard from '../components/auction/PlayerCard.jsx';
import PlayerExtraData from '../components/auction/PlayerExtraData.jsx';
import BidDisplay from '../components/auction/BidDisplay.jsx';
import CountdownTimer from '../components/auction/CountdownTimer.jsx';
import BidHistory from '../components/auction/BidHistory.jsx';
import RecentSoldPlayers from '../components/auction/RecentSoldPlayers.jsx';
import PlayerStats from '../components/auction/PlayerStats.jsx';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import DashboardView from '../components/admin/DashboardView.jsx';
import PlayerDataTab from '../components/shared/PlayerDataTab.jsx';
import CommentaryFeed from '../components/shared/CommentaryFeed.jsx';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';

export default function HostPage() {
    const { user, logout } = useAuth();
    const { auctionState, connected } = useAuction();
    const [rightWidth, setRightWidth] = useState(380);
    
    const { phase, players = [], teams = {}, leagueConfig = {}, settings = {}, currentBid, currentPool, currentPlayerIndex } = auctionState || {};
    const player = players[currentPlayerIndex] ?? null;
    const [toast, setToast] = useState(null); // { type, msg }
    
    // Determine the relevant pool for the "Recently Sold" display
    let displayPool = currentPool || player?.pool;
    if (!displayPool && players.length > 0) {
        const soldPlayers = players.filter(p => p.status === 'SOLD');
        if (soldPlayers.length > 0) {
            displayPool = soldPlayers[soldPlayers.length - 1].pool;
        } else {
            displayPool = 'A1'; // Fallback
        }
    }

    const [isRightPaneOpen, setIsRightPaneOpen] = useState(() => window.innerWidth >= 1200);
    const [currentTab, setCurrentTab] = useState(0); // 0 = Live, 1 = Player Data, 2 = Dashboard
    const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);

    const { lastEvent } = useAuction();

    React.useEffect(() => {
        if (!lastEvent) return;
        if (lastEvent.type === 'sold') {
            const { player, teamName, amount } = lastEvent.data;
            setToast({ 
                type: 'sold', 
                msg: `🏆 ${player.name} Sold to ${teamName} for ${amount?.toLocaleString()} pts!` 
            });
        } else if (lastEvent.type === 'unsold') {
            const { player } = lastEvent.data;
            setToast({ 
                type: 'unsold', 
                msg: `❌ ${player.name} went Unsold` 
            });
        }
    }, [lastEvent]);

    const startDragRight = useCallback((e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = rightWidth;
        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            setRightWidth(Math.max(250, Math.min(600, startWidth - deltaX)));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
    }, [rightWidth]);


    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default', flexDirection: 'column' }}>

            {/* Mobile/Responsive Drawer */}
            <Drawer
                anchor="left"
                open={isLeftDrawerOpen}
                onClose={() => setIsLeftDrawerOpen(false)}
                sx={{ display: { lg: 'none' } }}
                PaperProps={{ sx: { width: 320, bgcolor: 'background.paper' } }}
            >
                <HostSidebar isDrawer onClose={() => setIsLeftDrawerOpen(false)} />
            </Drawer>

            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'row' }}>
                {phase !== 'ENDED' && (
                    <Box sx={{ display: { xs: 'none', lg: 'flex' } }}>
                        <HostSidebar width={320} />
                    </Box>
                )}

                {/* Main Content Area */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Prominent Header */}
                    <Box sx={{ 
                        p: 2, 
                        px: 3, 
                        borderBottom: '1px solid', 
                        borderColor: 'divider', 
                        background: 'rgba(17, 24, 39, 0.8)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 80
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton 
                                size="small" 
                                onClick={() => setIsLeftDrawerOpen(true)} 
                                sx={{ color: 'white', display: { lg: 'none' } }}
                            >
                                <MenuIcon />
                            </IconButton>
                            <Box 
                                component="img" 
                                src={rplLogo} 
                                sx={{ height: 48, width: 'auto', borderRadius: '6px' }} 
                            />
                            <Box>
                                <Typography variant="h5" fontWeight={950} sx={{ letterSpacing: '0.05em', lineHeight: 1.1 }}>
                                    RPL <Box component="span" sx={{ color: 'primary.main' }}>2026</Box>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6 }}>
                                    AUCTION BROADCAST HUB
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Box>
                                <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>CONTROL STATUS</Typography>
                                <Typography variant="h6" fontWeight={950} color="primary" sx={{ lineHeight: 1 }}>{auctionState?.phase || 'READY'}</Typography>
                            </Box>
                            <Button 
                                variant="outlined" 
                                color="inherit" 
                                size="small" 
                                startIcon={<LogoutIcon />} 
                                onClick={logout}
                                sx={{ borderColor: 'divider', color: 'text.secondary', fontWeight: 700, px: 2 }}
                            >
                                Sign Out
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.5, sm: 3, md: 4 }, display: 'flex', flexDirection: 'column' }}>

                        <Box sx={{ maxWidth: '100%', mx: 'auto', width: '100%', mt: { md: 2 } }}>

                            {/* Tab Navigation */}
                            <Paper square sx={{
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} variant="scrollable" scrollButtons="auto" sx={{ flex: 1 }}>
                                    <Tab label="Live Auction" />
                                    <Tab label="Commentary" />
                                    <Tab label="Player Data" />
                                    <Tab label="Dashboard" />
                                </Tabs>
                                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                                    <PlayerStats players={auctionState?.players} />
                                </Box>
                            </Paper>

                            {/* Commentary Tab */}
                            {currentTab === 1 && <CommentaryFeed commentary={auctionState?.commentary} />}

                            {/* Player Data Tab */}
                            {currentTab === 2 && <PlayerDataTab auctionState={auctionState} readOnly />}

                            {/* Dashboard Tab */}
                            {currentTab === 3 && <DashboardView state={auctionState} hideRemaining={true} currentUser={user} />}

                            {/* Live Auction Tab */}
                            {currentTab === 0 && (
                                <>
                                    {auctionState && <PhaseBar phase={auctionState.phase} size="big" />}

                                        {phase === 'LIVE' || phase === 'PAUSED' ? (
                                            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {/* ... player info, timer, bid display ... */}
                                                <PlayerCard player={player} size="big" />
                                                <PlayerExtraData player={player} size="big" visibleKeys={String(auctionState?.leagueConfig?.visibleExtraColumns || '').split(',').map(s => s.trim()).filter(Boolean)} />
                                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
                                                    <CountdownTimer
                                                        timerEndsAt={auctionState.timerEndsAt}
                                                        timerPaused={auctionState.timerPaused}
                                                        timerRemainingOnPause={auctionState.timerRemainingOnPause}
                                                        timerSeconds={auctionState?.settings?.timerSeconds ?? 30}
                                                        endMode={auctionState?.settings?.endMode ?? 'timer'}
                                                        size="big"
                                                    />
                                                    <Box sx={{ flex: 1, width: '100%' }}>
                                                        <BidDisplay
                                                            currentBid={auctionState?.currentBid}
                                                            teams={auctionState?.teams}
                                                            player={player}
                                                            size="big"
                                                        />
                                                    </Box>
                                                </Box>
                                                <Typography variant="caption" color="text.disabled" textAlign="center" sx={{ display: 'block' }}>
                                                    Read-only Host view. Bidding is disabled.
                                                </Typography>
                                                <RecentSoldPlayers players={players} currentPool={displayPool} teams={teams} />
                                            </Box>
                                        ) : phase === 'ENDED' ? (
                                            <SquadGrid teams={teams} players={players} />
                                        ) : null}

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
                                </>
                            )}
                        </Box>
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

                        <Box sx={{ display: { xs: 'none', lg: 'flex' }, width: isRightPaneOpen ? rightWidth : 48, flexShrink: 0, position: 'relative' }}>
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
                        fontSize: '1.2rem',
                        bgcolor: toast?.type === 'sold' ? 'success.main' : 'rgba(30, 41, 59, 0.9)',
                        color: 'white',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        '& .MuiAlert-icon': { fontSize: '1.8rem' }
                    }}
                >
                    {toast?.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
