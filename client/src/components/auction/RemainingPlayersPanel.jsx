import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getAvgPointsKey, sortPlayersByPoints } from '../../utils/playerSort.js';

// Reuse poolColor
function poolColor(poolId) {
    if (poolId.startsWith('A')) return { bg: '#1c0d00', border: '#f59e0b', text: '#f59e0b' };
    if (poolId.startsWith('B')) return { bg: '#0d1c35', border: '#3b82f6', text: '#60a5fa' };
    if (poolId === 'C') return { bg: '#150d2e', border: '#8b5cf6', text: '#a78bfa' };
    return { bg: '#0f1a2e', border: '#64748b', text: '#94a3b8' };
}

function fmtPts(n) {
    if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
    return n?.toLocaleString() ?? '0';
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

export default function RemainingPlayersPanel({ players, pools, currentPlayerId, width = 280 }) {
    const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 1200);

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

    if (!isOpen) {
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
            width: { xs: 300, sm: 340, lg: width },
            height: '100vh',
            flexShrink: 0,
            borderLeft: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'fixed',
            top: 0,
            right: 0,
            zIndex: 1200,
            boxShadow: { xs: '-4px 0 16px rgba(0,0,0,0.5)', lg: 'none' }
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
                        const clr = poolColor(poolId);
                        const GRID = 'minmax(0,1fr) 50px 60px';
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
                                    <PColHead label="Pool" center />
                                    <PColHead label="Base" right />
                                </div>
                                {sortPlayersByPoints(poolPlayers, avgKey).map((p, rowIdx) => {
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
