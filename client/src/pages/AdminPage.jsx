import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuction } from '../contexts/AuctionContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import AuctionControls from '../components/admin/AuctionControls.jsx';
import PlayerImport from '../components/admin/PlayerImport.jsx';
import UnsoldList from '../components/admin/UnsoldList.jsx';
import PlayerCard from '../components/auction/PlayerCard.jsx';
import BidDisplay from '../components/auction/BidDisplay.jsx';
import CountdownTimer from '../components/auction/CountdownTimer.jsx';
import BidHistory from '../components/auction/BidHistory.jsx';
import { formatPts } from '../utils/budgetCalc.js';
import { getAvgPointsKey } from '../utils/playerSort.js';
import DashboardView, { RemainingPlayersPane } from '../components/admin/DashboardView.jsx';
import PlayerDataTab from '../components/shared/PlayerDataTab.jsx';
import CommentaryFeed from '../components/shared/CommentaryFeed.jsx';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LogoutIcon from '@mui/icons-material/Logout';

const TABS = ['League Setup', 'Auction Controls', 'Commentary', 'Player Data', 'Settings', 'Dashboard'];

export default function AdminPage() {
  const { auctionState, connected, adminAction } = useAuction();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('Auction Controls');
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  if (!auctionState) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <Typography color="text.disabled">Connecting to auction…</Typography>
        <Button variant="outlined" color="inherit" size="small" startIcon={<LogoutIcon />} onClick={logout} sx={{ borderColor: 'divider', color: 'text.secondary' }}>
          Sign Out
        </Button>
      </Box>
    );
  }

  const { phase } = auctionState;
  const player = auctionState.players?.[auctionState.currentPlayerIndex] ?? null;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 52 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '1.3rem' }}>🏏</Typography>
            <Typography fontWeight={800} color="primary">RPL Admin</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FiberManualRecordIcon sx={{ fontSize: 10, color: connected ? 'success.main' : 'error.main' }} />
            <Button variant="outlined" color="inherit" size="small" startIcon={<LogoutIcon />} onClick={logout} sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: '0.8rem' }}>
              Sign Out
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, flex: 1, overflow: 'hidden' }}>
        {/* Live auction preview */}
        {(phase === 'LIVE' || phase === 'PAUSED') && player && (
          <Paper square sx={{ display: { xs: 'none', md: 'flex' }, width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', p: 1.5, flexDirection: 'column', gap: 1.5, overflowY: 'auto' }}>
            <Typography variant="overline" color="text.disabled">On Block</Typography>
            <PlayerCard player={player} />
            <CountdownTimer
              timerEndsAt={auctionState.timerEndsAt}
              timerPaused={auctionState.timerPaused}
              timerRemainingOnPause={auctionState.timerRemainingOnPause}
              timerSeconds={auctionState.settings?.timerSeconds ?? 30}
              endMode={auctionState.settings?.endMode ?? 'timer'}
            />
            <BidDisplay currentBid={auctionState.currentBid} teams={auctionState.teams} player={player} />
            <Typography variant="overline" color="text.disabled">Bids</Typography>
            <BidHistory history={auctionState.currentBid?.history} />
          </Paper>
        )}

        {/* Main panel */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', pr: { xs: '48px', lg: 0 } }}>
          {/* Global Commentary Banner (optional, but let's stick to the tab for now as requested) */}
          <Paper square sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
              {TABS.map(t => <Tab key={t} label={t} value={t} sx={{ fontSize: '0.85rem', minHeight: 48 }} />)}
            </Tabs>
          </Paper>

          {tab === 'Dashboard' ? (
            <DashboardView state={auctionState} />
          ) : (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, overflow: 'hidden' }}>
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
                {tab === 'League Setup' && <LeagueSetupTab auctionState={auctionState} onImported={() => setShowReviewDialog(true)} />}
                {tab === 'Auction Controls' && <AuctionControlsTab auctionState={auctionState} adminAction={adminAction} onImported={() => setShowReviewDialog(true)} />}
                {tab === 'Commentary' && <CommentaryFeed commentary={auctionState.commentary} />}
                {tab === 'Player Data' && <PlayerDataTab auctionState={auctionState} adminAction={adminAction} />}
                {tab === 'Settings' && <SettingsTab auctionState={auctionState} />}
              </Box>

              {tab === 'Auction Controls' && (
                <RemainingPlayersPane
                  players={auctionState.players || []}
                  pools={auctionState.leagueConfig?.pools || []}
                  currentPlayerId={player?.id || null}
                  spilloverIds={auctionState.leagueConfig?.spilloverPlayerIds || []}
                  width={340}
                />
              )}
            </Box>
          )}
        </Box>
      </Box>

      <PostImportReviewDialog
        open={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        auctionState={auctionState}
      />
    </Box>
  );
}

// ─── League Setup Tab ─────────────────────────────────────────────────────────

