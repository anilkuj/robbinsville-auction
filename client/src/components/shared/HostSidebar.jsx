import React from 'react';
import rplLogo from '../../assets/rpl-logo.jpg';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { formatPts } from '../../utils/budgetCalc.js';
import TeamLogo from './TeamLogo.jsx';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LogoutIcon from '@mui/icons-material/Logout';
import Button from '@mui/material/Button';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle.jsx';

export default function HostSidebar({ width = 300, isDrawer = false }) {
    const { auctionState, connected } = useAuction();
    const { logout } = useAuth();

    const teams = auctionState?.teams || {};
    const startingBudget = auctionState?.leagueConfig?.startingBudget || 50000;
    const teamList = Object.values(teams).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return (
        <Paper
            square
            elevation={0}
            sx={{
                width: width ?? (isDrawer ? '100%' : 300),
                height: '100%',
                flexShrink: 0,
                borderRight: isDrawer ? 'none' : '1px solid',
                borderColor: 'divider',
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                overflowY: 'auto',
                bgcolor: 'background.paper',
            }}
        >
            <Box sx={{ pb: 3, borderBottom: '1px solid', borderColor: 'divider', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                    <Box 
                        component="img" 
                        src={rplLogo} 
                        sx={{ height: 64, width: 'auto', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} 
                    />
                </motion.div>
                <Box>
                    <Typography variant="h6" fontWeight={950} sx={{ letterSpacing: '0.05em', lineHeight: 1.1, color: 'primary.main' }}>
                        RPL 2026
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6 }}>
                        HOST COMMAND CENTER
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1, overflowY: 'auto', my: 1, py: 1 }}>
                {teamList.map(team => {
                    const isLeading = auctionState?.currentBid?.teamId === team.id;
                    const currentBidAmount = isLeading ? (auctionState?.currentBid?.amount || 0) : 0;
                    const effectiveRemaining = (team.budget || 0) - currentBidAmount;

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
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                    <TeamLogo team={team} size={24} border={false} />
                                    <Typography fontWeight={700} fontSize="0.85rem" noWrap title={team.name}>
                                        {team.name}
                                    </Typography>
                                </Box>
                                <Typography fontWeight={800} color={isLeading ? 'warning.main' : 'success.main'} fontSize="0.85rem">
                                    {formatPts(effectiveRemaining)}
                                </Typography>
                            </Box>

                            <Box sx={{ height: 8, display: 'flex', borderRadius: 4, overflow: 'hidden', bgcolor: 'background.default', mb: 0.5 }}>
                                {spentPct > 0 && <Box sx={{ width: `${Math.min(100, spentPct)}%`, bgcolor: '#ef4444', opacity: 0.9 }} />}
                                {spentPct < 100 && <Box sx={{ width: `${Math.max(0, 100 - spentPct)}%`, bgcolor: '#16a34a', opacity: 0.9 }} />}
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 900, fontSize: '0.72rem' }}>
                                    {Math.round(spentPct)}% SPENT
                                </Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                    {(team.roster?.length || 0) + (team.ownerIsPlayer ? (team.ownerPlayerIds || []).filter(oid => !team.roster?.some(rp => rp.playerId === oid)).length : 0)} / {auctionState?.leagueConfig?.squadSize || 18}
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <FiberManualRecordIcon sx={{ fontSize: 10, color: connected ? 'success.main' : 'error.main' }} />
                        <Typography variant="caption" color="text.disabled">{connected ? 'Live' : 'Reconnecting…'}</Typography>
                    </Box>
                    <ThemeToggle />
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
