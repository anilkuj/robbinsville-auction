import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuction } from '../contexts/AuctionContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import AuctionControls from '../components/admin/AuctionControls.jsx';
import PlayerImport from '../components/admin/PlayerImport.jsx';
import TeamRosterTable from '../components/admin/TeamRosterTable.jsx';
import UnsoldList from '../components/admin/UnsoldList.jsx';
import PlayerCard from '../components/auction/PlayerCard.jsx';
import BidDisplay from '../components/auction/BidDisplay.jsx';
import CountdownTimer from '../components/auction/CountdownTimer.jsx';
import BidHistory from '../components/auction/BidHistory.jsx';
import { formatPts } from '../utils/budgetCalc.js';
import DashboardView from '../components/admin/DashboardView.jsx';
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
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LogoutIcon from '@mui/icons-material/Logout';

const TABS = ['League Setup', 'Auction Controls', 'Teams & Rosters', 'Player Data', 'Settings', 'Dashboard'];

export default function AdminPage() {
  const { auctionState, connected, adminAction } = useAuction();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('Auction Controls');

  if (!auctionState) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Typography color="text.disabled">Connecting to auction…</Typography>
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

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Live auction preview */}
        {(phase === 'LIVE' || phase === 'PAUSED') && player && (
          <Paper square sx={{ width: 260, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto' }}>
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
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Paper square sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
              {TABS.map(t => <Tab key={t} label={t} value={t} sx={{ fontSize: '0.85rem', minHeight: 48 }} />)}
            </Tabs>
          </Paper>

          {tab === 'Dashboard' ? (
            <DashboardView state={auctionState} />
          ) : (
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
              {tab === 'League Setup' && <LeagueSetupTab auctionState={auctionState} />}
              {tab === 'Auction Controls' && <AuctionControlsTab auctionState={auctionState} adminAction={adminAction} />}
              {tab === 'Teams & Rosters' && <TeamsTab auctionState={auctionState} />}
              {tab === 'Player Data' && <PlayerDataTab auctionState={auctionState} adminAction={adminAction} />}
              {tab === 'Settings' && <SettingsTab auctionState={auctionState} />}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ─── League Setup Tab ─────────────────────────────────────────────────────────

function LeagueSetupTab({ auctionState }) {
  const { phase, leagueConfig } = auctionState;
  const isSetup = phase === 'SETUP';

  const ownerPlayers = (auctionState.players || []).filter(p => {
    if (!p.extra) return false;
    const typeKey = Object.keys(p.extra).find(k => k.toLowerCase() === 'type' || k.toLowerCase() === 'player_type');
    return typeKey && String(p.extra[typeKey]).toLowerCase() === 'owner';
  });

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

  useEffect(() => {
    setCfg(JSON.parse(JSON.stringify(leagueConfig)));
    if (Object.keys(auctionState.teams).length > 0) {
      setTeams(JSON.parse(JSON.stringify(auctionState.teams)));
    }
  }, [leagueConfig]);

  const required = parseInt(cfg.numTeams) * parseInt(cfg.squadSize);
  const poolTotal = cfg.pools.reduce((s, p) => s + (parseInt(p.count) || 0), 0);
  const teamCount = Object.keys(teams).length;
  const poolsValid = poolTotal === required;
  const teamsValid = teamCount === parseInt(cfg.numTeams);
  const ownerValid = Object.values(teams).every(t => !t.ownerIsPlayer || (t.ownerPlayerId && t.ownerPlayerId !== ''));
  const canSave = isSetup && poolsValid && teamsValid && ownerValid;

  function updatePool(idx, field, val) {
    setCfg(prev => {
      const pools = [...prev.pools];
      pools[idx] = { ...pools[idx], [field]: val };
      return { ...prev, pools };
    });
  }

  function addPool() {
    const id = `P${cfg.pools.length + 1}`;
    setCfg(prev => ({ ...prev, pools: [...prev.pools, { id, label: id, basePrice: 1000, count: 0 }] }));
  }

  function removePool(idx) {
    setCfg(prev => ({ ...prev, pools: prev.pools.filter((_, i) => i !== idx) }));
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
      if (field === 'ownerIsPlayer' && !val) updated.ownerPlayerId = null;
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
          pools: cfg.pools.map(p => ({ ...p, count: parseInt(p.count), basePrice: parseInt(p.basePrice) })),
        },
        teams,
      };
      await axios.post('/api/admin/league-config', payload);
      setMsg({ type: 'ok', msg: 'Saved successfully!' });
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
        <SectionTitle>Global Settings</SectionTitle>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2 }}>
          {[
            { label: 'Number of Teams', key: 'numTeams', min: 2 },
            { label: 'Squad Size', key: 'squadSize', min: 1 },
            { label: 'Starting Budget', key: 'startingBudget', min: 1000 },
            { label: 'Min Bid', key: 'minBid', min: 100 },
          ].map(({ label, key, min }) => (
            <TextField
              key={key}
              label={label}
              type="number"
              inputProps={{ min }}
              size="small"
              value={cfg[key]}
              disabled={!isSetup}
              onChange={e => setCfg(prev => ({ ...prev, [key]: e.target.value }))}
              fullWidth
            />
          ))}
        </Box>
      </Box>

      {/* Pool Configuration */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <SectionTitle style={{ margin: 0 }}>Player Pools</SectionTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color={poolsValid ? 'success.main' : 'error.main'} fontWeight={600}>
              {poolTotal} / {required} players
            </Typography>
            {isSetup && <Button size="small" variant="outlined" color="inherit" onClick={addPool} sx={{ fontSize: '0.75rem' }}>+ Add Pool</Button>}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 110px 40px', gap: 1, px: 1 }}>
            {['ID', 'Label', 'Base Price', 'Count', ''].map(h => (
              <Typography key={h} variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase' }}>{h}</Typography>
            ))}
          </Box>
          {cfg.pools.map((pool, idx) => (
            <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 110px 40px', gap: 1, bgcolor: 'background.default', p: 0.75, borderRadius: 1, alignItems: 'center' }}>
              <input style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }} value={pool.id} disabled={!isSetup} onChange={e => updatePool(idx, 'id', e.target.value.toUpperCase())} />
              <input style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }} value={pool.label} disabled={!isSetup} onChange={e => updatePool(idx, 'label', e.target.value)} />
              <input style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }} type="number" min="100" value={pool.basePrice} disabled={!isSetup} onChange={e => updatePool(idx, 'basePrice', e.target.value)} />
              <input style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }} type="number" min="0" value={pool.count} disabled={!isSetup} onChange={e => updatePool(idx, 'count', e.target.value)} />
              {isSetup
                ? <Button size="small" color="error" variant="outlined" onClick={() => removePool(idx)} sx={{ minWidth: 32, p: '2px 4px', fontSize: '0.7rem' }}>✕</Button>
                : <Box />}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Teams */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <SectionTitle style={{ margin: 0 }}>Teams</SectionTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color={teamsValid ? 'success.main' : 'error.main'} fontWeight={600}>
              {teamCount} / {cfg.numTeams} teams
            </Typography>
            {isSetup && <Button size="small" variant="outlined" color="inherit" onClick={addTeam} sx={{ fontSize: '0.75rem' }}>+ Add Team</Button>}
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

                {team.ownerIsPlayer && (() => {
                  const takenIds = new Set(
                    Object.entries(teams)
                      .filter(([tid]) => tid !== id)
                      .map(([, t]) => t.ownerPlayerId)
                      .filter(Boolean)
                  );
                  const available = ownerPlayers.filter(p => !takenIds.has(p.id));
                  return (
                    <FormControl size="small" sx={{ flex: 1, maxWidth: 260 }} error={!team.ownerPlayerId}>
                      <InputLabel>Select owner player</InputLabel>
                      <Select
                        label="Select owner player"
                        value={team.ownerPlayerId || ''}
                        disabled={!isSetup}
                        onChange={e => updateTeam(id, 'ownerPlayerId', e.target.value || null)}
                      >
                        <MenuItem value=""><em>— Select team owner —</em></MenuItem>
                        {team.ownerPlayerId && !available.find(p => p.id === team.ownerPlayerId) && (() => {
                          const p = ownerPlayers.find(op => op.id === team.ownerPlayerId);
                          return p ? <MenuItem key={p.id} value={p.id}>{p.name} ({p.pool})</MenuItem> : null;
                        })()}
                        {available.map(p => <MenuItem key={p.id} value={p.id}>{p.name} ({p.pool})</MenuItem>)}
                      </Select>
                    </FormControl>
                  );
                })()}
                {team.ownerIsPlayer && !team.ownerPlayerId && (
                  <Typography variant="caption" color="error">Required</Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Save */}
      {isSetup && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {(!poolsValid || !teamsValid || !ownerValid) && (
            <Alert severity="error">
              <Typography fontWeight={700} fontSize="0.8rem" mb={0.5}>Cannot save — fix the following:</Typography>
              {!poolsValid && <div>• Pool total is <strong>{poolTotal}</strong> but must equal {cfg.numTeams} × {cfg.squadSize} = <strong>{required}</strong></div>}
              {!teamsValid && <div>• Team count is <strong>{teamCount}</strong> but "Number of Teams" is set to <strong>{cfg.numTeams}</strong></div>}
              {!ownerValid && <div>• Teams with "Owner is also a player" must have an owner player selected</div>}
            </Alert>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={save}
              disabled={!canSave || saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {saving ? 'Saving…' : 'Save League Config'}
            </Button>
            {canSave && <Typography variant="caption" color="success.main">✓ Ready to save</Typography>}
          </Box>
        </Box>
      )}

      {msg && (
        <Alert severity={msg.type === 'ok' ? 'success' : 'error'} sx={{ py: 0.5 }}>
          {msg.msg}
        </Alert>
      )}
    </Box>
  );
}

// ─── Auction Controls Tab ─────────────────────────────────────────────────────

function AuctionControlsTab({ auctionState, adminAction }) {
  const { phase, players, teams } = auctionState;

  const pending = players.filter(p => p.status === 'PENDING').length;
  const sold = players.filter(p => p.status === 'SOLD').length;
  const unsold = players.filter(p => p.status === 'UNSOLD').length;

  const [showLoadTestModal, setShowLoadTestModal] = useState(false);
  const [showFullResetModal, setShowFullResetModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [importData, setImportData] = useState(null);
  const [showRollbackModal, setShowRollbackModal] = useState(false);

  const isSetup = phase === 'SETUP';
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

  async function resetAuction() {
    if (!confirm('Reset auction progress? All bids, sold records, and team budgets will be cleared back to starting amounts. Teams and players remain.')) return;
    try {
      await axios.post('/api/admin/reset-auction');
    } catch (err) {
      alert(err.response?.data?.error || 'Reset failed');
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 800 }}>

      {/* Modals */}
      {showLoadTestModal && <LoadTestDataModal hasExistingData={hasExistingData} isSetup={isSetup} onClose={() => setShowLoadTestModal(false)} />}
      {showResetModal && <ResetAuctionModal onClose={() => setShowResetModal(false)} />}
      {showFullResetModal && <FullResetModal onClose={() => setShowFullResetModal(false)} />}
      {importData && <ImportStateModal importedState={importData} onClose={() => setImportData(null)} />}
      {showRollbackModal && <RollbackModal auctionState={auctionState} onClose={() => setShowRollbackModal(false)} />}

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
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
          <PlayerImport />
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
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Button variant="contained" color="info" size="small" onClick={downloadResults}>⬇ Results CSV</Button>
          <Button variant="outlined" color="inherit" size="small" onClick={downloadState}>⬇ Backup State</Button>

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
            disabled={!isSetup}
            onClick={() => setShowLoadTestModal(true)}
            title={!isSetup ? 'Reset the auction first to load test data' : ''}
          >
            🧪 Load Test Data
          </Button>

          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
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
    </Box>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────

function TeamsTab({ auctionState }) {
  if (!auctionState) return null;
  const { teams, leagueConfig } = auctionState;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 800 }}>
      <SectionTitle>All Teams</SectionTitle>
      <TeamRosterTable teams={teams} leagueConfig={leagueConfig} />
    </Box>
  );
}

