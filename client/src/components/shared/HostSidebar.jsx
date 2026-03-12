import React from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { formatPts } from '../../utils/budgetCalc.js';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LogoutIcon from '@mui/icons-material/Logout';
import Button from '@mui/material/Button';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function HostSidebar({ width = 300 }) {
    const { auctionState, connected } = useAuction();
    const { logout } = useAuth();

    const teams = auctionState?.teams || {};
    const startingBudget = auctionState?.leagueConfig?.startingBudget || 50000;
    const teamList = Object.values(teams).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <Paper
            square
            sx={{
                width,
                flexShrink: 0,
                borderRight: '1px solid',
                borderColor: 'divider',
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                overflowY: 'auto',
                bgcolor: 'background.paper',
                height: '100vh',
                position: 'sticky',
                top: 0,
            }}
        >
            <Box sx={{ pb: 1.5, borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                <Typography fontWeight={800} color="primary" sx={{ mb: 0.5 }}>
                    🏏 RPL Auction Host
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Teams Budget Overview
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
                {teamList.map(team => {
                    const isLeading = auctionState?.currentBid?.teamId === team.id;
                    const currentBidAmount = isLeading ? (auctionState?.currentBid?.amount || 0) : 0;
                    const effectiveRemaining = team.budget - currentBidAmount;

                    const spent = startingBudget - effectiveRemaining;
                    const spentPct = startingBudget > 0 ? (spent / startingBudget) * 100 : 0;


                    return (
                        <Paper
                            key={team.id}
                            variant="outlined"
                            sx={{
                                p: 1,
                                borderRadius: 1.5,
                                borderColor: isLeading ? 'success.main' : 'divider',
                                borderLeft: `4px solid ${team.color || 'divider'}`,
                                boxShadow: isLeading ? '0 0 0 1px #22c55e40' : 'none',
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                <Typography fontWeight={700} fontSize="0.85rem" noWrap title={team.name} sx={{ maxWidth: '65%' }}>
                                    {team.name}
                                </Typography>
                                <Typography fontWeight={800} color={isLeading ? 'warning.main' : 'success.main'} fontSize="0.85rem">
                                    {formatPts(effectiveRemaining)}
                                </Typography>
                            </Box>

                            <Box sx={{ height: 6, display: 'flex', borderRadius: 3, overflow: 'hidden', bgcolor: 'background.default', mb: 0.5 }}>
                                {spentPct > 0 && <Box sx={{ width: `${Math.min(100, spentPct)}%`, bgcolor: 'error.main', opacity: 0.85 }} />}
                                {spentPct < 100 && <Box sx={{ width: `${Math.max(0, 100 - spentPct)}%`, bgcolor: team.color || 'success.main', opacity: 0.85 }} />}
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                    {Math.round(spentPct)}% spent
                                </Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                    {team.roster?.length || 0} / {auctionState?.leagueConfig?.squadSize || 18}
                                </Typography>
                            </Box>
                        </Paper>
                    );
                })}
                {teamList.length === 0 && (
                    <Typography variant="body2" color="text.disabled" textAlign="center" sx={{ mt: 4 }}>
                        No teams configured.
                    </Typography>
                )}
            </Box>

            <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <FiberManualRecordIcon sx={{ fontSize: 10, color: connected ? 'success.main' : 'error.main' }} />
                    <Typography variant="caption" color="text.disabled">{connected ? 'Live' : 'Reconnecting…'}</Typography>
                </Box>
                <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    startIcon={<LogoutIcon />}
                    onClick={logout}
                    fullWidth
                    sx={{ borderColor: 'divider', color: 'text.secondary' }}
                >
                    Sign Out
                </Button>
            </Box>
        </Paper>
    );
}
