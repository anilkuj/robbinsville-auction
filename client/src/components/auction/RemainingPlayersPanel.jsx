import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import { useTheme, alpha } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getAvgPointsKey, sortPlayersByPoints } from '../../utils/playerSort.js';

// Helper to get pool colors based on theme
function getPoolColors(poolId, theme) {
    const isDark = theme.palette.mode === 'dark';
    if (poolId.startsWith('A')) return { 
        bg: isDark ? '#1c0d00' : '#fff7ed', 
        border: '#f59e0b', 
        text: isDark ? '#f59e0b' : '#c2410c' 
    };
    if (poolId.startsWith('B')) return { 
        bg: isDark ? '#0d1c35' : '#eff6ff', 
        border: '#3b82f6', 
        text: isDark ? '#60a5fa' : '#1d4ed8' 
    };
    if (poolId === 'C') return { 
        bg: isDark ? '#150d2e' : '#f5f3ff', 
        border: '#8b5cf6', 
        text: isDark ? '#a78bfa' : '#6d28d9' 
    };
    return { 
        bg: isDark ? '#0f1a2e' : '#f8fafc', 
        border: theme.palette.divider, 
        text: theme.palette.text.secondary 
    };
}

function fmtPts(n) {
    if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
    return n?.toLocaleString() ?? '0';
}

function PColHead({ label, first, right, theme }) {
    return (
        <Typography
            component="span"
            sx={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.62rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'text.secondary',
                borderLeft: first ? 'none' : '1px solid',
                borderColor: 'divider',
                textAlign: right ? 'right' : first ? 'left' : 'center',
                whiteSpace: 'nowrap',
                display: 'inline-block',
                ...(first && { paddingLeft: '1rem' }),
                ...(right && { paddingRight: '1rem' }),
            }}
        >
            {label}
        </Typography>
    );
}

function PCell({ children, first, right, center, style = {}, theme }) {
    return (
        <Box
            component="span"
            sx={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.74rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderLeft: first ? 'none' : '1px solid',
                borderColor: 'divider',
                textAlign: right ? 'right' : center ? 'center' : 'left',
                alignSelf: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: right ? 'flex-end' : center ? 'center' : 'flex-start',
                color: 'text.primary',
                ...(first && { paddingLeft: '1rem' }),
                ...(right && { paddingRight: '1rem' }),
                ...style,
            }}
        >
            {children}
        </Box>
    );
}

