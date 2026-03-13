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
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import { useTheme, alpha } from '@mui/material/styles';

function playerIsOwner(player) {
    if (!player.extra) return false;
    const typeKey = Object.keys(player.extra).find(k => k.toLowerCase() === 'type' || k.toLowerCase() === 'player_type');
    return typeKey ? String(player.extra[typeKey]).toLowerCase() === 'owner' : false;
}

export default function PlayerDataTab({ auctionState, adminAction, readOnly = false }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    if (!auctionState) {
        return (
            <Box sx={{ textAlign: 'center', p: 6, color: 'text.disabled' }}>
                Connecting to auction data…
            </Box>
        );
    }
    const { players = [], teams = {}, leagueConfig = {} } = auctionState;
    const spillovers = leagueConfig.spilloverPlayerIds || [];
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    // default to average points descending if found
    const initialSortCol = React.useMemo(() => getAvgPointsKey(players), [players]);
    const [sortCol, setSortCol] = useState('#');
    const [sortDir, setSortDir] = useState('asc');
    const [editPlayer, setEditPlayer] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedPlayers, setEditedPlayers] = useState({}); // id -> { field: val }
    const [saving, setSaving] = useState(false);
    const [columnFilters, setColumnFilters] = useState({}); // field -> [selectedValues]
    const [filterAnchor, setFilterAnchor] = useState({ el: null, col: null });

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
    let extraKeys = [];
    for (const p of players) {
        if (p.extra) {
            for (const k of Object.keys(p.extra)) {
                if (!extraKeys.includes(k) && !HIDDEN_EXTRA_COLS.has(k.toLowerCase())) extraKeys.push(k);
            }
        }
    }

    if (readOnly) {
        const visibleColsStr = auctionState?.leagueConfig?.visibleExtraColumns || '';
        const allowedCols = new Set(visibleColsStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
        const avgKey = getAvgPointsKey(players);
        if (avgKey) allowedCols.add(avgKey.toLowerCase());
        extraKeys = extraKeys.filter(k => allowedCols.has(k.toLowerCase()));
    }

    const statusCfg = {
        PENDING: { 
            color: theme.palette.warning.main, 
            bg: alpha(theme.palette.warning.main, 0.15), 
            label: 'Pending' 
        },
        SOLD: { 
            color: theme.palette.success.main, 
            bg: alpha(theme.palette.success.main, 0.15), 
            label: 'Sold' 
        },
        UNSOLD: { 
            color: theme.palette.error.main, 
            bg: alpha(theme.palette.error.main, 0.15), 
            label: 'Unsold' 
        },
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
        if (poolId?.startsWith('A')) return { color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.1), border: alpha(theme.palette.warning.main, 0.3) };
        if (poolId?.startsWith('B')) return { color: theme.palette.info.main, bg: alpha(theme.palette.info.main, 0.1), border: alpha(theme.palette.info.main, 0.3) };
        if (poolId?.startsWith('C')) return { color: theme.palette.secondary.main, bg: alpha(theme.palette.secondary.main, 0.1), border: alpha(theme.palette.secondary.main, 0.3) };
        return { color: theme.palette.text.secondary, bg: alpha(theme.palette.text.primary, 0.05), border: theme.palette.divider };
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

        // --- Per-column Dropdown Filters ---
        for (const [col, selected] of Object.entries(columnFilters)) {
            if (!selected || selected.length === 0) continue;
            
            let pVal = '';
            if (col === '#') pVal = String(players.indexOf(p) + 1);
            else if (col === 'name') pVal = p.name;
            else if (col === 'pool') pVal = p.pool;
            else if (col === 'status') pVal = p.status;
            else if (col === 'soldTo') pVal = p.soldTo ? teams[p.soldTo]?.name || '—' : '—';
            else if (col === 'soldFor') pVal = p.soldFor ? String(p.soldFor) : '—';
            else if (col === 'base') pVal = String(p.basePrice ?? '');
            else pVal = String(p.extra?.[col] ?? '—');

            if (!selected.includes(pVal)) return false;
        }

        return true;
    });

    const sortIndicator = (col) => {
        if (sortCol !== col) return <span style={{ color: theme.palette.text.disabled, marginLeft: 3, fontSize: '0.6rem' }}>⇅</span>;
        return <span style={{ color: theme.palette.primary.main, marginLeft: 3, fontSize: '0.6rem' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
    };

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

    const thSort = (col, label, opts = {}) => {
        const hasFilter = columnFilters[col] && columnFilters[col].length > 0;
        return (
            <th key={col} style={{
                padding: '0.55rem 0.25rem', textAlign: opts.right ? 'right' : opts.center ? 'center' : 'left',
                color: sortCol === col ? theme.palette.text.primary : theme.palette.text.secondary, fontWeight: 700, fontSize: '0.68rem',
                textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                borderBottom: `1px solid ${theme.palette.divider}`, userSelect: 'none',
                ...(opts.first && { paddingLeft: '1rem' }), ...(opts.right && { paddingRight: '1rem' }),
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: opts.right ? 'flex-end' : opts.center ? 'center' : 'flex-start' }}>
                    <span onClick={() => handleSort(col)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        {label}{sortIndicator(col)}
                    </span>
                    <IconButton 
                        size="small" 
                        onClick={(e) => setFilterAnchor({ el: e.currentTarget, col })}
                        sx={{ 
                            ml: 0.5, p: 0.2, 
                            color: hasFilter ? theme.palette.warning.main : alpha(theme.palette.text.secondary, 0.4),
                            '&:hover': { color: theme.palette.text.primary }
                        }}
                    >
                        <FilterListIcon sx={{ fontSize: '0.9rem' }} />
                    </IconButton>
                </Box>
            </th>
        );
    };

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
                                        bgcolor: active ? alpha(cfg.color, 0.2) : 'transparent',
                                        color: active ? cfg.color : 'text.disabled',
                                        borderColor: active ? cfg.color : 'divider',
                                        cursor: isEditing ? 'default' : 'pointer',
                                    }}
                                />
                            );
                        })}
                    </Box>
                    {Object.values(columnFilters).some(v => v && v.length > 0) && (
                        <Button
                            size="small"
                            onClick={() => setColumnFilters({})}
                            sx={{ color: '#ef4444', fontWeight: 700, textTransform: 'none', fontSize: '0.7rem' }}
                        >
                            ✕ Clear Filters
                        </Button>
                    )}
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
            <Box sx={{ overflowX: 'auto', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600, fontSize: '0.82rem' }}>
                    <thead>
                        <tr style={{ background: theme.palette.background.paper, position: 'sticky', top: 0, zIndex: 1 }}>
                            {thSort('#', '#', { first: true })}
                            {thSort('name', 'Player Name')}
                            {thSort('pool', 'Pool')}
                            {!readOnly && thSort('status', 'Status', { center: true })}
                            {!readOnly && thSort('soldTo', 'Sold To')}
                            {!readOnly && thSort('soldFor', 'Sold Price', { right: true })}
                            {extraKeys.map(k => thSort(k, k))}
                            {thSort('base', 'Base Price', { right: true })}
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
                            const isSpillover = spillovers.includes(p.id);
                            const rowBg = isSpillover 
                                ? (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)')
                                : (i % 2 === 0 ? theme.palette.background.paper : theme.palette.background.default);

                            const isChanged = (field) => {
                                if (field === 'extra') return !!changes.extra;
                                return changes[field] !== undefined && String(changes[field]) !== String(p[field]);
                            };

                            const cellStyle = (field) => ({
                                background: isChanged(field) ? (isDark ? '#422006' : '#fffbeb') : 'transparent',
                                border: isChanged(field) ? `1px solid ${isDark ? '#f59e0b40' : '#f59e0b80'}` : 'none',
                                borderRadius: 4,
                                width: '100%',
                                boxSizing: 'border-box'
                            });

                            return (
                                <tr key={p.id} style={{ background: rowBg, transition: 'background 0.1s' }}
                                    onMouseEnter={e => !isEditing && (e.currentTarget.style.background = alpha(theme.palette.primary.main, 0.1))}
                                    onMouseLeave={e => !isEditing && (e.currentTarget.style.background = rowBg)}
                                >
                                    <TD first theme={theme} style={{ color: theme.palette.text.disabled }}>{i + 1}</TD>
                                    <TD theme={theme} style={{ color: theme.palette.text.primary, fontWeight: 500, ...cellStyle('name') }}>
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
                                                    <span style={{ background: alpha(theme.palette.secondary.main, 0.2), color: theme.palette.secondary.main, border: `1px solid ${alpha(theme.palette.secondary.main, 0.4)}`, borderRadius: 3, padding: '0.05rem 0.35rem', fontSize: '0.62rem', fontWeight: 700 }}>OWNER</span>
                                                )}
                                                {spillovers.includes(p.id) && (
                                                    <span style={{ background: alpha(theme.palette.text.secondary, 0.1), color: theme.palette.text.secondary, border: `1px solid ${alpha(theme.palette.text.secondary, 0.3)}`, borderRadius: 3, padding: '0.05rem 0.35rem', fontSize: '0.62rem', fontWeight: 700 }} title="This player will not be drafted randomly and must be auctioned manually">MANUAL SALE</span>
                                                )}
                                            </span>
                                        )}
                                    </TD>
                                    <TD theme={theme} style={cellStyle('pool')}>
                                        {isEditing ? (
                                            <select
                                                style={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, color: theme.palette.text.primary, borderRadius: 4, padding: '2px 4px', width: '100%' }}
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
                                    {!readOnly && (
                                        <>
                                            <TD center theme={theme} style={cellStyle('status')}>
                                                {isEditing ? (
                                                    <select
                                                        style={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, color: theme.palette.text.primary, borderRadius: 4, padding: '2px 4px', width: '100%' }}
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
                                            <TD theme={theme} style={{ color: theme.palette.text.primary }}>{soldTeam?.name ?? '—'}</TD>
                                            <TD right theme={theme} style={{ whiteSpace: 'nowrap', ...cellStyle('soldFor') }}>
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
                                                        <span style={{ color: theme.palette.secondary.main, fontWeight: 600 }}>{formatPts(p.soldFor)} <span style={{ color: theme.palette.secondary.dark, fontSize: '0.65rem' }}>avg</span></span>
                                                    ) : p.soldFor ? (
                                                        <span style={{ color: theme.palette.success.main, fontWeight: 600 }}>{formatPts(p.soldFor)}</span>
                                                    ) : (
                                                        <span style={{ color: theme.palette.text.disabled }}>—</span>
                                                    )
                                                )}
                                            </TD>
                                        </>
                                    )}
                                    {extraKeys.map(k => {
                                        const extraVal = changes.extra && changes.extra[k] !== undefined ? changes.extra[k] : (p.extra?.[k] ?? '');
                                        return (
                                            <TD key={k} theme={theme} style={{ color: theme.palette.text.secondary, ...cellStyle(`extra_${k}`) }}>
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
                                    <TD right theme={theme} style={{ color: theme.palette.text.secondary, whiteSpace: 'nowrap', ...cellStyle('basePrice') }}>
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
            <FilterMenu 
                anchor={filterAnchor} 
                onClose={() => setFilterAnchor({ el: null, col: null })}
                players={players}
                teams={teams}
                filters={columnFilters}
                setFilters={setColumnFilters}
            />
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

function TD({ children, first, right, center, style = {}, theme }) {
    return (
        <td style={{
            padding: '0.55rem 0.75rem',
            textAlign: right ? 'right' : center ? 'center' : 'left',
            borderBottom: `1px solid ${theme?.palette.divider || '#1e293b'}`,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            ...(first && { paddingLeft: '1rem' }),
            ...(right && { paddingRight: '1rem' }),
            ...style,
        }}>{children}</td>
    );
}

function FilterMenu({ anchor, onClose, players, teams, filters, setFilters }) {
    const [search, setSearch] = useState('');
    const col = anchor.col;
    
    // Get unique values for this column
    const values = React.useMemo(() => {
        if (!col) return [];
        const set = new Set();
        players.forEach((p, idx) => {
            let val = '';
            if (col === '#') val = String(idx + 1);
            else if (col === 'name') val = p.name;
            else if (col === 'pool') val = p.pool;
            else if (col === 'status') val = p.status;
            else if (col === 'soldTo') val = p.soldTo ? teams[p.soldTo]?.name || '—' : '—';
            else if (col === 'soldFor') val = p.soldFor ? String(p.soldFor) : '—';
            else if (col === 'base') val = String(p.basePrice ?? '');
            else val = String(p.extra?.[col] ?? '—');
            set.add(val);
        });
        return Array.from(set).sort((a, b) => {
            const na = parseFloat(a), nb = parseFloat(b);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return String(a).localeCompare(String(b));
        });
    }, [col, players, teams]);

    const filteredValues = values.filter(v => 
        String(v).toLowerCase().includes(search.toLowerCase())
    );

    const selected = filters[col] || [];
    const handleToggle = (val) => {
        const next = selected.includes(val) 
            ? selected.filter(v => v !== val) 
            : [...selected, val];
        setFilters(prev => ({ ...prev, [col]: next }));
    };

    const handleSelectAll = () => {
        if (selected.length === values.length && values.length > 0) {
            setFilters(prev => ({ ...prev, [col]: [] }));
        } else {
            setFilters(prev => ({ ...prev, [col]: values }));
        }
    };

    return (
        <Menu
            anchorEl={anchor.el}
            open={Boolean(anchor.el)}
            onClose={onClose}
            disableAutoFocusItem
            PaperProps={{
                sx: { 
                    bgcolor: 'background.paper', color: 'text.primary', minWidth: 220, maxHeight: 450,
                    border: '1px solid', borderColor: 'divider', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    mt: 1
                }
            }}
        >
            <Box sx={{ p: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <TextField
                    size="small"
                    placeholder="Search values..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    fullWidth
                    autoFocus
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: 'text.disabled', fontSize: '1rem' }} />
                            </InputAdornment>
                        ),
                        sx: { fontSize: '0.8rem' }
                    }}
                />
            </Box>
            <MenuItem 
                dense 
                onClick={handleSelectAll}
                sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1 }}
            >
                <Checkbox 
                    size="small" 
                    checked={selected.length === values.length && values.length > 0} 
                    indeterminate={selected.length > 0 && selected.length < values.length}
                    sx={{ color: 'text.disabled', '&.Mui-checked': { color: 'primary.main' }, '&.MuiCheckbox-indeterminate': { color: 'primary.main' } }}
                />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Select All</Typography>
            </MenuItem>
            <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
                {filteredValues.map(v => (
                    <MenuItem key={v} dense onClick={() => handleToggle(v)} sx={{ py: 0.5 }}>
                        <Checkbox 
                            size="small" 
                            checked={selected.includes(v)} 
                            sx={{ color: 'text.disabled', '&.Mui-checked': { color: 'primary.main' } }}
                        />
                        <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{v}</Typography>
                    </MenuItem>
                ))}
                {filteredValues.length === 0 && (
                    <Typography variant="caption" sx={{ p: 2, display: 'block', color: 'text.disabled', textAlign: 'center' }}>
                        No results
                    </Typography>
                )}
            </Box>
        </Menu>
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
