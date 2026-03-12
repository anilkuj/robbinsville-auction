import React from 'react';
import { formatPts } from '../../utils/budgetCalc.js';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Chip from '@mui/material/Chip';

export default function RecentSoldPlayers({ players, currentPool, teams }) {
    if (!players || !currentPool || !teams) return null;

    // Filter players that are SOLD and belong to the current pool being auctioned
    const soldInPool = players.filter(p => p.status === 'SOLD' && p.pool === currentPool);

    if (soldInPool.length === 0) return null;

    // Reverse the array to show the most recently processed players at the top
    const displayList = [...soldInPool].reverse();

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="overline" color="text.disabled" display="block" sx={{ mb: 1 }}>
                Sold in Pool {currentPool}
            </Typography>
            <List dense disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {displayList.map((p, i) => {
                    const team = teams[p.soldTo];
                    const teamName = team ? team.name : 'Unknown Team';
                    return (
                        <ListItem
                            key={p.id}
                            sx={{
                                borderRadius: 1,
                                px: 1.5,
                                py: 1,
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderLeft: `4px solid ${team?.color || 'divider'}`,
                                display: 'grid',
                                gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                                gap: 1.5,
                                alignItems: 'center'
                            }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" fontWeight={600} noWrap sx={{ color: 'text.primary' }}>
                                        {p.name}
                                    </Typography>
                                    {p.extra && (Object.values(p.extra).some(v => String(v).toLowerCase() === 'owner')) && (
                                        <Chip
                                            label="OWNER"
                                            size="small"
                                            sx={{
                                                height: 16,
                                                fontSize: '0.6rem',
                                                fontWeight: 900,
                                                bgcolor: 'secondary.main',
                                                color: 'secondary.contrastText'
                                            }}
                                        />
                                    )}
                                </Box>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {teamName}
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography variant="caption" sx={{ bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 0.5, px: 0.75, py: 0.25, fontWeight: 700, color: 'text.secondary' }}>
                                    {p.pool}
                                </Typography>
                            </Box>

                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="body2" fontWeight={700} sx={{ color: 'success.main', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatPts(p.soldFor)}
                                    {p.extra && (Object.values(p.extra).some(v => String(v).toLowerCase() === 'owner')) && (
                                        <Typography component="span" variant="caption" sx={{ ml: 0.5, fontWeight: 500, fontStyle: 'italic', opacity: 0.8 }}>
                                            (avg)
                                        </Typography>
                                    )}
                                </Typography>
                            </Box>
                        </ListItem>
                    );
                })}
            </List>
        </Paper>
    );
}