function LeagueSetupTab({ auctionState, onImported }) {
  const { phase, leagueConfig } = auctionState;
  const isSetup = phase === 'SETUP';

  const ownerPlayers = (auctionState.players || []).filter(p => {
    if (!p.extra) return false;
    const typeKey = Object.keys(p.extra).find(k => String(k).trim().toLowerCase() === 'type' || String(k).trim().toLowerCase() === 'player_type');
    return typeKey && String(p.extra[typeKey]).trim().toLowerCase() === 'owner';
  });

  const allExtraKeys = React.useMemo(() => {
    const keys = new Set();
    const hidden = new Set(['player_type', 'other_s25']);
    (auctionState.players || []).forEach(p => {
      if (p.extra) {
        Object.keys(p.extra).forEach(k => {
          if (!hidden.has(String(k).trim().toLowerCase())) keys.add(k);
        });
      }
    });
    return Array.from(keys);
  }, [auctionState.players]);

  const [cfg, setCfg] = useState(() => JSON.parse(JSON.stringify(leagueConfig)));
  const [teams, setTeams] = useState(() => {
    const t = JSON.parse(JSON.stringify(auctionState.teams));
    if (Object.keys(t).length === 0) {
      const init = {};
      for (let i = 1; i <= 10; i++) {
        init[`team_${i}`] = { id: `team_${i}`, name: `Team ${i}`, password: 'team123' };
      }
      return init;
    }
    return t;
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editingPools, setEditingPools] = useState(false);
  const [editingGlobal, setEditingGlobal] = useState(false);
  const [editingTeams, setEditingTeams] = useState(false);
  const [poolTransfers, setPoolTransfers] = useState([]);
  const [mergeModal, setMergeModal] = useState({ open: false, sourceIdx: null });
  const [splitModal, setSplitModal] = useState({ open: false });

  useEffect(() => {
    setCfg(JSON.parse(JSON.stringify(leagueConfig)));
    if (auctionState.teams && Object.keys(auctionState.teams).length > 0) {
      setTeams(JSON.parse(JSON.stringify(auctionState.teams)));
    }
  }, [leagueConfig, auctionState.teams]);

  const required = parseInt(cfg.numTeams) * parseInt(cfg.squadSize);
  const poolTotal = cfg.pools.reduce((s, p) => s + (parseInt(p.count) || 0), 0);
  const overflow = Math.max(0, poolTotal - required);
  const teamCount = Object.keys(teams).length;
  const poolsValid = poolTotal >= required;
  const teamsValid = teamCount === parseInt(cfg.numTeams);
  const ownerValid = Object.values(teams).every(t => !t.ownerIsPlayer || (t.ownerPlayerIds && t.ownerPlayerIds.length > 0));
  const spilloverValid = overflow === 0 || ((cfg.spilloverPlayerIds || []).length === overflow);
  const canSave = poolsValid && teamsValid && ownerValid && spilloverValid;
  const auctionStarted = phase !== 'SETUP' || (auctionState.players || []).some(p => p.status !== 'PENDING');

  function updatePool(idx, field, val) {
    setCfg(prev => {
      const pools = [...prev.pools];
      const p = pools[idx];
      // Keep track of the original id so the backend can cascade renames to players
      if (field === 'id' && p.oldId === undefined) {
        p.oldId = p.id;
      }
      pools[idx] = { ...p, [field]: val };
      if (field === 'id') {
        pools[idx].label = val; // Keep label in sync with id
      }
      return { ...prev, pools };
    });
  }

  function addPool() {
    setSplitModal({ open: true });
  }

  function removePool(idx) {
    if (cfg.pools[idx].count > 0) {
      setMergeModal({ open: true, sourceIdx: idx });
    } else {
      setCfg(prev => ({ ...prev, pools: prev.pools.filter((_, i) => i !== idx) }));
    }
  }

  function addTeam() {
    const id = `team_${Date.now()}`;
    setTeams(prev => ({ ...prev, [id]: { id, name: '', password: 'team123' } }));
  }

  function removeTeam(id) {
    setTeams(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
  }

  function updateTeam(id, field, val) {
    setTeams(prev => {
      const updated = { ...prev[id], [field]: val };
      if (field === 'ownerIsPlayer' && val) updated.ownerName = '';
      if (field === 'ownerIsPlayer' && !val) updated.ownerPlayerIds = [];
      return { ...prev, [id]: updated };
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        leagueConfig: {
          ...cfg,
          numTeams: parseInt(cfg.numTeams),
          squadSize: parseInt(cfg.squadSize),
          startingBudget: parseInt(cfg.startingBudget),
          minBid: parseInt(cfg.minBid),
          visibleExtraColumns: cfg.visibleExtraColumns || '',
          pools: cfg.pools.map(p => ({
            ...p,
            count: parseInt(p.count),
            basePrice: parseInt(p.basePrice)
          })),
        },
        teams,
        poolTransfers,
      };
      await axios.post('/api/admin/league-config', payload);
      setMsg({ type: 'ok', msg: 'Saved successfully!' });
      setPoolTransfers([]);
    } catch (err) {
      setMsg({ type: 'err', msg: err.response?.data?.error || 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  const inputSm = { background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '6px', padding: '0.4rem 0.5rem', fontSize: '0.85rem', outline: 'none' };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 800 }}>
      {!isSetup && (
        <Alert severity="warning">
          League Setup is locked while auction is in progress. Reset the auction to make changes.
        </Alert>
      )}

      {/* Global Settings */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <SectionTitle style={{ margin: 0 }}>Global Settings</SectionTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {auctionStarted && (
              <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>
                Only Visible Columns can be edited during auction
              </Typography>
            )}
            <Button size="small" variant="outlined" color="primary" onClick={() => setEditingGlobal(!editingGlobal)} sx={{ fontSize: '0.75rem' }}>
              {editingGlobal ? 'Done Editing' : 'Edit Settings'}
            </Button>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {[
            { label: 'Number of Teams', key: 'numTeams', type: 'number', min: 2, unit: '' },
            { label: 'Squad Size', key: 'squadSize', type: 'number', min: 1, unit: '' },
            { label: 'Starting Budget', key: 'startingBudget', type: 'number', min: 1000, unit: 'pts' },
            { label: 'Min Bid', key: 'minBid', type: 'number', min: 100, unit: 'pts' },
            { label: 'Visible Columns', key: 'visibleExtraColumns', type: 'multiselect' },
          ].map(({ label, key, min, unit, type, placeholder }) => (
            <Box key={key} sx={{ flex: '1 1 160px', minWidth: 160, maxWidth: type === 'multiselect' ? '100%' : 'auto' }}>
              {editingGlobal ? (
                type === 'multiselect' ? (
                  <FormControl size="small" fullWidth>
                    <InputLabel>{label}</InputLabel>
                    <Select
                      multiple
                      label={label}
                      value={String(cfg[key] || '').split(',').map(s => s.trim()).filter(Boolean)}
                      disabled={false}
                      onChange={e => {
                        const val = e.target.value;
                        setCfg(prev => ({ ...prev, [key]: (typeof val === 'string' ? val : val.join(', ')) }));
                      }}
                      renderValue={(selected) => selected.join(', ')}
                    >
                      {allExtraKeys.length === 0 && <MenuItem disabled>No extra columns found</MenuItem>}
                      {allExtraKeys.map(k => (
                        <MenuItem key={k} value={k}>{k}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    label={label}
                    type={type || 'number'}
                    inputProps={{ min }}
                    placeholder={placeholder}
                    size="small"
                    value={cfg[key] || ''}
                    disabled={!isSetup || auctionStarted}
                    onChange={e => setCfg(prev => ({ ...prev, [key]: e.target.value }))}
                    fullWidth
                  />
                )
              ) : (
                <Box sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                  <Typography variant="body1" fontWeight={600} noWrap>
                    {type === 'multiselect' ? (cfg[key] || 'None') : `${parseInt(cfg[key] || 0).toLocaleString()} ${unit}`}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>
        {overflow > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(239, 68, 68, 0.05)', border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="error.main" fontWeight={600}>Action Required: Spillover Players</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You imported {poolTotal} players but only need {required} for all team rosters. You must designate exactly {overflow} players for Manual Sale to balance the draft.
            </Typography>
            {editingGlobal ? (
              <FormControl size="small" fullWidth error={!spilloverValid}>
                <InputLabel>Select {overflow} Spillover Player{overflow !== 1 ? 's' : ''}</InputLabel>
                <Select
                  multiple
                  label={`Select ${overflow} Spillover Player${overflow !== 1 ? 's' : ''}`}
                  value={cfg.spilloverPlayerIds || []}
                  onChange={e => {
                    const val = e.target.value;
                    setCfg(prev => ({ ...prev, spilloverPlayerIds: typeof val === 'string' ? val.split(',') : val }));
                  }}
                  renderValue={(selected) => selected.map(sid => auctionState.players?.find(p => p.id === sid)?.name || sid).filter(Boolean).join(', ')}
                >
                  {auctionState.players?.filter(p => p.status === 'PENDING' && (!p.extra || p.extra.type?.toLowerCase() !== 'owner')).map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.name} ({p.pool})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body1" fontWeight={600} noWrap>
                {(cfg.spilloverPlayerIds || []).length > 0
                  ? (cfg.spilloverPlayerIds || []).map(sid => auctionState.players?.find(p => p.id === sid)?.name).filter(Boolean).join(', ')
                  : <span style={{ color: '#ef4444' }}>None Selected</span>
                }
              </Typography>
            )}
          </Box>
        )}
        {editingGlobal && (
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', flexDirection: 'column', alignItems: 'flex-end' }}>
            {!spilloverValid && <Typography variant="caption" color="error.main" sx={{ mb: 1 }}>Please select exactly {overflow} spillover players before saving.</Typography>}
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={() => {
                setEditingGlobal(false);
                save();
              }}
              disabled={!canSave || saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
              sx={{ px: 3 }}
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Pool Configuration */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <SectionTitle style={{ margin: 0 }}>Player Pools</SectionTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color={poolsValid ? 'success.main' : 'error.main'} fontWeight={600}>
              {poolTotal} / {required} players
            </Typography>
            {isSetup && !auctionStarted && (
              <>
                <Button size="small" variant="outlined" color="primary" onClick={() => setEditingPools(!editingPools)} sx={{ fontSize: '0.75rem' }}>
                  {editingPools ? 'Done Editing' : 'Edit Pools'}
                </Button>
                {editingPools && (
                  <Button size="small" variant="outlined" color="inherit" onClick={addPool} sx={{ fontSize: '0.75rem' }}>
                    + Add Pool
                  </Button>
                )}
              </>
            )}
            {isSetup && auctionStarted && (
              <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>
                Pools locked (auction started)
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 120px) 1fr minmax(80px, 110px) 40px', gap: 1, px: 1 }}>
            {['ID', 'Base Price', 'Count', ''].map(h => (
              <Typography key={h} variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase' }}>{h}</Typography>
            ))}
          </Box>
          {cfg.pools.map((pool, idx) => (
            <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 120px) 1fr minmax(80px, 110px) 40px', gap: 1, bgcolor: 'background.default', p: 0.75, borderRadius: 1, alignItems: 'center', minHeight: '40px' }}>
              {editingPools ? (
                <>
                  <input style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }} value={pool.id} disabled={!isSetup} onChange={e => updatePool(idx, 'id', e.target.value.toUpperCase())} />
                  <input style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }} type="number" min="100" value={pool.basePrice} disabled={!isSetup} onChange={e => updatePool(idx, 'basePrice', e.target.value)} />
                  <input style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }} type="number" min="0" value={pool.count} disabled={!isSetup} onChange={e => updatePool(idx, 'count', e.target.value)} />
                  {isSetup
                    ? <Button size="small" color="error" variant="outlined" onClick={() => removePool(idx)} sx={{ minWidth: 32, p: '2px 4px', fontSize: '0.7rem' }}>✕</Button>
                    : <Box />}
                </>
              ) : (
                <>
                  <Typography variant="body2" sx={{ px: 1, fontWeight: 600 }}>{pool.id}</Typography>
                  <Typography variant="body2" sx={{ px: 1 }}>{parseInt(pool.basePrice).toLocaleString()} pts</Typography>
                  <Typography variant="body2" sx={{ px: 1 }}>{pool.count}</Typography>
                  <Box />
                </>
              )}
            </Box>
          ))}
        </Box>

        {isSetup && editingPools && (
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
            {(!poolsValid) && (
              <Typography variant="caption" color="error.main">Pool total ({poolTotal}) must equal {required} to save.</Typography>
            )}
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={() => {
                setEditingPools(false);
                save();
              }}
              disabled={!canSave || saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
              sx={{ px: 3 }}
            >
              {saving ? 'Saving…' : 'Save Pools'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Teams */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <SectionTitle style={{ margin: 0 }}>Teams</SectionTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color={teamsValid ? 'success.main' : 'error.main'} fontWeight={600}>
              {teamCount} / {cfg.numTeams} teams
            </Typography>
            {isSetup && !auctionStarted && (
              <>
                <Button size="small" variant="outlined" color="primary" onClick={() => setEditingTeams(!editingTeams)} sx={{ fontSize: '0.75rem' }}>
                  {editingTeams ? 'Done Editing' : 'Edit Teams'}
                </Button>
                {editingTeams && (
                  <Button size="small" variant="outlined" color="inherit" onClick={addTeam} sx={{ fontSize: '0.75rem' }}>
                    + Add Team
                  </Button>
                )}
              </>
            )}
            {isSetup && auctionStarted && (
              <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>
                Teams locked (auction started)
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: 1, px: 1 }}>
            {['Team Name', 'Password', ''].map(h => (
              <Typography key={h} variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase' }}>{h}</Typography>
            ))}
          </Box>

          {Object.entries(teams).map(([id, team]) => (
            <Box key={id} sx={{ bgcolor: 'background.default', p: 1, borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {editingTeams ? (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: 1, alignItems: 'center' }}>
                    <input style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }} placeholder="Team name" value={team.name || ''} disabled={!isSetup} onChange={e => updateTeam(id, 'name', e.target.value)} />
                    <input style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }} placeholder="Password" value={team.password || ''} disabled={!isSetup} onChange={e => updateTeam(id, 'password', e.target.value)} />
                    {isSetup
                      ? <Button size="small" color="error" variant="outlined" onClick={() => removeTeam(id)} sx={{ minWidth: 32, p: '2px 4px', fontSize: '0.7rem' }}>✕</Button>
                      : <Box />}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 0.5 }}>
                    <FormControlLabel
                      control={<Checkbox size="small" checked={!!team.ownerIsPlayer} disabled={!isSetup} onChange={e => updateTeam(id, 'ownerIsPlayer', e.target.checked)} sx={{ py: 0 }} />}
                      label={<Typography variant="caption" color="text.secondary">Owner is also a player</Typography>}
                      sx={{ m: 0 }}
                    />

                    {!team.ownerIsPlayer ? (
                      <input
                        style={{ ...inputSm, flex: 1, maxWidth: 260 }}
                        placeholder="Owner name"
                        value={team.ownerName || ''}
                        disabled={!isSetup}
                        onChange={e => updateTeam(id, 'ownerName', e.target.value)}
                      />
                    ) : (() => {
                      const takenIds = new Set(
                        Object.entries(teams)
                          .filter(([tid]) => tid !== id)
                          .flatMap(([, t]) => t.ownerPlayerIds || [])
                      );
                      const myOwners = team.ownerPlayerIds || [];
                      return (
                        <FormControl size="small" sx={{ flex: 1, maxWidth: 260 }} error={myOwners.length === 0}>
                          <InputLabel>Select owner players</InputLabel>
                          <Select
                            multiple
                            label="Select owner players"
                            value={myOwners}
                            disabled={!isSetup}
                            onChange={e => {
                              const val = e.target.value;
                              updateTeam(id, 'ownerPlayerIds', typeof val === 'string' ? val.split(',') : val);
                            }}
                            renderValue={(selected) => selected.map(sid => ownerPlayers.find(p => p.id === sid)?.name).filter(Boolean).join(', ')}
                          >
                            {ownerPlayers.map(p => {
                              if (!takenIds.has(p.id) || myOwners.includes(p.id)) {
                                return <MenuItem key={p.id} value={p.id}>{p.name} ({p.pool})</MenuItem>;
                              }
                              return null;
                            })}
                          </Select>
                        </FormControl>
                      );
                    })()}
                    {team.ownerIsPlayer && (!team.ownerPlayerIds || team.ownerPlayerIds.length === 0) && (
                      <Typography variant="caption" color="error">Required</Typography>
                    )}
                  </Box>
                </>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) minmax(120px, 1fr)', gap: 1, alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body1" fontWeight={600} noWrap>{team.name || '—'}</Typography>
                    {team.ownerIsPlayer && team.ownerPlayerIds && team.ownerPlayerIds.length > 0 && (
                      <Typography variant="caption" color="primary.main" display="block">
                        {team.ownerPlayerIds.length === 1 ? 'Owner' : 'Owners'}: {team.ownerPlayerIds.map(sid => ownerPlayers.find(p => p.id === sid)?.name).filter(Boolean).join(', ')}
                      </Typography>
                    )}
                    {!team.ownerIsPlayer && team.ownerName && (
                      <Typography variant="caption" color="primary.main" display="block">
                        Owner: {team.ownerName}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {team.password ? '••••••••' : '—'}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          ))}
        </Box>

        {isSetup && editingTeams && (
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
            {(!teamsValid || !ownerValid) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                {!teamsValid && <Typography variant="caption" color="error.main">Team count ({teamCount}) must equal {cfg.numTeams}.</Typography>}
                {!ownerValid && <Typography variant="caption" color="error.main">Teams with "Owner is also a player" must have an owner selected.</Typography>}
              </Box>
            )}
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={() => {
                setEditingTeams(false);
                save();
              }}
              disabled={!canSave || saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
              sx={{ px: 3 }}
            >
              {saving ? 'Saving…' : 'Save TeamInfo'}
            </Button>
          </Box>
        )}
      </Box>

      {
        msg && (
          <Alert severity={msg.type === 'ok' ? 'success' : 'error'} sx={{ py: 0.5 }}>
            {msg.msg}
          </Alert>
        )
      }

      {/* Merge Pool Modal (Delete Pool) */}
      <Dialog open={mergeModal.open} onClose={() => setMergeModal({ open: false, sourceIdx: null })}>
        <DialogTitle>Delete Pool & Merge Players</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, mt: 1 }}>
            Pool {cfg.pools[mergeModal.sourceIdx]?.id} has {cfg.pools[mergeModal.sourceIdx]?.count} players.
            Which pool should these players be moved to?
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Target Pool</InputLabel>
            <Select
              label="Target Pool"
              value={mergeModal.targetId || ''}
              onChange={e => setMergeModal(prev => ({ ...prev, targetId: e.target.value }))}
            >
              <MenuItem value=""><em>Select Target Pool</em></MenuItem>
              {cfg.pools.map((p, i) => (
                i !== mergeModal.sourceIdx ? <MenuItem key={p.id} value={p.id}>Pool {p.id}</MenuItem> : null
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeModal({ open: false, sourceIdx: null })}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!mergeModal.targetId}
            onClick={() => {
              const sourcePool = cfg.pools[mergeModal.sourceIdx];
              setCfg(prev => {
                const newPools = prev.pools.filter((_, i) => i !== mergeModal.sourceIdx);
                const targetIdx = newPools.findIndex(p => p.id === mergeModal.targetId);
                if (targetIdx !== -1) {
                  newPools[targetIdx].count += parseInt(sourcePool.count || 0);
                }
                return { ...prev, pools: newPools };
              });
              setPoolTransfers(prev => [...prev, {
                type: 'MERGE',
                sourcePoolId: sourcePool.oldId || sourcePool.id,
                targetPoolId: mergeModal.targetId
              }]);
              setMergeModal({ open: false, sourceIdx: null, targetId: null });
            }}
          >
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Split Pool Modal (Add Pool) */}
      <Dialog open={splitModal.open} onClose={() => setSplitModal({ open: false, sourceId: null, count: 0 })}>
        <DialogTitle>Add New Pool</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, mt: 1 }}>
            To add a new pool while maintaining the total player count, you can optionally move players from an existing pool.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Source Pool</InputLabel>
              <Select
                label="Source Pool"
                value={splitModal.sourceId || ''}
                onChange={e => setSplitModal(prev => ({ ...prev, sourceId: e.target.value }))}
              >
                <MenuItem value=""><em>None (0 count)</em></MenuItem>
                {cfg.pools.map(p => (
                  <MenuItem key={p.id} value={p.id}>Pool {p.id} (Count: {p.count})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Players to Move"
              type="number"
              size="small"
              value={splitModal.count === undefined ? '' : splitModal.count}
              onChange={e => setSplitModal(prev => ({ ...prev, count: parseInt(e.target.value) || 0 }))}
              disabled={!splitModal.sourceId}
              inputProps={{ min: 0 }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSplitModal({ open: false, sourceId: null, count: 0 })}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              const newId = `P${cfg.pools.length + 1}`;
              const count = splitModal.sourceId ? (splitModal.count || 0) : 0;

              setCfg(prev => {
                const newPools = [...prev.pools];
                if (splitModal.sourceId && count > 0) {
                  const sourceIdx = newPools.findIndex(p => p.id === splitModal.sourceId);
                  if (sourceIdx !== -1) {
                    newPools[sourceIdx].count = Math.max(0, parseInt(newPools[sourceIdx].count || 0) - count);
                  }
                }
                newPools.push({ id: newId, label: newId, basePrice: 1000, count });
                return { ...prev, pools: newPools };
              });

              if (splitModal.sourceId && count > 0) {
                const sourceConfigPool = cfg.pools.find(p => p.id === splitModal.sourceId);
                setPoolTransfers(prev => [...prev, {
                  type: 'SPLIT',
                  sourcePoolId: sourceConfigPool.oldId || sourceConfigPool.id,
                  targetPoolId: newId,
                  count
                }]);
              }
              setSplitModal({ open: false, sourceId: null, count: 0 });
            }}
          >
            Add Pool
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
}

// ─── Auction Controls Tab ─────────────────────────────────────────────────────

function AuctionControlsTab({ auctionState, adminAction, onImported }) {
  const { phase, players, currentPlayerIndex, currentBid, teams } = auctionState;

  const isSetup = phase === 'SETUP';
  const player = players?.[currentPlayerIndex] ?? null;
  const pending = players.filter(p => p.status === 'PENDING').length;
  const sold = players.filter(p => p.status === 'SOLD').length;
  const unsold = players.filter(p => p.status === 'UNSOLD').length;

  const [showLoadTestModal, setShowLoadTestModal] = useState(false);
  const [showFullResetModal, setShowFullResetModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [importData, setImportData] = useState(null);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [copiedWA, setCopiedWA] = useState(false);

  const hasExistingData = players.length > 0 || Object.keys(teams).length > 0;

  async function downloadResults() {
    try {
      const res = await axios.get('/api/admin/export-results', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'auction-results.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed'); }
  }

  async function downloadState() {
    try {
      const res = await axios.get('/api/admin/export-state', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'auction-state.json'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed'); }
  }

  function copyWhatsAppSummary() {
    if (!teams || Object.keys(teams).length === 0) return;

    let text = `🏆 *RPL Auction Summary* 🏆\n\n`;
    const sortedTeams = Object.values(teams).sort((a, b) => a.name.localeCompare(b.name));

    sortedTeams.forEach(t => {
      text += `🏏 *${t.name}*\n`;
      text += `💰 Budget Remaining: ${formatPts(t.budget)}\n`;
      const roster = t.roster || [];
      if (roster.length > 0) {
        text += `👥 Roster:\n`;
        roster.forEach(r => text += `  - ${r.playerName} (${r.pool}) - ${formatPts(r.price)}\n`);
      } else {
        text += `👥 Roster: (Empty)\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopiedWA(true);
      setTimeout(() => setCopiedWA(false), 2000);
    }).catch(err => alert("Failed to copy text: " + err));
  }

  async function resetAuction() {
    if (!confirm('Reset auction progress? All bids, sold records, and team budgets will be cleared back to starting amounts. Teams and players remain.')) return;
    try {
      await axios.post('/api/admin/reset-auction');
    } catch (err) {
      alert(err.response?.data?.error || 'Reset failed');
    }
  }



  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* 
        On mobile screens, the left side live view is hidden. 
        Render a compact version of it here at the top of the controls tab. 
      */}
      {(phase === 'LIVE' || phase === 'PAUSED') && player && (
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, mb: 1 }}>
          <Typography variant="overline" color="text.disabled">On Block</Typography>
          <PlayerCard player={player} />
          <CountdownTimer
            timerEndsAt={auctionState.timerEndsAt}
            timerPaused={auctionState.timerPaused}
            timerRemainingOnPause={auctionState.timerRemainingOnPause}
            timerSeconds={auctionState.settings?.timerSeconds ?? 30}
            endMode={auctionState.settings?.endMode ?? 'timer'}
          />
          <BidDisplay currentBid={currentBid} teams={teams} player={player} />
        </Box>
      )}

      {/* Stats row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: 1, sm: 2 } }}>
        {[
          { label: 'Pending', val: pending, color: 'warning.main' },
          { label: 'Sold', val: sold, color: 'success.main' },
          { label: 'Unsold', val: unsold, color: 'error.main' },
        ].map(s => (
          <Paper key={s.label} variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography color={s.color} fontWeight={800} fontSize="1.8rem" lineHeight={1}>{s.val}</Typography>
            <Typography variant="caption" color="text.disabled">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Auction Controls component */}
      <Box>
        <SectionTitle>Auction Controls</SectionTitle>
        <AuctionControls />
      </Box>

      {/* Player Import */}
      {isSetup && (
        <Box>
          <SectionTitle>Import Players</SectionTitle>
          <PlayerImport onImported={onImported} />
        </Box>
      )}

      {/* Unsold players */}
      <Box>
        <SectionTitle>Unsold Players ({unsold})</SectionTitle>
        <UnsoldList />
      </Box>

      {/* Exports & Reset */}
      <Box>
        <SectionTitle>Exports &amp; Reset</SectionTitle>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Button variant="contained" color="info" size="small" onClick={downloadResults}>⬇ Results CSV</Button>
            <Button variant="outlined" color="inherit" size="small" onClick={downloadState}>⬇ Backup State</Button>
            <Button variant="contained" color="success" size="small" sx={{ fontWeight: 700 }} onClick={copyWhatsAppSummary}>
              📋 {copiedWA ? 'Copied!' : 'WhatsApp'}
            </Button>

            <Button variant="contained" color="secondary" size="small" component="label">
              ⬆ Restore Backup
              <input type="file" accept=".json" hidden onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = '';
                const reader = new FileReader();
                reader.onload = evt => {
                  try { setImportData(JSON.parse(evt.target.result)); }
                  catch { alert('Invalid JSON file — could not parse the backup.'); }
                };
                reader.readAsText(file);
              }} />
            </Button>

            <Button
              variant="contained"
              color="info"
              size="small"
              onClick={() => setShowLoadTestModal(true)}
              title="Replace current setup with sample data"
            >
              🧪 Load Test Data
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
            {isSetup && auctionState.lastSoldPlayerId && (() => {
              const lsp = auctionState.players.find(p => p.id === auctionState.lastSoldPlayerId);
              return lsp ? (
                <Button variant="outlined" size="small" sx={{ borderColor: 'secondary.main', color: 'secondary.main' }} onClick={() => setShowRollbackModal(true)} title={`Rollback: ${lsp.name}`}>
                  ↩ Rollback: {lsp.name}
                </Button>
              ) : null;
            })()}
            <Button variant="contained" color="error" size="small" onClick={() => setShowResetModal(true)}>⚠ Reset Auction</Button>
            <Button variant="outlined" color="error" size="small" onClick={() => setShowFullResetModal(true)} sx={{ borderStyle: 'dashed' }}>
              ☠ Full Reset
            </Button>
          </Box>
        </Box>
      </Box>

      {showLoadTestModal && <LoadTestDataModal hasExistingData={hasExistingData} isSetup={isSetup} onClose={() => setShowLoadTestModal(false)} />}
      {showFullResetModal && <FullResetModal onClose={() => setShowFullResetModal(false)} />}
      {showResetModal && <ResetAuctionModal onClose={() => setShowResetModal(false)} />}
      {importData && <ImportStateModal importedState={importData} onClose={() => setImportData(null)} />}
      {showRollbackModal && <RollbackModal auctionState={auctionState} onClose={() => setShowRollbackModal(false)} />}
    </Box>
  );
}


// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ auctionState }) {
  const { teams, settings } = auctionState;
  const teamList = Object.values(teams);
  const [passwords, setPasswords] = useState({});
  const [dashPin, setDashPin] = useState(settings.dashboardPin || '');
  const [hostPin, setHostPin] = useState(settings.hostPin || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setDashPin(settings.dashboardPin || ''); }, [settings.dashboardPin]);
  useEffect(() => { setHostPin(settings.hostPin || ''); }, [settings.hostPin]);
  useEffect(() => { setPasswords({}); }, [Object.keys(teams).join(',')]);

  const hasChanges = Object.values(passwords).some(p => p.trim()) || dashPin !== (settings.dashboardPin || '') || hostPin !== (settings.hostPin || '');

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await axios.post('/api/admin/update-passwords', { teams: passwords, dashboardPin: dashPin, hostPin });
      setPasswords({});
      setMsg({ type: 'ok', text: 'Settings saved!' });
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.error || 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 4 }}>

      {/* Team Passwords */}
      <Box>
        <SectionTitle>Team Passwords</SectionTitle>
        {teamList.length === 0 ? (
          <Typography color="text.disabled" fontSize="0.85rem">No teams configured yet. Set up teams in League Setup first.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, px: 0.5 }}>
              <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase' }}>Team Name</Typography>
              <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase' }}>New Password</Typography>
            </Box>
            {teamList.map(team => (
              <Box key={team.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, bgcolor: 'background.default', p: 1, borderRadius: 1, alignItems: 'center' }}>
                <Typography fontSize="0.88rem">{team.name}</Typography>
                <TextField
                  size="small"
                  type="text"
                  placeholder="Leave empty to keep current"
                  value={passwords[team.id] || ''}
                  onChange={e => setPasswords(prev => ({ ...prev, [team.id]: e.target.value }))}
                />
              </Box>
            ))}
            <Typography variant="caption" color="text.disabled" sx={{ pl: 0.5 }}>
              Leave a field empty to keep the existing password unchanged.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Dashboard PIN */}
      <Box>
        <SectionTitle>Dashboard PIN</SectionTitle>
        <Typography color="text.secondary" fontSize="0.82rem" mb={1.5}>
          Spectators must enter this PIN to view the live dashboard at <code>/dashboard</code>. Leave empty for open access.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            size="small"
            value={dashPin}
            onChange={e => setDashPin(e.target.value)}
            placeholder="No PIN — open access"
            inputProps={{ maxLength: 20 }}
            sx={{ width: 220 }}
          />
          <Typography variant="caption" color={settings.dashboardPin ? 'warning.main' : 'text.disabled'}>
            {settings.dashboardPin ? '● PIN active' : '○ Open access'}
          </Typography>
        </Box>
      </Box>

      {/* Host PIN */}
      <Box>
        <SectionTitle>Host PIN</SectionTitle>
        <Typography color="text.secondary" fontSize="0.82rem" mb={1.5}>
          Optional PIN for the Host Screen login. Leave empty for open access.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            size="small"
            value={hostPin}
            onChange={e => setHostPin(e.target.value)}
            placeholder="No PIN — open access"
            inputProps={{ maxLength: 20 }}
            sx={{ width: 220 }}
          />
          <Typography variant="caption" color={settings.hostPin ? 'warning.main' : 'text.disabled'}>
            {settings.hostPin ? '● PIN active' : '○ Open access'}
          </Typography>
        </Box>
      </Box>

      {/* Save */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          color="success"
          onClick={save}
          disabled={saving || !hasChanges}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
        {msg && (
          <Typography variant="caption" color={msg.type === 'ok' ? 'success.main' : 'error.main'}>
            {msg.type === 'ok' ? '✓' : '✗'} {msg.text}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function LoadTestDataModal({ hasExistingData, isSetup, onClose }) {
  const [password, setPassword] = useState('');
  const [storagePref, setStoragePref] = useState('local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleLoad() {
    setLoading(true); setError('');
    try {
      await axios.post('/api/admin/load-test-data', { password, storagePreference: storagePref });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load test data');
    } finally { setLoading(false); }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>🧪 Load Test Data</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {done ? (
          <>
            <Alert severity="success">Test data loaded successfully!</Alert>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.disabled" display="block" mb={0.75} sx={{ textTransform: 'uppercase' }}>Team passwords</Typography>
              {[['Team Alpha', 'alpha123'], ['Team Beta', 'beta123'], ['Team Gamma', 'gamma123']].map(([name, pw]) => (
                <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                  <Typography fontSize="0.85rem">{name}</Typography>
                  <Typography component="code" fontSize="0.85rem" color="primary.main">{pw}</Typography>
                </Box>
              ))}
            </Paper>
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">This will populate the auction with sample data for testing:</Typography>
            <Paper variant="outlined" sx={{ p: 1.5, fontSize: '0.82rem' }}>
              <Typography fontSize="0.82rem" color="text.secondary" mb={0.5}><Box component="span" color="primary.main" fontWeight={700}>3 Teams</Box> — Team Alpha, Beta, Gamma (45,000 pts each)</Typography>
              <Typography fontSize="0.82rem" color="text.secondary" mb={0.5}><Box component="span" color="primary.main" fontWeight={700}>36 Players</Box> across 2 pools:</Typography>
              <Box sx={{ pl: 1.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography fontSize="0.82rem" color="text.secondary">Pool A — 6 players (+3 owners), base price <Box component="span" color="success.main">3,000 pts</Box></Typography>
                <Typography fontSize="0.82rem" color="text.secondary">Pool B — 27 players, base price <Box component="span" color="success.main">1,000 pts</Box></Typography>
              </Box>
            </Paper>
            {hasExistingData && <Alert severity="warning">⚠ Existing teams and players will be replaced.</Alert>}
            <TextField type="password" label="Admin password" placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && password && handleLoad()} autoFocus error={!!error} helperText={error} size="small" fullWidth />
            <StoragePreferenceSelector value={storagePref} onChange={setStoragePref} />
          </>
        )}
      </DialogContent>
      <DialogActions>
        {done ? (
          <Button onClick={onClose} variant="contained" color="success">Close</Button>
        ) : (
          <>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            <Button onClick={handleLoad} variant="contained" color="info" disabled={!password || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>
              {loading ? 'Loading…' : hasExistingData ? '⚠ Replace & Load' : '🧪 Load Test Data'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function RollbackModal({ auctionState, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const player = auctionState.players.find(p => p.id === auctionState.lastSoldPlayerId);
  const team = player?.soldTo ? auctionState.teams[player.soldTo] : null;

  async function handleRollback() {
    setError(''); setLoading(true);
    try {
      const res = await axios.post('/api/admin/rollback-last-sale');
      setDone(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Rollback failed');
    } finally { setLoading(false); }
  }

  if (!player) {
    return (
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>↩ Rollback</DialogTitle>
        <DialogContent><Alert severity="error">No recent sale found to rollback.</Alert></DialogContent>
        <DialogActions><Button onClick={onClose} color="inherit">Close</Button></DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>↩ Rollback Last Sale</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {done ? (
          <Alert severity="success">✓ {done}</Alert>
        ) : (
          <>
            <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {[['Player', player.name, '#f1f5f9'], ['Pool', player.pool, '#94a3b8'], ['Sold to', team?.name || '—', '#f1f5f9'], ['Sold for', `${player.soldFor?.toLocaleString()} pts`, '#f59e0b']].map(([label, val, color]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <Typography fontSize="0.85rem" color="text.disabled">{label}</Typography>
                  <Typography fontSize="0.85rem" fontWeight={600} color={color}>{val}</Typography>
                </Box>
              ))}
            </Paper>
            <Alert severity="info" sx={{ fontSize: '0.82rem' }}>
              This will return <strong>{player.name}</strong> to the player pool and refund <strong>{player.soldFor?.toLocaleString()} pts</strong> to <strong>{team?.name}</strong>.
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {done ? (
          <Button onClick={onClose} variant="contained" color="success">Close</Button>
        ) : (
          <>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            <Button onClick={handleRollback} variant="contained" color="secondary" disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>
              {loading ? 'Rolling back…' : '↩ Confirm Rollback'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function ImportStateModal({ importedState: s, onClose }) {
  const [password, setPassword] = useState('');
  const [storagePref, setStoragePref] = useState('local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const players = s.players || [];
  const teamsList = Object.values(s.teams || {});
  const sold = players.filter(p => p.status === 'SOLD').length;
  const pending = players.filter(p => p.status === 'PENDING').length;
  const unsold = players.filter(p => p.status === 'UNSOLD').length;
  const currentPlayer = s.currentPlayerIndex != null ? players[s.currentPlayerIndex] : null;
  const phaseLabel = { SETUP: 'Setup', LIVE: '● Live', PAUSED: '⏸ Paused', ENDED: 'Ended' }[s.phase] || s.phase;
  const phaseColor = { SETUP: 'text.disabled', LIVE: 'success.main', PAUSED: 'warning.main', ENDED: 'text.disabled' }[s.phase] || 'text.disabled';

  async function handleImport() {
    setError(''); setLoading(true);
    try {
      await axios.post('/api/admin/import-state', { password, state: s, storagePreference: storagePref });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally { setLoading(false); }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>📦 Restore Backup</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {done ? (
          <>
            <Alert severity="success">Backup restored successfully!</Alert>
            {s.phase === 'LIVE' && <Alert severity="warning">⏸ The auction was mid-round — the timer has been paused. Press Resume when ready.</Alert>}
          </>
        ) : (
          <>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.disabled" display="block" mb={1} sx={{ textTransform: 'uppercase' }}>Backup snapshot</Typography>
              {[
                ['Phase', phaseLabel, phaseColor],
                ['Players', `${sold} sold · ${pending} pending · ${unsold} unsold`, 'text.primary'],
                ...(currentPlayer ? [['On block', currentPlayer.name, 'text.primary']] : []),
                ['Teams', String(teamsList.length), 'text.primary'],
              ].map(([label, val, color]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                  <Typography fontSize="0.82rem" color="text.disabled">{label}</Typography>
                  <Typography fontSize="0.82rem" fontWeight={600} color={color}>{val}</Typography>
                </Box>
              ))}
              {teamsList.map(t => (
                <Box key={t.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.2, pl: 1.5 }}>
                  <Typography fontSize="0.82rem" color="text.disabled">{t.name}</Typography>
                  <Typography fontSize="0.82rem" color="text.secondary">{(t.budget || 0).toLocaleString()} pts · {(t.roster || []).length} players</Typography>
                </Box>
              ))}
            </Paper>
            <Alert severity="error">⚠ This will overwrite all current auction data with the backup.</Alert>
            <TextField type="password" label="Admin password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && password && handleImport()} autoFocus error={!!error} helperText={error} size="small" fullWidth />

            <StoragePreferenceSelector value={storagePref} onChange={setStoragePref} />
          </>
        )}
      </DialogContent>
      <DialogActions>
        {done ? (
          <Button onClick={onClose} variant="contained" color="success">Close</Button>
        ) : (
          <>
            <Button onClick={onClose} color="inherit">Cancel</Button>
            <Button onClick={handleImport} variant="contained" color="secondary" disabled={!password || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>
              {loading ? 'Restoring…' : '📦 Restore Backup'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function FullResetModal({ onClose }) {
  const [password, setPassword] = useState('');
  const [storagePref, setStoragePref] = useState('local');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError(''); setLoading(true);
    try {
      await axios.post('/api/admin/full-reset', { password, storagePreference: storagePref });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally { setLoading(false); }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ color: 'error.main' }}>☠ Full Reset — Permanent</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Alert severity="error">
          <Typography fontWeight={700} fontSize="0.82rem" mb={0.5}>This will permanently delete:</Typography>
          {['All teams and rosters', 'All player data', 'All bids and auction results', 'League configuration (resets to defaults)'].map(item => (
            <div key={item}>✕ {item}</div>
          ))}
          <Typography fontWeight={700} mt={0.5} fontSize="0.78rem">This action cannot be undone.</Typography>
        </Alert>
        <TextField type="password" label="Admin password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && password && handleReset()} autoFocus error={!!error} helperText={error} size="small" fullWidth />
        <StoragePreferenceSelector value={storagePref} onChange={setStoragePref} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleReset} variant="contained" color="error" disabled={!password || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>
          {loading ? 'Deleting…' : '☠ Permanently Delete All Data'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ResetAuctionModal({ onClose }) {
  const [password, setPassword] = useState('');
  const [storagePref, setStoragePref] = useState('local');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError(''); setLoading(true);
    try {
      await axios.post('/api/admin/reset-auction', { password, storagePreference: storagePref });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally { setLoading(false); }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ color: 'warning.main' }}>⚠ Reset Auction</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Alert severity="warning">
          <Typography fontWeight={700} fontSize="0.82rem" mb={0.5}>Reset auction progress?</Typography>
          <Typography fontSize="0.78rem">All bids, sold records, and team budgets will be cleared back to starting amounts.</Typography>
          <Typography fontSize="0.78rem" mt={0.5}>Teams and players remain.</Typography>
        </Alert>
        <TextField type="password" label="Admin password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && password && handleReset()} autoFocus error={!!error} helperText={error} size="small" fullWidth />
        <StoragePreferenceSelector value={storagePref} onChange={setStoragePref} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleReset} variant="contained" color="warning" disabled={!password || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>
          {loading ? 'Resetting…' : '⚠ Reset Auction'}
        </Button>
      </DialogActions>
    </Dialog>
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

// ─── Shared helpers ───────────────────────────────────────────────────────────

function StoragePreferenceSelector({ value, onChange }) {
  return (
    <Box sx={{ mt: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default' }}>
      <Typography variant="overline" color="text.secondary" display="block" mb={1} lineHeight={1}>Storage Preference</Typography>
      <ToggleButtonGroup exclusive size="small" value={value} onChange={(_, val) => val && onChange(val)} fullWidth>
        <ToggleButton value="auto" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
          ☁ Auto (Redis if ENV)
        </ToggleButton>
        <ToggleButton value="local" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
          💾 Force Local JSON
        </ToggleButton>
      </ToggleButtonGroup>
      <Typography variant="caption" color="text.disabled" display="block" mt={1} lineHeight={1.2}>
        {value === 'auto' ? 'Uses Upstash Serverless Redis if credentials are provided in the environment. Fast and persistent across Railway restarts.' : 'Forces writes to disk (state.json). Warning: Railway deployment disks are ephemeral by default.'}
      </Typography>
    </Box>
  );
}

function SectionTitle({ children, style }) {
  return (
    <Typography variant="overline" color="text.secondary" display="block" fontWeight={700} sx={{ mb: 1, ...style }}>
      {children}
    </Typography>
  );
}

function TH({ children, first, right, center }) {
  return (
    <th style={{
      padding: '0.55rem 0.75rem', textAlign: right ? 'right' : center ? 'center' : 'left',
      color: '#64748b', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase',
      letterSpacing: '0.06em', whiteSpace: 'nowrap', borderLeft: first ? 'none' : '1px solid #1e293b',
      borderBottom: '2px solid #1e293b',
      ...(first && { paddingLeft: '1rem' }), ...(right && { paddingRight: '1rem' }),
    }}>
      {children}
    </th>
  );
}

function TD({ children, first, right, center, style = {} }) {
  return (
    <td style={{
      padding: '0.5rem 0.75rem', textAlign: right ? 'right' : center ? 'center' : 'left',
      borderLeft: first ? 'none' : '1px solid #1e293b', borderBottom: '1px solid #0f172a',
      verticalAlign: 'middle',
      ...(first && { paddingLeft: '1rem' }), ...(right && { paddingRight: '1rem' }), ...style,
    }}>
      {children}
    </td>
  );
}

function PostImportReviewDialog({ open, onClose, auctionState }) {
  const { leagueConfig, settings, players = [] } = auctionState;
  const required = (leagueConfig?.numTeams || 0) * (leagueConfig?.squadSize || 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white', py: 1.5 }}>
        Review League & Auction Setup
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Players have been imported successfully. Please verify the configuration before starting the auction.
        </Typography>

        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* League Setup */}
          <Box>
            <Typography variant="subtitle2" color="primary" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 0.5, mb: 1.5 }}>
              League Structure
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <ReviewItem label="Total Teams" value={leagueConfig?.numTeams} />
              <ReviewItem label="Squad Size" value={leagueConfig?.squadSize} />
              <ReviewItem label="Starting Budget" value={leagueConfig?.startingBudget ? `${leagueConfig.startingBudget.toLocaleString()} pts` : '—'} />
              <ReviewItem label="Min Bid" value={leagueConfig?.minBid ? `${leagueConfig.minBid.toLocaleString()} pts` : '—'} />
            </Box>
          </Box>

          {/* Auction Controls */}
          <Box>
            <Typography variant="subtitle2" color="primary" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 0.5, mb: 1.5 }}>
              Auction Logic
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <ReviewItem label="Timer Seconds" value={settings?.timerSeconds} />
              <ReviewItem label="Bid Increment" value={settings?.bidIncrement ? `${settings.bidIncrement.toLocaleString()} pts` : '—'} />
              <ReviewItem label="End Mode" value={settings?.endMode?.toUpperCase()} />
              <ReviewItem label="Randomize Pool" value={settings?.randomizePool ? 'YES' : 'NO'} />
            </Box>
          </Box>

          {/* Data Summary */}
          <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Data Verification</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Players Imported</Typography>
              <Typography variant="body2" fontWeight={700}>{players.length}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Roster Spots Required</Typography>
              <Typography variant="body2" fontWeight={700}>{required}</Typography>
            </Box>
            {players.length > required && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'warning.main', mt: 0.5 }}>
                <Typography variant="caption">Overflow/Spillover</Typography>
                <Typography variant="caption" fontWeight={700}>{players.length - required}</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: 'action.hover' }}>
        <Button onClick={onClose} variant="contained" color="secondary" fullWidth>
          Confirm & Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReviewItem({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value ?? '—'}</Typography>
    </Box>
  );
}
