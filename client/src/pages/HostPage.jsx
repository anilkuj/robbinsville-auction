import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAuction } from '../contexts/AuctionContext.jsx';
import HostSidebar from '../components/shared/HostSidebar.jsx';
import RemainingPlayersPanel from '../components/auction/RemainingPlayersPanel.jsx';
import PhaseBar from '../components/auction/PhaseBar.jsx';
import PlayerCard from '../components/auction/PlayerCard.jsx';
import BidDisplay from '../components/auction/BidDisplay.jsx';
import CountdownTimer from '../components/auction/CountdownTimer.jsx';
import BidHistory from '../components/auction/BidHistory.jsx';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function HostPage() {
    const { user } = useAuth();
    const { auctionState } = useAuction();
    const [rightWidth, setRightWidth] = useState(380);

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

    const phase = auctionState?.phase;
    const player = phase === 'LIVE' ? auctionState?.players?.[auctionState?.currentPlayerIndex] : null;
    const currentBid = auctionState?.currentBid;
    const settings = auctionState?.settings;

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>

            {/* Left Sidebar - Host View */}
            <Box className="desktop-sidebar" sx={{ display: { xs: 'none', md: 'flex' } }}>
                <HostSidebar width={280} />
            </Box>

            {/* Main Content Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.5, sm: 3, md: 4 }, display: 'flex', flexDirection: 'column' }}>

                    <Box sx={{ maxWidth: 640, mx: 'auto', width: '100%', mt: { md: 2 } }}>
                        {auctionState && <PhaseBar phase={phase} />}

                        {phase === 'LIVE' && player && (
                            <>
                                <PlayerCard player={player} />
                                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>

                                    {/* Timer and Bid Display */}
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                                        <CountdownTimer
                                            timerEndsAt={auctionState.timerEndsAt}
                                            timerPaused={auctionState.timerPaused}
                                            timerRemainingOnPause={auctionState.timerRemainingOnPause}
                                            timerSeconds={settings?.timerSeconds ?? 30}
                                            endMode={settings?.endMode ?? 'timer'}
                                        />
                                        <Box sx={{ flex: 1 }}>
                                            <BidDisplay
                                                currentBid={currentBid}
                                                teams={auctionState.teams}
                                                player={player}
                                            />
                                        </Box>
                                    </Box>

                                    {/* Notice for Host */}
                                    <Typography variant="caption" color="text.disabled" textAlign="center" sx={{ display: 'block' }}>
                                        Read-only Host view. Bidding is disabled.
                                    </Typography>

                                    {/* Bid History */}
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="overline" color="text.disabled" display="block" sx={{ mb: 1 }}>
                                            Bid History
                                        </Typography>
                                        <BidHistory history={currentBid?.history} />
                                    </Paper>
                                </Box>
                            </>
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
                    </Box>
                </Box>
            </Box>

            {/* Right drag handle */}
            <Box
                sx={{ display: { xs: 'none', lg: 'block' }, width: '5px', flexShrink: 0, cursor: 'col-resize', bgcolor: '#1e293b', zIndex: 10, '&:hover': { bgcolor: '#334155' } }}
                onMouseDown={startDragRight}
                title="Drag to resize"
            />

            {/* Right panel */}
            <Box sx={{ display: 'flex', width: { xs: '100%', lg: rightWidth }, flexShrink: 0 }}>
                <RemainingPlayersPanel
                    players={auctionState?.players}
                    pools={auctionState?.leagueConfig?.pools}
                    currentPlayerId={player?.id ?? null}
                    width={rightWidth}
                />
            </Box>
        </Box>
    );
}
