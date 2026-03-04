import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Paper from '@mui/material/Paper';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { getAvgPointsKey } from '../../utils/playerSort.js';
import { formatPts } from '../../utils/budgetCalc.js';

function playerIsOwner(player) {
    if (!player.extra) return false;
    const typeKey = Object.keys(player.extra).find(k => k.toLowerCase() === 'type' || k.toLowerCase() === 'player_type');
    return typeKey ? String(player.extra[typeKey]).toLowerCase() === 'owner' : false;
}

export default function PlayerDataTab({ auctionState, adminAction, readOnly = false }) {
    const { players = [], teams = {} } = auctionState;
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    // default to average points descending if found
    const initialSortCol = React.useMemo(() => getAvgPointsKey(players), [players]);
    const [sortCol, setSortCol] = useState(initialSortCol);
    const [sortDir, setSortDir] = useState('desc');
    const [editPlayer, setEditPlayer] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedPlayers, setEditedPlayers] = useState({}); // id -> { field: val }
    const [saving, setSaving] = useState(false);

    // keep default sort in sync if players array completely changes
    useEffect(() => {
        if (!sortCol && initialSortCol) {
            setSortCol(initialSortCol);
            setSortDir('desc');
        }
    }, [initialSortCol]);

    const handleExportCSV = () => {
        try {
            const headers = ['name', 'pool', 'basePrice', ...extraKeys];
            const rows = players.map(p => {
                return [
                    p.name,
                    p.pool,
                    p.basePrice,
                    ...extraKeys.map(k => p.extra?.[k] ?? '')
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
            });
            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            saveAs(blob, `players-export-${Date.now()}.csv`);
        } catch (err) {
            console.error('Export failed', err);
            alert('Export failed');
        }
    };

    if (players.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', p: 6, color: 'text.disabled' }}>
                No players imported yet. Use the League Setup tab to import a CSV.
            </Box>
        );
    }

    const HIDDEN_EXTRA_COLS = new Set(['player_type', 'other_s25']);
    const extraKeys = [];
    for (const p of players) {
        if (p.extra) {
            for (const k of Object.keys(p.extra)) {
                if (!extraKeys.includes(k) && !HIDDEN_EXTRA_COLS.has(k.toLowerCase())) extraKeys.push(k);
            }
        }
    }

    const statusCfg = {
        PENDING: { color: '#f59e0b', bg: '#451a03', label: 'Pending' },
        SOLD: { color: '#22c55e', bg: '#14532d', label: 'Sold' },
        UNSOLD: { color: '#ef4444', bg: '#3b0a0a', label: 'Unsold' },
    };

    const toggleEdit = () => {
        if (isEditing) {
            setEditedPlayers({});
        }
        setIsEditing(!isEditing);
    };

    const handleFieldChange = (playerId, field, value) => {
        setEditedPlayers(prev => {
            const current = prev[playerId] || {};
            return { ...prev, [playerId]: { ...current, [field]: value } };
        });
    };

    const handleExtraFieldChange = (playerId, key, value) => {
        setEditedPlayers(prev => {
            const pUpdate = prev[playerId] || {};
            const playerExtra = players.find(p => p.id === playerId)?.extra || {};
            const currentExtra = pUpdate.extra || playerExtra;
            return {
                ...prev,
                [playerId]: { ...pUpdate, extra: { ...currentExtra, [key]: value } }
            };
        });
    };

    const handleSave = async () => {
        const updates = Object.entries(editedPlayers).map(([id, fields]) => ({ id, ...fields }));
        if (updates.length === 0) {
            setIsEditing(false);
            return;
        }

        setSaving(true);
        try {
            if (!readOnly) {
                await axios.post('/api/admin/save-players', { updates });
            }
            setEditedPlayers({});
            setIsEditing(false);
        } catch (err) {
            alert('Failed to save changes: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const poolClr = (poolId) => {
        if (poolId?.startsWith('A')) return { color: '#f59e0b', bg: '#1c0d00', border: '#f59e0b40' };
        if (poolId?.startsWith('B')) return { color: '#60a5fa', bg: '#0d1c35', border: '#3b82f640' };
        if (poolId?.startsWith('C')) return { color: '#a78bfa', bg: '#150d2e', border: '#8b5cf640' };
        return { color: '#94a3b8', bg: '#0f1a2e', border: '#64748b40' };
    };

    function handleSort(col) {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    }

    let filtered = players.filter(p => {
        if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
        if (search) {
            const s = search.toLowerCase();
            const inName = p.name.toLowerCase().includes(s);
            const inPool = p.pool.toLowerCase().includes(s);
            const inExtra = Object.values(p.extra || {}).some(v => String(v).toLowerCase().includes(s));
            const soldTeamName = p.soldTo ? teams[p.soldTo]?.name || '' : '';
            const inTeam = soldTeamName.toLowerCase().includes(s);
            if (!inName && !inPool && !inExtra && !inTeam) return false;
        }
        return true;
    });

    if (sortCol) {
        filtered = [...filtered].sort((a, b) => {
            let av, bv;
            if (sortCol === '#') { av = Number(a.sortOrder); bv = Number(b.sortOrder); }
            else if (sortCol === 'pool') { av = a.pool; bv = b.pool; }
            else if (sortCol === 'name') { av = a.name; bv = b.name; }
            else if (sortCol === 'base') { av = Number(a.basePrice); bv = Number(b.basePrice); }
            else if (sortCol === 'status') { av = a.status; bv = b.status; }
            else if (sortCol === 'soldFor') { av = Number(a.soldFor ?? -1); bv = Number(b.soldFor ?? -1); }
            else if (sortCol === 'soldTo') { av = a.soldTo ? (teams[a.soldTo]?.name ?? '') : ''; bv = b.soldTo ? (teams[b.soldTo]?.name ?? '') : ''; }
            else {
                const ra = a.extra?.[sortCol] ?? '', rb = b.extra?.[sortCol] ?? '';
                const na = parseFloat(ra), nb = parseFloat(rb);
                if (!isNaN(na) && !isNaN(nb)) { av = na; bv = nb; }
                else { av = String(ra).toLowerCase(); bv = String(rb).toLowerCase(); }
            }
            if (typeof av === 'string') av = av.toLowerCase();
            if (typeof bv === 'string') bv = bv.toLowerCase();
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const sortIndicator = (col) => {
        if (sortCol !== col) return <span style={{ color: '#334155', marginLeft: 3, fontSize: '0.6rem' }}>⇅</span>;
        return <span style={{ color: '#94a3b8', marginLeft: 3, fontSize: '0.6rem' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
    };

    const thSort = (col, label, opts = {}) => (
        <th key={col} onClick={() => handleSort(col)} style={{
            padding: '0.55rem 0.75rem', textAlign: opts.right ? 'right' : opts.center ? 'center' : 'left',
            color: sortCol === col ? '#cbd5e1' : '#64748b', fontWeight: 700, fontSize: '0.68rem',
            textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
            borderBottom: '1px solid #1e293b', cursor: 'pointer', userSelect: 'none',
            ...(opts.first && { paddingLeft: '1rem' }), ...(opts.right && { paddingRight: '1rem' }),
        }}>
            {label}{sortIndicator(col)}
        </th>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                    <Typography fontWeight={700}>Player Data</Typography>
                    <Typography variant="caption" color="text.disabled">{filtered.length} of {players.length} players</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <TextField
                        size="small"
                        placeholder="Search…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        sx={{ width: 150 }}
                        disabled={isEditing}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {['ALL', 'PENDING', 'SOLD', 'UNSOLD'].map(f => {
                            const count = f === 'ALL' ? players.length : players.filter(p => p.status === f).length;
                            const active = statusFilter === f;
                            const cfg = f === 'ALL' ? { color: '#94a3b8' } : statusCfg[f];
                            return (
                                <Chip
                                    key={f}
                                    label={`${f === 'ALL' ? 'All' : statusCfg[f].label} (${count})`}
                                    size="small"
                                    onClick={() => !isEditing && setStatusFilter(f)}
                                    variant={active ? 'filled' : 'outlined'}
                                    disabled={isEditing}
                                    sx={{
                                        fontSize: '0.72rem',
                                        bgcolor: active ? `${cfg.color}20` : 'transparent',
                                        color: active ? cfg.color : 'text.disabled',
                                        borderColor: active ? cfg.color : 'divider',
                                        cursor: isEditing ? 'default' : 'pointer',
                                    }}
                                />
                            );
                        })}
                    </Box>
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                        {!isEditing ? (
                            <>
                                {!readOnly && (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={toggleEdit}
                                        sx={{ fontWeight: 600, textTransform: 'none' }}
                                    >
                                        ✏ Edit Mode
                                    </Button>
                                )}
                                <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    onClick={handleExportCSV}
                                    sx={{ fontWeight: 600, textTransform: 'none' }}
                                >
                                    📊 Export CSV
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    onClick={handleSave}
                                    disabled={saving}
                                    sx={{ fontWeight: 600, textTransform: 'none' }}
                                >
                                    {saving ? 'Saving...' : '💾 Save Changes'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    size="small"
                                    onClick={toggleEdit}
                                    disabled={saving}
                                    sx={{ fontWeight: 600, textTransform: 'none' }}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </Box>
                </Box>
            </Box>

            {/* Table */}
            <Box sx={{ overflowX: 'auto', borderRadius: 2, border: '1px solid #1e293b' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600, fontSize: '0.82rem' }}>
                    <thead>
                        <tr style={{ background: '#0f172a', position: 'sticky', top: 0, zIndex: 1 }}>
                            {thSort('#', '#', { first: true })}
                            {thSort('name', 'Player Name')}
                            {thSort('pool', 'Pool')}
                            {thSort('status', 'Status', { center: true })}
                            {thSort('soldTo', 'Sold To')}
                            {thSort('soldFor', 'Sold Price', { right: true })}
                            {extraKeys.map(k => thSort(k, k))}
                            {thSort('base', 'Base', { right: true })}
                            <TH center></TH>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p, i) => {
                            const owner = playerIsOwner(p);
                            const changes = editedPlayers[p.id] || {};
                            const sc = statusCfg[changes.status !== undefined ? changes.status : p.status] || statusCfg.PENDING;

                            const currentPoolId = changes.pool !== undefined ? changes.pool : p.pool;
                            const pc = poolClr(currentPoolId);

                            const soldTeam = p.soldTo ? teams[p.soldTo] : null;
                            const rowBg = i % 2 === 0 ? '#0f172a' : '#0a111e';

                            const isChanged = (field) => {
                                if (field === 'extra') return !!changes.extra;
                                return changes[field] !== undefined && String(changes[field]) !== String(p[field]);
                            };

                            const cellStyle = (field) => ({
                                background: isChanged(field) ? '#422006' : 'transparent',
                                border: isChanged(field) ? '1px solid #f59e0b40' : 'none',
                                borderRadius: 4,
                                width: '100%',
                                boxSizing: 'border-box'
                            });

                            return (
                                <tr key={p.id} style={{ background: rowBg, transition: 'background 0.1s' }}
                                    onMouseEnter={e => !isEditing && (e.currentTarget.style.background = '#162032')}
                                    onMouseLeave={e => !isEditing && (e.currentTarget.style.background = rowBg)}
                                >
                                    <TD first style={{ color: '#475569' }}>{i + 1}</TD>
                                    <TD style={{ color: '#f1f5f9', fontWeight: 500, ...cellStyle('name') }}>
                                        {isEditing ? (
                                            <input
                                                style={{ background: 'transparent', border: 'none', color: 'inherit', width: '100%', padding: '0.1rem' }}
                                                value={changes.name !== undefined ? changes.name : p.name}
                                                onChange={e => handleFieldChange(p.id, 'name', e.target.value)}
                                            />
                                        ) : (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                {p.name}
                                                {owner && (
                                                    <span style={{ background: '#1e1035', color: '#a78bfa', border: '1px solid #7c3aed60', borderRadius: 3, padding: '0.05rem 0.35rem', fontSize: '0.62rem', fontWeight: 700 }}>OWNER</span>
                                                )}
                                            </span>
                                        )}
                                    </TD>
                                    <TD style={cellStyle('pool')}>
                                        {isEditing ? (
                                            <select
                                                style={{ background: '#0f172a', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 4, padding: '2px 4px', width: '100%' }}
                                                value={currentPoolId}
                                                onChange={e => handleFieldChange(p.id, 'pool', e.target.value)}
                                            >
                                                {auctionState.leagueConfig.pools.map(pool => (
                                                    <option key={pool.id} value={pool.id}>{pool.id}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 4, padding: '0.15rem 0.45rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.pool}</span>
                                        )}
                                    </TD>
                                    <TD center style={cellStyle('status')}>
                                        {isEditing ? (
                                            <select
                                                style={{ background: '#0f172a', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 4, padding: '2px 4px', width: '100%' }}
                                                value={changes.status !== undefined ? changes.status : p.status}
                                                onChange={e => handleFieldChange(p.id, 'status', e.target.value)}
                                            >
                                                {['PENDING', 'SOLD', 'UNSOLD'].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span style={{ background: sc.bg, color: sc.color, borderRadius: 999, padding: '0.15rem 0.55rem', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{sc.label}</span>
                                        )}
                                    </TD>
                                    <TD style={{ color: '#cbd5e1' }}>{soldTeam?.name ?? '—'}</TD>
                                    <TD right style={{ whiteSpace: 'nowrap', ...cellStyle('soldFor') }}>
                                        {isEditing && (changes.status === 'SOLD' || (!changes.status && p.status === 'SOLD')) ? (
                                            <input
                                                type="number"
                                                style={{ background: 'transparent', border: 'none', color: 'inherit', textAlign: 'right', width: '60px' }}
                                                value={changes.soldFor !== undefined ? changes.soldFor : (p.soldFor || 0)}
                                                onChange={e => handleFieldChange(p.id, 'soldFor', e.target.value)}
                                                disabled={owner} // owners price is avg-based
                                            />
                                        ) : (
                                            owner && p.soldFor ? (
                                                <span style={{ color: '#a78bfa', fontWeight: 600 }}>{formatPts(p.soldFor)} <span style={{ color: '#7c3aed', fontSize: '0.65rem' }}>avg</span></span>
                                            ) : p.soldFor ? (
                                                <span style={{ color: '#22c55e', fontWeight: 600 }}>{formatPts(p.soldFor)}</span>
                                            ) : (
                                                <span style={{ color: '#334155' }}>—</span>
                                            )
                                        )}
                                    </TD>
                                    {extraKeys.map(k => {
                                        const extraVal = changes.extra && changes.extra[k] !== undefined ? changes.extra[k] : (p.extra?.[k] ?? '');
                                        return (
                                            <TD key={k} style={{ color: '#94a3b8', ...cellStyle(`extra_${k}`) }}>
                                                {isEditing ? (
                                                    <input
                                                        style={{ background: 'transparent', border: 'none', color: 'inherit', width: '100%' }}
                                                        value={extraVal}
                                                        onChange={e => handleExtraFieldChange(p.id, k, e.target.value)}
                                                    />
                                                ) : (
                                                    extraVal || '—'
                                                )}
                                            </TD>
                                        );
                                    })}
                                    <TD right style={{ color: '#94a3b8', whiteSpace: 'nowrap', ...cellStyle('basePrice') }}>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                style={{ background: 'transparent', border: 'none', color: 'inherit', textAlign: 'right', width: '60px' }}
                                                value={changes.basePrice !== undefined ? changes.basePrice : p.basePrice}
                                                onChange={e => handleFieldChange(p.id, 'basePrice', e.target.value)}
                                            />
                                        ) : (
                                            formatPts(p.basePrice)
                                        )}
                                    </TD>
                                    <TD center></TD>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </Box>
        </Box >
    );
}

function TH({ children, first, right, center }) {
    return (
        <th style={{
            padding: '0.65rem 0.75rem',
            color: '#64748b', fontWeight: 700, fontSize: '0.68rem',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            textAlign: right ? 'right' : center ? 'center' : 'left',
            whiteSpace: 'nowrap',
            borderBottom: '1px solid #1e293b',
            ...(first && { paddingLeft: '1rem' }),
            ...(right && { paddingRight: '1rem' }),
        }}>{children}</th>
    );
}

function TD({ children, first, right, center, style = {} }) {
    return (
        <td style={{
            padding: '0.55rem 0.75rem',
            textAlign: right ? 'right' : center ? 'center' : 'left',
            borderBottom: '1px solid #1e293b',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            ...(first && { paddingLeft: '1rem' }),
            ...(right && { paddingRight: '1rem' }),
            ...style,
        }}>{children}</td>
    );
}

function EditPriceModal({ player, teams, adminAction, onClose }) {
    const soldTeam = player.soldTo ? teams[player.soldTo] : null;
    const [amount, setAmount] = useState(String(player.soldFor || ''));
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    function handleSave() {
        const parsed = parseInt(amount);
        if (isNaN(parsed) || parsed <= 0) { setError('Enter a valid positive amount'); return; }
        setSaving(true); setError('');
        adminAction('admin:editSalePrice', { playerId: player.id, newAmount: parsed });
        setTimeout(onClose, 200);
    }

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>✏ Edit Sold Price</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {[['Player', player.name, 'text.primary'], ['Pool', player.pool, 'text.secondary'], ['Sold to', soldTeam?.name || '—', 'text.primary'], ['Current price', `${player.soldFor?.toLocaleString()} pts`, 'primary.main']].map(([label, val, color]) => (
                        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography fontSize="0.85rem" color="text.disabled">{label}</Typography>
                            <Typography fontSize="0.85rem" fontWeight={600} color={color}>{val}</Typography>
                        </Box>
                    ))}
                </Paper>
                <TextField
                    type="number"
                    label="New sold price (pts)"
                    inputProps={{ min: 1 }}
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    autoFocus
                    error={!!error}
                    helperText={error || `Team budget will be adjusted. Owner averages in Pool ${player.pool} will be recalculated.`}
                    size="small"
                    fullWidth
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="success" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Price'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