// ─── Player Data Tab ──────────────────────────────────────────────────────────

function playerIsOwner(player) {
  if (!player.extra) return false;
  const typeKey = Object.keys(player.extra).find(k => k.toLowerCase() === 'type' || k.toLowerCase() === 'player_type');
  return typeKey ? String(player.extra[typeKey]).toLowerCase() === 'owner' : false;
}

function PlayerDataTab({ auctionState, adminAction }) {
  const { players = [], teams = {} } = auctionState;
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [editPlayer, setEditPlayer] = useState(null);

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
      {editPlayer && (
        <EditPriceModal player={editPlayer} teams={teams} adminAction={adminAction} onClose={() => setEditPlayer(null)} />
      )}

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
                  onClick={() => setStatusFilter(f)}
                  variant={active ? 'filled' : 'outlined'}
                  sx={{
                    fontSize: '0.72rem',
                    bgcolor: active ? `${cfg.color}20` : 'transparent',
                    color: active ? cfg.color : 'text.disabled',
                    borderColor: active ? cfg.color : 'divider',
                    cursor: 'pointer',
                  }}
                />
              );
            })}
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
              const sc = statusCfg[p.status] || statusCfg.PENDING;
              const pc = poolClr(p.pool);
              const soldTeam = p.soldTo ? teams[p.soldTo] : null;
              const rowBg = i % 2 === 0 ? '#0f172a' : '#0a111e';
              return (
                <tr key={p.id} style={{ background: rowBg, transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#162032'}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                >
                  <TD first style={{ color: '#475569' }}>{p.sortOrder + 1}</TD>
                  <TD style={{ color: '#f1f5f9', fontWeight: 500 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {p.name}
                      {owner && (
                        <span style={{ background: '#1e1035', color: '#a78bfa', border: '1px solid #7c3aed60', borderRadius: 3, padding: '0.05rem 0.35rem', fontSize: '0.62rem', fontWeight: 700 }}>OWNER</span>
                      )}
                    </span>
                  </TD>
                  <TD>
                    <span style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 4, padding: '0.15rem 0.45rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{p.pool}</span>
                  </TD>
                  <TD center>
                    <span style={{ background: sc.bg, color: sc.color, borderRadius: 999, padding: '0.15rem 0.55rem', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{sc.label}</span>
                  </TD>
                  <TD style={{ color: '#cbd5e1' }}>{soldTeam?.name ?? '—'}</TD>
                  <TD right style={{ whiteSpace: 'nowrap' }}>
                    {owner && p.soldFor ? (
                      <span style={{ color: '#a78bfa', fontWeight: 600 }}>{formatPts(p.soldFor)} <span style={{ color: '#7c3aed', fontSize: '0.65rem' }}>avg</span></span>
                    ) : p.soldFor ? (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>{formatPts(p.soldFor)}</span>
                    ) : (
                      <span style={{ color: '#334155' }}>—</span>
                    )}
                  </TD>
                  {extraKeys.map(k => <TD key={k} style={{ color: '#94a3b8' }}>{p.extra?.[k] ?? '—'}</TD>)}
                  <TD right style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatPts(p.basePrice)}</TD>
                  <TD center>
                    {p.status === 'SOLD' && !owner && (
                      <button onClick={() => setEditPlayer(p)} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 4, padding: '0.2rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer' }} title="Edit sold price">✏</button>
                    )}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ auctionState }) {
  const { teams, settings } = auctionState;
  const teamList = Object.values(teams);
  const [passwords, setPasswords] = useState({});
  const [dashPin, setDashPin] = useState(settings.dashboardPin || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { setDashPin(settings.dashboardPin || ''); }, [settings.dashboardPin]);
  useEffect(() => { setPasswords({}); }, [Object.keys(teams).join(',')]);

  const hasChanges = Object.values(passwords).some(p => p.trim()) || dashPin !== (settings.dashboardPin || '');

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await axios.post('/api/admin/update-passwords', { teams: passwords, dashboardPin: dashPin });
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleLoad() {
    setLoading(true); setError('');
    try {
      await axios.post('/api/admin/load-test-data', { password });
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
              <Typography fontSize="0.82rem" color="text.secondary" mb={0.5}><Box component="span" color="primary.main" fontWeight={700}>3 Teams</Box> — Team Alpha, Beta, Gamma (30,000 pts each)</Typography>
              <Typography fontSize="0.82rem" color="text.secondary" mb={0.5}><Box component="span" color="primary.main" fontWeight={700}>33 Players</Box> across 3 pools:</Typography>
              <Box sx={{ pl: 1.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography fontSize="0.82rem" color="text.secondary">Pool A — 11 players, base price <Box component="span" color="success.main">3,000 pts</Box></Typography>
                <Typography fontSize="0.82rem" color="text.secondary">Pool B — 11 players, base price <Box component="span" color="success.main">2,000 pts</Box></Typography>
                <Typography fontSize="0.82rem" color="text.secondary">Pool C — 11 players, base price <Box component="span" color="success.main">1,000 pts</Box></Typography>
              </Box>
            </Paper>
            {hasExistingData && <Alert severity="warning">⚠ Existing teams and players will be replaced.</Alert>}
            <TextField type="password" label="Admin password" placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && password && handleLoad()} autoFocus error={!!error} helperText={error} size="small" fullWidth />
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
  const [storagePref, setStoragePref] = useState('auto');
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
  const [storagePref, setStoragePref] = useState('auto');
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
  const [storagePref, setStoragePref] = useState('auto');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError(''); setLoading(true);
    try {
      await axios.post('/api/admin/reset-auction', { storagePreference: storagePref });
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
        {error && <Alert severity="error">{error}</Alert>}

        <StoragePreferenceSelector value={storagePref} onChange={setStoragePref} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleReset} variant="contained" color="warning" disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>
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