export default function RemainingPlayersPanel({ 
    players, 
    pools, 
    currentPlayerId, 
    spilloverIds = [], 
    width = 280, 
    isOpen, 
    setIsOpen,
    isMobileDrawer = false
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    if (!players || !pools) return null;

    const pending = players.filter(p => p.status === 'PENDING');
    const poolOrder = pools.map(p => p.id);
    const avgKey = getAvgPointsKey(players);

    // First, figure out which pools still have actual non-owner players pending
    const poolsWithActionablePlayers = new Set(
        pending.filter(p => p.extra?.type !== 'owner').map(p => p.pool)
    );

    const byPool = {};
    for (const p of pending) {
        if (p.extra?.type === 'owner' && !poolsWithActionablePlayers.has(p.pool)) {
            continue;
        }
        if (!byPool[p.pool]) byPool[p.pool] = [];
        byPool[p.pool].push(p);
    }

    const orderedPools = poolOrder.filter(id => byPool[id]?.length > 0);

    if (!isOpen && !isMobileDrawer) {
        return (
            <Box sx={{ width: 48, height: '100vh', flexShrink: 0, borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1, position: 'fixed', top: 0, right: 0, zIndex: 1200 }}>
                <IconButton size="small" onClick={() => setIsOpen(true)} title="Expand players pane" sx={{ mb: 1 }}>
                    <ChevronLeftIcon />
                </IconButton>
                <Typography sx={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: 'text.secondary', fontWeight: 600, fontSize: '0.8rem', letterSpacing: 1 }}>
                    REMAINING ({pending.length})
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{
            width: isMobileDrawer ? '100%' : { xs: 300, sm: 340, lg: width },
            height: isMobileDrawer ? 'auto' : '100vh',
            flexShrink: 0,
            borderLeft: isMobileDrawer ? 'none' : '1px solid',
            borderColor: 'divider',
            bgcolor: isMobileDrawer ? 'transparent' : 'background.default',
            display: 'flex',
            flexDirection: 'column',
            overflow: isMobileDrawer ? 'visible' : 'hidden',
            position: isMobileDrawer ? 'relative' : 'fixed',
            top: 0,
            right: 0,
            zIndex: isMobileDrawer ? 1 : 1200,
            boxShadow: isMobileDrawer ? 'none' : { 
                xs: isDark ? '-4px 0 16px rgba(0,0,0,0.5)' : '-4px 0 16px rgba(0,0,0,0.1)', 
                lg: 'none' 
            }
        }}>
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" onClick={() => setIsOpen(false)} title="Collapse pane" sx={{ ml: -1 }}>
                        <ChevronRightIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="overline" color="text.secondary" fontWeight={600}>Remaining</Typography>
                </Box>
                <Chip label={pending.length} size="small" color="primary" sx={{ height: 20, fontSize: '0.68rem' }} />
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {pending.length === 0 ? (
                    <Typography color="text.disabled" fontSize="0.8rem" sx={{ p: 2, textAlign: 'center' }}>No players remaining</Typography>
                ) : (
                    orderedPools.map(poolId => {
                        const poolPlayers = byPool[poolId];
                        const clr = getPoolColors(poolId, theme);
                        const GRID = 'minmax(0,1fr) 50px 60px';
                        return (
                            <div key={poolId}>
                                <Box sx={{
                                    padding: '0.35rem 0.75rem',
                                    background: clr.bg,
                                    borderTop: `2px solid ${clr.border}`,
                                    borderBottom: `1px solid ${alpha(clr.border, 0.3)}`,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    position: 'sticky', top: 0, zIndex: 1,
                                }}>
                                    <Typography sx={{ color: clr.text, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Pool {poolId}</Typography>
                                    <Typography sx={{ color: clr.text, fontSize: '0.68rem', fontWeight: 700, opacity: 0.75 }}>{poolPlayers.length}</Typography>
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: GRID, bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', borderBottom: `1px solid ${alpha(clr.border, 0.2)}` }}>
                                    <PColHead label="Player" first theme={theme} />
                                    <PColHead label="Pool" center theme={theme} />
                                    <PColHead label="Base" right theme={theme} />
                                </Box>
                                {sortPlayersByPoints(poolPlayers, avgKey).map((p, rowIdx) => {
                                    const isOnBlock = p.id === currentPlayerId;
                                    const isSpillover = spilloverIds.includes(p.id);
                                    const typeKey = Object.keys(p.extra || {}).find(k => k.toLowerCase() === 'type' || k.toLowerCase() === 'player_type');
                                    const isOwner = typeKey ? String(p.extra[typeKey]).toLowerCase() === 'owner' : false;

                                    let rowBg = 'transparent';
                                    if (isOnBlock) rowBg = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)';
                                    else if (isSpillover) rowBg = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)';
                                    else if (rowIdx % 2 !== 0) rowBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)';

                                    return (
                                        <Box key={p.id} sx={{
                                            display: 'grid',
                                            gridTemplateColumns: GRID,
                                            background: rowBg,
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            ...(isSpillover && { borderLeft: '3px solid #ef4444' })
                                        }}>
                                            <PCell first theme={theme} style={{
                                                color: isOnBlock ? theme.palette.success.main : isSpillover ? theme.palette.error.main : isOwner ? theme.palette.secondary.main : theme.palette.text.primary,
                                                fontWeight: (isOnBlock || isSpillover || isOwner) ? 700 : 400
                                            }}>
                                                {isOnBlock && <span style={{ marginRight: '4px' }}>▶</span>}
                                                {p.name}
                                                {isOwner && (
                                                    <Box component="span" sx={{ 
                                                        marginLeft: '6px', 
                                                        bgcolor: isDark ? 'rgba(167, 139, 250, 0.1)' : 'rgba(109, 40, 217, 0.08)', 
                                                        color: isDark ? '#a78bfa' : '#6d28d9', 
                                                        border: '1px solid',
                                                        borderColor: isDark ? 'rgba(167, 139, 250, 0.3)' : 'rgba(109, 40, 217, 0.2)',
                                                        borderRadius: '3px', 
                                                        padding: '0px 3px', 
                                                        fontSize: '0.62rem', 
                                                        fontWeight: 700 
                                                    }}>
                                                        OWNER
                                                    </Box>
                                                )}
                                                {isSpillover && (
                                                    <Box component="span" sx={{ 
                                                        marginLeft: '6px', 
                                                        fontSize: '0.6rem', 
                                                        color: 'error.main', 
                                                        border: '1px solid',
                                                        borderColor: alpha(theme.palette.error.main, 0.4),
                                                        borderRadius: '2px', 
                                                        padding: '0px 3px' 
                                                    }}>
                                                        MANUAL SALE
                                                    </Box>
                                                )}
                                            </PCell>
                                            <PCell center theme={theme}>
                                                <Box component="span" sx={{ 
                                                    bgcolor: clr.bg, 
                                                    color: clr.text, 
                                                    border: '1px solid',
                                                    borderColor: alpha(clr.border, 0.4),
                                                    borderRadius: '4px', 
                                                    padding: '0.1rem 0.35rem', 
                                                    fontSize: '0.65rem', 
                                                    fontWeight: 700 
                                                }}>
                                                    {p.pool}
                                                </Box>
                                            </PCell>
                                            <PCell right theme={theme} style={{ 
                                                color: isOnBlock ? theme.palette.success.main : isSpillover ? theme.palette.error.main : isOwner ? theme.palette.secondary.main : theme.palette.text.secondary, 
                                                fontWeight: (isOnBlock || isSpillover || isOwner) ? 700 : 400 
                                            }}>
                                                {isOwner ? <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>AVG-SYNCED</span> : fmtPts(p.basePrice)}
                                            </PCell>
                                        </Box>
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
