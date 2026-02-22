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

const TABS = ['League Setup', 'Auction Controls', 'Teams & Rosters', 'Player Data', 'Settings'];

export default function AdminPage() {
  const { auctionState, connected, adminAction } = useAuction();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('Auction Controls');

  if (!auctionState) {
    return <Loading />;
  }

  const { phase } = auctionState;
  const player = auctionState.players?.[auctionState.currentPlayerIndex] ?? null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        background: '#1e293b', borderBottom: '1px solid #334155',
        padding: '0.75rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.3rem' }}>🏏</span>
          <span style={{ fontWeight: 800, color: '#f59e0b' }}>RPL Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: connected ? '#22c55e' : '#ef4444',
          }} title={connected ? 'Connected' : 'Disconnected'} />
          <button
            onClick={logout}
            style={{
              background: 'none', border: '1px solid #334155', color: '#94a3b8',
              borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Live auction preview — visible when phase is LIVE/PAUSED */}
        {(phase === 'LIVE' || phase === 'PAUSED') && player && (
          <div style={{
            width: '280px', flexShrink: 0,
            background: '#0f172a',
            borderRight: '1px solid #1e293b',
            padding: '1rem',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
            overflowY: 'auto',
          }}>
            <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              On Block
            </div>
            <PlayerCard player={player} />
            <CountdownTimer
              timerEndsAt={auctionState.timerEndsAt}
              timerPaused={auctionState.timerPaused}
              timerRemainingOnPause={auctionState.timerRemainingOnPause}
              timerSeconds={auctionState.settings?.timerSeconds ?? 30}
              endMode={auctionState.settings?.endMode ?? 'timer'}
            />
            <BidDisplay currentBid={auctionState.currentBid} teams={auctionState.teams} player={player} />
            <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
              Bids
            </div>
            <BidHistory history={auctionState.currentBid?.history} />
          </div>
        )}

        {/* Main panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #334155',
            background: '#1e293b',
            padding: '0 1rem',
          }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: 'none',
                border: 'none',
                borderBottom: t === tab ? '2px solid #f59e0b' : '2px solid transparent',
                color: t === tab ? '#f59e0b' : '#64748b',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                fontWeight: t === tab ? 600 : 400,
                fontSize: '0.9rem',
                transition: 'color 0.15s',
              }}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {tab === 'League Setup' && (
              <LeagueSetupTab auctionState={auctionState} />
            )}
            {tab === 'Auction Controls' && (
              <AuctionControlsTab auctionState={auctionState} adminAction={adminAction} />
            )}
            {tab === 'Teams & Rosters' && (
              <TeamsTab auctionState={auctionState} />
            )}
            {tab === 'Player Data' && (
              <PlayerDataTab auctionState={auctionState} adminAction={adminAction} />
            )}
            {tab === 'Settings' && (
              <SettingsTab auctionState={auctionState} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── League Setup Tab ────────────────────────────────────────────────────────

function LeagueSetupTab({ auctionState }) {
  const { phase, leagueConfig } = auctionState;
  const isSetup = phase === 'SETUP';

  const [cfg, setCfg] = useState(() => JSON.parse(JSON.stringify(leagueConfig)));
  const [teams, setTeams] = useState(() => {
    const t = JSON.parse(JSON.stringify(auctionState.teams));
    if (Object.keys(t).length === 0) {
      // Pre-populate 10 empty team slots
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

  // Sync from server when auctionState changes (e.g. on save success)
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
  const canSave = isSetup && poolsValid && teamsValid;

  function updatePool(idx, field, val) {
    setCfg(prev => {
      const pools = [...prev.pools];
      pools[idx] = { ...pools[idx], [field]: val };
      return { ...prev, pools };
    });
  }

  function addPool() {
    const id = `P${cfg.pools.length + 1}`;
    setCfg(prev => ({
      ...prev,
      pools: [...prev.pools, { id, label: id, basePrice: 1000, count: 0 }],
    }));
  }

  function removePool(idx) {
    setCfg(prev => ({ ...prev, pools: prev.pools.filter((_, i) => i !== idx) }));
  }

  function addTeam() {
    const id = `team_${Date.now()}`;
    setTeams(prev => ({ ...prev, [id]: { id, name: '', password: 'team123' } }));
  }

  function removeTeam(id) {
    setTeams(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  function updateTeam(id, field, val) {
    setTeams(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
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

  const inputSm = {
    background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
    borderRadius: '6px', padding: '0.4rem 0.5rem', fontSize: '0.85rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>
      {!isSetup && (
        <div style={{
          background: '#78350f40', border: '1px solid #f59e0b40',
          borderRadius: '8px', padding: '0.75rem 1rem', color: '#f59e0b', fontSize: '0.85rem',
        }}>
          ⚠ League Setup is locked while auction is in progress. Reset the auction to make changes.
        </div>
      )}

      {/* Global Settings */}
      <section>
        <SectionTitle>Global Settings</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Number of Teams', key: 'numTeams', min: 2 },
            { label: 'Squad Size', key: 'squadSize', min: 1 },
            { label: 'Starting Budget', key: 'startingBudget', min: 1000 },
            { label: 'Min Bid', key: 'minBid', min: 100 },
          ].map(({ label, key, min }) => (
            <div key={key}>
              <div style={{ color: '#64748b', fontSize: '0.7rem', marginBottom: '4px' }}>{label}</div>
              <input
                type="number" min={min}
                style={{ ...inputSm, width: '100%' }}
                value={cfg[key]}
                disabled={!isSetup}
                onChange={e => setCfg(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Pool Configuration */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <SectionTitle style={{ margin: 0 }}>Player Pools</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: poolsValid ? '#22c55e' : '#ef4444' }}>
              {poolTotal} / {required} players
            </span>
            {isSetup && (
              <button onClick={addPool} style={smallBtn('#334155')}>+ Add Pool</button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 1fr 110px 40px', gap: '0.5rem', padding: '0 0.5rem' }}>
            {['ID', 'Label', 'Base Price', 'Count', ''].map(h => (
              <div key={h} style={{ color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>

          {cfg.pools.map((pool, idx) => (
            <div key={idx} style={{
              display: 'grid', gridTemplateColumns: '80px 80px 1fr 110px 40px',
              gap: '0.5rem', background: '#0f172a', padding: '0.5rem',
              borderRadius: '6px', alignItems: 'center',
            }}>
              <input
                style={inputSm} value={pool.id} disabled={!isSetup}
                onChange={e => updatePool(idx, 'id', e.target.value.toUpperCase())}
              />
              <input
                style={inputSm} value={pool.label} disabled={!isSetup}
                onChange={e => updatePool(idx, 'label', e.target.value)}
              />
              <input
                style={inputSm} type="number" min="100" value={pool.basePrice} disabled={!isSetup}
                onChange={e => updatePool(idx, 'basePrice', e.target.value)}
              />
              <input
                style={inputSm} type="number" min="0" value={pool.count} disabled={!isSetup}
                onChange={e => updatePool(idx, 'count', e.target.value)}
              />
              {isSetup ? (
                <button onClick={() => removePool(idx)} style={{ ...smallBtn('#7f1d1d'), padding: '0.3rem 0.5rem' }}>✕</button>
              ) : <div />}
            </div>
          ))}
        </div>
      </section>

      {/* Teams */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <SectionTitle style={{ margin: 0 }}>Teams</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: teamsValid ? '#22c55e' : '#ef4444' }}>
              {teamCount} / {cfg.numTeams} teams
            </span>
            {isSetup && (
              <button onClick={addTeam} style={smallBtn('#334155')}>+ Add Team</button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '0.5rem', padding: '0 0.5rem' }}>
            {['Team Name', 'Password', ''].map(h => (
              <div key={h} style={{ color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>

          {Object.entries(teams).map(([id, team]) => (
            <div key={id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 40px',
              gap: '0.5rem', background: '#0f172a', padding: '0.5rem',
              borderRadius: '6px', alignItems: 'center',
            }}>
              <input
                style={inputSm} placeholder="Team name" value={team.name || ''} disabled={!isSetup}
                onChange={e => updateTeam(id, 'name', e.target.value)}
              />
              <input
                style={inputSm} placeholder="Password" value={team.password || ''} disabled={!isSetup}
                onChange={e => updateTeam(id, 'password', e.target.value)}
              />
              {isSetup ? (
                <button onClick={() => removeTeam(id)} style={{ ...smallBtn('#7f1d1d'), padding: '0.3rem 0.5rem' }}>✕</button>
              ) : <div />}
            </div>
          ))}
        </div>
      </section>

      {/* Save button */}
      {isSetup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Validation errors — shown whenever any issue exists */}
          {(!poolsValid || !teamsValid) && (
            <div style={{
              background: '#450a0a',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}>
              <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Cannot save — fix the following:
              </div>
              {!poolsValid && (
                <div style={{ color: '#fca5a5', fontSize: '0.85rem' }}>
                  • Pool total is <strong>{poolTotal}</strong> but must equal {cfg.numTeams} teams × {cfg.squadSize} squad size = <strong>{required}</strong>
                </div>
              )}
              {!teamsValid && (
                <div style={{ color: '#fca5a5', fontSize: '0.85rem' }}>
                  • Team count is <strong>{teamCount}</strong> but "Number of Teams" is set to <strong>{cfg.numTeams}</strong>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={save}
              disabled={!canSave || saving}
              title={!canSave ? 'Fix the errors above before saving' : ''}
              style={{
                padding: '0.7rem 2rem',
                background: canSave ? '#22c55e' : '#334155',
                color: canSave ? '#fff' : '#64748b',
                border: canSave ? 'none' : '1px dashed #475569',
                borderRadius: '8px',
                cursor: canSave ? 'pointer' : 'not-allowed',
                fontWeight: 700, fontSize: '0.95rem',
              }}
            >
              {saving ? 'Saving…' : 'Save League Config'}
            </button>
            {canSave && (
              <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>✓ Ready to save</span>
            )}
          </div>
        </div>
      )}

      {msg && (
        <div style={{
          padding: '0.6rem 1rem', borderRadius: '7px', fontSize: '0.85rem',
          background: msg.type === 'ok' ? '#14532d40' : '#7f1d1d40',
          color: msg.type === 'ok' ? '#22c55e' : '#ef4444',
        }}>
          {msg.msg}
        </div>
      )}
    </div>
  );
}

// ─── Auction Controls Tab ─────────────────────────────────────────────────────

function AuctionControlsTab({ auctionState, adminAction }) {
  const { phase, players, unsoldPlayers, teams } = auctionState;

  const pending = players.filter(p => p.status === 'PENDING').length;
  const sold = players.filter(p => p.status === 'SOLD').length;
  const unsold = players.filter(p => p.status === 'UNSOLD').length;

  const [showLoadTestModal, setShowLoadTestModal] = useState(false);
  const [showFullResetModal, setShowFullResetModal] = useState(false);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>

      {/* Modals */}
      {showLoadTestModal && (
        <LoadTestDataModal
          hasExistingData={hasExistingData}
          isSetup={isSetup}
          onClose={() => setShowLoadTestModal(false)}
        />
      )}
      {showFullResetModal && (
        <FullResetModal
          onClose={() => setShowFullResetModal(false)}
        />
      )}
      {importData && (
        <ImportStateModal
          importedState={importData}
          onClose={() => setImportData(null)}
        />
      )}
      {showRollbackModal && (
        <RollbackModal
          auctionState={auctionState}
          onClose={() => setShowRollbackModal(false)}
        />
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Pending', val: pending, color: '#f59e0b' },
          { label: 'Sold', val: sold, color: '#22c55e' },
          { label: 'Unsold', val: unsold, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0f172a', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ color: s.color, fontWeight: 800, fontSize: '1.8rem' }}>{s.val}</div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Auction Controls component */}
      <section>
        <SectionTitle>Auction Controls</SectionTitle>
        <AuctionControls />
      </section>

      {/* Player Import */}
      {isSetup && (
        <section>
          <SectionTitle>Import Players</SectionTitle>
          <PlayerImport />
        </section>
      )}

      {/* Unsold players */}
      <section>
        <SectionTitle>Unsold Players ({unsold})</SectionTitle>
        <UnsoldList />
      </section>

      {/* Export & Reset */}
      <section>
        <SectionTitle>Exports & Reset</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={downloadResults} style={smallBtn('#1d4ed8')}>⬇ Results CSV</button>
          <button onClick={downloadState} style={smallBtn('#334155')}>⬇ Backup State</button>

          {/* Import state */}
          <label style={{ ...smallBtn('#0f766e'), display: 'inline-block', cursor: 'pointer' }}>
            ⬆ Restore Backup
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = ''; // reset so same file can be re-selected
                const reader = new FileReader();
                reader.onload = evt => {
                  try {
                    const parsed = JSON.parse(evt.target.result);
                    setImportData(parsed);
                  } catch {
                    alert('Invalid JSON file — could not parse the backup.');
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>

          {/* Load Test Data */}
          <button
            onClick={() => setShowLoadTestModal(true)}
            disabled={!isSetup}
            title={!isSetup ? 'Reset the auction first to load test data' : ''}
            style={{
              ...smallBtn('#0369a1'),
              opacity: isSetup ? 1 : 0.4,
              cursor: isSetup ? 'pointer' : 'not-allowed',
            }}
          >
            🧪 Load Test Data
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
            {/* Rollback last sale — only shown when there's a last sold player and we're in SETUP */}
            {isSetup && auctionState.lastSoldPlayerId && (() => {
              const lsp = auctionState.players.find(p => p.id === auctionState.lastSoldPlayerId);
              return lsp ? (
                <button
                  onClick={() => setShowRollbackModal(true)}
                  style={{ ...smallBtn('#7c3aed'), border: '1px solid #7c3aed' }}
                  title={`Rollback: ${lsp.name}`}
                >
                  ↩ Rollback: {lsp.name}
                </button>
              ) : null;
            })()}
            <button onClick={resetAuction} style={smallBtn('#7f1d1d')}>
              ⚠ Reset Auction
            </button>
            <button
              onClick={() => setShowFullResetModal(true)}
              style={{ ...smallBtn('#450a0a'), border: '1px dashed #ef4444' }}
            >
              ☠ Full Reset
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Load Test Data Modal ─────────────────────────────────────────────────────

function LoadTestDataModal({ hasExistingData, isSetup, onClose }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleLoad() {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/admin/load-test-data', { password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load test data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>🧪</div>
      <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
        Load Test Data
      </div>

      {done ? (
        <>
          <div style={{ color: '#22c55e', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            ✓ Test data loaded successfully!
          </div>
          <div style={{ background: '#0f172a', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
            <div style={{ marginBottom: '0.4rem', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Team passwords</div>
            {[['Team Alpha', 'alpha123'], ['Team Beta', 'beta123'], ['Team Gamma', 'gamma123']].map(([name, pw]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                <span>{name}</span>
                <code style={{ color: '#f59e0b' }}>{pw}</code>
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{ ...modalBtn('#22c55e'), width: '100%' }}>Close</button>
        </>
      ) : (
        <>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
            This will populate the auction with sample data for testing:
          </div>

          <div style={{ background: '#0f172a', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>3 Teams</span> — Team Alpha, Beta, Gamma (budget: 30,000 pts each)
            </div>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>33 Players</span> across 3 pools:
            </div>
            <div style={{ paddingLeft: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ color: '#94a3b8' }}>Pool A — 11 players, base price <span style={{ color: '#22c55e' }}>3,000 pts</span></div>
              <div style={{ color: '#94a3b8' }}>Pool B — 11 players, base price <span style={{ color: '#22c55e' }}>2,000 pts</span></div>
              <div style={{ color: '#94a3b8' }}>Pool C — 11 players, base price <span style={{ color: '#22c55e' }}>1,000 pts</span></div>
            </div>
          </div>

          {hasExistingData && (
            <div style={{
              background: '#451a03', border: '1px solid #f59e0b40',
              borderRadius: '8px', padding: '0.65rem 0.85rem',
              color: '#fbbf24', fontSize: '0.82rem', marginBottom: '1rem',
            }}>
              ⚠ Existing teams and players will be replaced.
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '6px' }}>Enter admin password to confirm:</div>
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && password && handleLoad()}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#0f172a', border: `1px solid ${error ? '#ef4444' : '#334155'}`,
                color: '#f1f5f9', borderRadius: '7px',
                padding: '0.55rem 0.75rem', fontSize: '0.9rem', outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{ ...modalBtn('#334155'), flex: 1 }}>Cancel</button>
            <button
              onClick={handleLoad}
              disabled={!password || loading}
              style={{ ...modalBtn('#0369a1'), flex: 2, opacity: (!password || loading) ? 0.5 : 1 }}
            >
              {loading ? 'Loading…' : hasExistingData ? '⚠ Replace & Load' : '🧪 Load Test Data'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Rollback Modal ───────────────────────────────────────────────────────────

function RollbackModal({ auctionState, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // success message

  const player = auctionState.players.find(p => p.id === auctionState.lastSoldPlayerId);
  const team = player?.soldTo ? auctionState.teams[player.soldTo] : null;

  async function handleRollback() {
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/admin/rollback-last-sale');
      setDone(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Rollback failed');
    } finally {
      setLoading(false);
    }
  }

  if (!player) {
    return (
      <Modal onClose={onClose}>
        <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>No recent sale found to rollback.</div>
        <button onClick={onClose} style={{ ...modalBtn('#334155'), marginTop: '1rem', width: '100%' }}>Close</button>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>↩</div>
      <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
        Rollback Last Sale
      </div>

      {done ? (
        <>
          <div style={{ color: '#22c55e', fontSize: '0.9rem', marginBottom: '1rem' }}>✓ {done}</div>
          <button onClick={onClose} style={{ ...modalBtn('#22c55e'), width: '100%' }}>Close</button>
        </>
      ) : (
        <>
          <div style={{
            background: '#0f172a', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1rem',
            display: 'flex', flexDirection: 'column', gap: '0.4rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Player</span>
              <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{player.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Pool</span>
              <span style={{ color: '#94a3b8' }}>{player.pool}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Sold to</span>
              <span style={{ color: '#f1f5f9' }}>{team?.name || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Sold for</span>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>{player.soldFor?.toLocaleString()} pts</span>
            </div>
          </div>

          <div style={{
            background: '#2e1065', border: '1px solid #7c3aed',
            borderRadius: '8px', padding: '0.65rem 0.85rem',
            color: '#c4b5fd', fontSize: '0.82rem', marginBottom: '1rem',
          }}>
            This will return <strong>{player.name}</strong> to the player pool and
            refund <strong>{player.soldFor?.toLocaleString()} pts</strong> to <strong>{team?.name}</strong>.
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{ ...modalBtn('#334155'), flex: 1 }}>Cancel</button>
            <button
              onClick={handleRollback}
              disabled={loading}
              style={{ ...modalBtn('#7c3aed'), flex: 2, opacity: loading ? 0.5 : 1 }}
            >
              {loading ? 'Rolling back…' : '↩ Confirm Rollback'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Import State Modal ───────────────────────────────────────────────────────

function ImportStateModal({ importedState: s, onClose }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const players = s.players || [];
  const teams = Object.values(s.teams || {});
  const sold = players.filter(p => p.status === 'SOLD').length;
  const pending = players.filter(p => p.status === 'PENDING').length;
  const unsold = players.filter(p => p.status === 'UNSOLD').length;
  const currentPlayer = s.currentPlayerIndex != null ? players[s.currentPlayerIndex] : null;

  const phaseLabel = { SETUP: 'Setup', LIVE: '● Live', PAUSED: '⏸ Paused', ENDED: 'Ended' }[s.phase] || s.phase;
  const phaseColor = { SETUP: '#64748b', LIVE: '#22c55e', PAUSED: '#f59e0b', ENDED: '#94a3b8' }[s.phase] || '#94a3b8';

  async function handleImport() {
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/admin/import-state', { password, state: s });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', fontSize: '0.82rem' };
  const labelStyle = { color: '#64748b' };
  const valueStyle = { color: '#f1f5f9', fontWeight: 600 };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>📦</div>
      <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
        Restore Backup
      </div>

      {done ? (
        <>
          <div style={{ color: '#22c55e', fontSize: '0.9rem', marginBottom: '1rem' }}>
            ✓ Backup restored successfully!
          </div>
          {s.phase === 'LIVE' && (
            <div style={{
              background: '#451a03', border: '1px solid #f59e0b40',
              borderRadius: '8px', padding: '0.65rem 0.85rem',
              color: '#fbbf24', fontSize: '0.82rem', marginBottom: '1rem',
            }}>
              ⏸ The auction was mid-round — the timer has been paused. Press Resume when ready.
            </div>
          )}
          <button onClick={onClose} style={{ ...modalBtn('#22c55e'), width: '100%' }}>Close</button>
        </>
      ) : (
        <>
          {/* Snapshot summary */}
          <div style={{
            background: '#0f172a', borderRadius: '8px', padding: '0.85rem 1rem',
            marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.1rem',
          }}>
            <div style={{ color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Backup snapshot
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Phase</span>
              <span style={{ ...valueStyle, color: phaseColor }}>{phaseLabel}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Players</span>
              <span style={valueStyle}>
                {sold} sold · {pending} pending · {unsold} unsold
              </span>
            </div>
            {currentPlayer && (
              <div style={rowStyle}>
                <span style={labelStyle}>On block</span>
                <span style={valueStyle}>{currentPlayer.name}</span>
              </div>
            )}
            <div style={rowStyle}>
              <span style={labelStyle}>Teams</span>
              <span style={valueStyle}>{teams.length}</span>
            </div>
            {teams.map(t => (
              <div key={t.id} style={{ ...rowStyle, paddingLeft: '0.75rem' }}>
                <span style={labelStyle}>{t.name}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                  {(t.budget || 0).toLocaleString()} pts · {(t.roster || []).length} players
                </span>
              </div>
            ))}
          </div>

          <div style={{
            background: '#450a0a', border: '1px solid #ef4444',
            borderRadius: '8px', padding: '0.65rem 0.85rem',
            color: '#fca5a5', fontSize: '0.82rem', marginBottom: '1rem',
          }}>
            ⚠ This will overwrite all current auction data with the backup.
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '6px' }}>Admin password to confirm:</div>
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && password && handleImport()}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#0f172a', border: `1px solid ${error ? '#ef4444' : '#334155'}`,
                color: '#f1f5f9', borderRadius: '7px',
                padding: '0.55rem 0.75rem', fontSize: '0.9rem', outline: 'none',
              }}
            />
            {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{error}</div>}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{ ...modalBtn('#334155'), flex: 1 }}>Cancel</button>
            <button
              onClick={handleImport}
              disabled={!password || loading}
              style={{ ...modalBtn('#0f766e'), flex: 2, opacity: (!password || loading) ? 0.5 : 1 }}
            >
              {loading ? 'Restoring…' : '📦 Restore Backup'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Full Reset Modal ─────────────────────────────────────────────────────────

function FullResetModal({ onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/admin/full-reset', { password });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>☠</div>
      <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
        Full Reset — Permanent
      </div>

      <div style={{
        background: '#450a0a', border: '1px solid #ef4444',
        borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
      }}>
        <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.5rem' }}>
          This will permanently delete:
        </div>
        {['All teams and rosters', 'All player data', 'All bids and auction results', 'League configuration (resets to defaults)'].map(item => (
          <div key={item} style={{ color: '#fca5a5', fontSize: '0.82rem', padding: '0.15rem 0' }}>✕ {item}</div>
        ))}
        <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.5rem', fontWeight: 600 }}>
          This action cannot be undone.
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '6px' }}>Enter admin password to confirm:</div>
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && password && handleReset()}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0f172a', border: `1px solid ${error ? '#ef4444' : '#334155'}`,
            color: '#f1f5f9', borderRadius: '7px',
            padding: '0.55rem 0.75rem', fontSize: '0.9rem', outline: 'none',
          }}
        />
        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{error}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onClose} style={{ ...modalBtn('#334155'), flex: 1 }}>Cancel</button>
        <button
          onClick={handleReset}
          disabled={!password || loading}
          style={{ ...modalBtn('#7f1d1d'), flex: 2, opacity: (!password || loading) ? 0.5 : 1 }}
        >
          {loading ? 'Deleting…' : '☠ Permanently Delete All Data'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1e293b', border: '1px solid #334155',
        borderRadius: '14px', padding: '1.75rem',
        width: '100%', maxWidth: '420px',
        display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  );
}

function modalBtn(bg) {
  return {
    background: bg, border: 'none', color: '#f1f5f9',
    borderRadius: '7px', padding: '0.6rem 1rem',
    fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600,
  };
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────

function TeamsTab({ auctionState }) {
  if (!auctionState) return null;
  const { teams, leagueConfig } = auctionState;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px' }}>
      <SectionTitle>All Teams</SectionTitle>
      <TeamRosterTable teams={teams} leagueConfig={leagueConfig} />
    </div>
  );
}

// ─── Player Data Tab ──────────────────────────────────────────────────────────

function playerIsOwner(player) {
  if (!player.extra) return false;
  const typeKey = Object.keys(player.extra).find(k => k.toLowerCase() === 'type');
  return typeKey ? String(player.extra[typeKey]).toLowerCase() === 'owner' : false;
}

function PlayerDataTab({ auctionState, adminAction }) {
  const { players = [], teams = {} } = auctionState;
  const [filter, setFilter] = useState('ALL');
  const [editPlayer, setEditPlayer] = useState(null);

  if (players.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#475569' }}>
        No players imported yet. Use the League Setup tab to import a CSV.
      </div>
    );
  }

  // Collect all extra keys across all players (preserve insertion order)
  const extraKeys = [];
  for (const p of players) {
    if (p.extra) {
      for (const k of Object.keys(p.extra)) {
        if (!extraKeys.includes(k)) extraKeys.push(k);
      }
    }
  }

  const filtered = filter === 'ALL' ? players : players.filter(p => p.status === filter);

  const statusCfg = {
    PENDING: { color: '#f59e0b', bg: '#451a03', label: 'Pending' },
    SOLD:    { color: '#22c55e', bg: '#14532d', label: 'Sold' },
    UNSOLD:  { color: '#ef4444', bg: '#3b0a0a', label: 'Unsold' },
  };

  const poolColor = (poolId) => {
    if (poolId?.startsWith('A')) return { color: '#f59e0b', bg: '#1c0d00', border: '#f59e0b40' };
    if (poolId?.startsWith('B')) return { color: '#60a5fa', bg: '#0d1c35', border: '#3b82f640' };
    if (poolId?.startsWith('C')) return { color: '#a78bfa', bg: '#150d2e', border: '#8b5cf640' };
    return { color: '#94a3b8', bg: '#0f1a2e', border: '#64748b40' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {editPlayer && (
        <EditPriceModal
          player={editPlayer}
          teams={teams}
          adminAction={adminAction}
          onClose={() => setEditPlayer(null)}
        />
      )}

      {/* Header row: title + filter chips */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>Player Data</div>
          <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
            {filtered.length} of {players.length} players
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['ALL', 'PENDING', 'SOLD', 'UNSOLD'].map(f => {
            const count = f === 'ALL' ? players.length : players.filter(p => p.status === f).length;
            const active = filter === f;
            const cfg = f === 'ALL' ? { color: '#94a3b8', bg: '#1e293b' } : statusCfg[f];
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: active ? cfg.bg : 'transparent',
                border: `1px solid ${active ? cfg.color : '#334155'}`,
                color: active ? cfg.color : '#64748b',
                borderRadius: '6px', padding: '0.3rem 0.7rem',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: active ? 700 : 400,
                transition: 'all 0.15s',
              }}>
                {f === 'ALL' ? 'All' : statusCfg[f].label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #1e293b' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '600px', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: '#0f172a', position: 'sticky', top: 0, zIndex: 1 }}>
              <TH first>#</TH>
              <TH>Pool</TH>
              <TH>Player Name</TH>
              {extraKeys.map(k => <TH key={k}>{k}</TH>)}
              <TH right>Base</TH>
              <TH center>Status</TH>
              <TH>Sold To</TH>
              <TH right>Sold Price</TH>
              <TH center></TH>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const owner = playerIsOwner(p);
              const sc = statusCfg[p.status] || statusCfg.PENDING;
              const pc = poolColor(p.pool);
              const soldTeam = p.soldTo ? teams[p.soldTo] : null;
              const rowBg = i % 2 === 0 ? '#0f172a' : '#0a111e';

              return (
                <tr key={p.id} style={{ background: rowBg, transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#162032'}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                >
                  <TD first style={{ color: '#475569' }}>{p.sortOrder + 1}</TD>
                  <TD>
                    <span style={{
                      background: pc.bg, color: pc.color,
                      border: `1px solid ${pc.border}`,
                      borderRadius: '4px', padding: '0.15rem 0.45rem',
                      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                    }}>{p.pool}</span>
                  </TD>
                  <TD style={{ color: '#f1f5f9', fontWeight: 500 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {p.name}
                      {owner && (
                        <span style={{
                          background: '#1e1035', color: '#a78bfa',
                          border: '1px solid #7c3aed60',
                          borderRadius: '3px', padding: '0.05rem 0.35rem',
                          fontSize: '0.62rem', fontWeight: 700,
                        }}>OWNER</span>
                      )}
                    </span>
                  </TD>
                  {extraKeys.map(k => (
                    <TD key={k} style={{ color: '#94a3b8' }}>{p.extra?.[k] ?? '—'}</TD>
                  ))}
                  <TD right style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatPts(p.basePrice)}</TD>
                  <TD center>
                    <span style={{
                      background: sc.bg, color: sc.color,
                      borderRadius: '999px', padding: '0.15rem 0.55rem',
                      fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap',
                    }}>{sc.label}</span>
                  </TD>
                  <TD style={{ color: '#cbd5e1' }}>{soldTeam?.name ?? '—'}</TD>
                  <TD right style={{ whiteSpace: 'nowrap' }}>
                    {owner && p.soldFor ? (
                      <span style={{ color: '#a78bfa', fontWeight: 600 }}>
                        {formatPts(p.soldFor)} <span style={{ color: '#7c3aed', fontSize: '0.65rem' }}>avg</span>
                      </span>
                    ) : p.soldFor ? (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>{formatPts(p.soldFor)}</span>
                    ) : (
                      <span style={{ color: '#334155' }}>—</span>
                    )}
                  </TD>
                  <TD center>
                    {p.status === 'SOLD' && !owner && (
                      <button
                        onClick={() => setEditPlayer(p)}
                        style={{
                          background: 'none', border: '1px solid #334155', color: '#94a3b8',
                          borderRadius: '4px', padding: '0.2rem 0.5rem',
                          fontSize: '0.7rem', cursor: 'pointer',
                        }}
                        title="Edit sold price"
                      >
                        ✏
                      </button>
                    )}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Edit Price Modal ─────────────────────────────────────────────────────────

function EditPriceModal({ player, teams, adminAction, onClose }) {
  const soldTeam = player.soldTo ? teams[player.soldTo] : null;
  const [amount, setAmount] = useState(String(player.soldFor || ''));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleSave() {
    const parsed = parseInt(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid positive amount');
      return;
    }
    setSaving(true);
    setError('');
    adminAction('admin:editSalePrice', { playerId: player.id, newAmount: parsed });
    // Close optimistically — if there's an error it'll show via admin:error
    setTimeout(onClose, 200);
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>✏</div>
      <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
        Edit Sold Price
      </div>

      <div style={{
        background: '#0f172a', borderRadius: '8px', padding: '0.85rem 1rem',
        marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b' }}>Player</span>
          <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{player.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b' }}>Pool</span>
          <span style={{ color: '#94a3b8' }}>{player.pool}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b' }}>Sold to</span>
          <span style={{ color: '#f1f5f9' }}>{soldTeam?.name || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b' }}>Current price</span>
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>{player.soldFor?.toLocaleString()} pts</span>
        </div>
      </div>

      <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '6px' }}>New sold price (pts):</div>
      <input
        type="number"
        min="1"
        value={amount}
        onChange={e => { setAmount(e.target.value); setError(''); }}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        autoFocus
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#0f172a', border: `1px solid ${error ? '#ef4444' : '#334155'}`,
          color: '#f1f5f9', borderRadius: '7px',
          padding: '0.55rem 0.75rem', fontSize: '0.9rem', outline: 'none',
          marginBottom: '0.5rem',
        }}
      />

      <div style={{ color: '#64748b', fontSize: '0.72rem', marginBottom: '1rem' }}>
        Team budget will be adjusted automatically. Owner averages in Pool {player.pool} will be recalculated.
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onClose} style={{ ...modalBtn('#334155'), flex: 1 }}>Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...modalBtn('#22c55e'), flex: 2, opacity: saving ? 0.5 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Price'}
        </button>
      </div>
    </Modal>
  );
}

function TH({ children, first, right, center }) {
  return (
    <th style={{
      padding: '0.55rem 0.75rem',
      textAlign: right ? 'right' : center ? 'center' : 'left',
      color: '#64748b',
      fontWeight: 700,
      fontSize: '0.68rem',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
      borderLeft: first ? 'none' : '1px solid #1e293b',
      borderBottom: '2px solid #1e293b',
      ...(first && { paddingLeft: '1rem' }),
      ...(right && { paddingRight: '1rem' }),
    }}>
      {children}
    </th>
  );
}

function TD({ children, first, right, center, style = {} }) {
  return (
    <td style={{
      padding: '0.5rem 0.75rem',
      textAlign: right ? 'right' : center ? 'center' : 'left',
      borderLeft: first ? 'none' : '1px solid #1e293b',
      borderBottom: '1px solid #0f172a',
      verticalAlign: 'middle',
      ...(first && { paddingLeft: '1rem' }),
      ...(right && { paddingRight: '1rem' }),
      ...style,
    }}>
      {children}
    </td>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ auctionState }) {
  const { teams, settings } = auctionState;
  const teamList = Object.values(teams);

  // Local state for new passwords — empty means "keep current"
  const [passwords, setPasswords] = useState({});
  const [dashPin, setDashPin] = useState(settings.dashboardPin || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Reset local pin state when server state changes
  useEffect(() => {
    setDashPin(settings.dashboardPin || '');
  }, [settings.dashboardPin]);

  // Reset password fields when teams change (e.g. after load test data)
  useEffect(() => {
    setPasswords({});
  }, [Object.keys(teams).join(',')]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await axios.post('/api/admin/update-passwords', {
        teams: passwords,
        dashboardPin: dashPin,
      });
      setPasswords({}); // clear after save
      setMsg({ type: 'ok', text: 'Settings saved!' });
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.error || 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  const inputSm = {
    background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
    borderRadius: '6px', padding: '0.4rem 0.5rem', fontSize: '0.85rem', width: '100%',
    boxSizing: 'border-box',
  };

  const hasChanges = Object.values(passwords).some(p => p.trim()) || dashPin !== (settings.dashboardPin || '');

  return (
    <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Team Passwords */}
      <section>
        <SectionTitle>Team Passwords</SectionTitle>
        {teamList.length === 0 ? (
          <div style={{ color: '#475569', fontSize: '0.85rem' }}>
            No teams configured yet. Set up teams in League Setup first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0 0.5rem' }}>
              <span style={{ color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase' }}>Team Name</span>
              <span style={{ color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase' }}>New Password</span>
            </div>
            {teamList.map(team => (
              <div key={team.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
                background: '#0f172a', padding: '0.5rem 0.6rem', borderRadius: '6px', alignItems: 'center',
              }}>
                <span style={{ color: '#f1f5f9', fontSize: '0.88rem' }}>{team.name}</span>
                <input
                  style={inputSm}
                  type="text"
                  placeholder="Leave empty to keep current"
                  value={passwords[team.id] || ''}
                  onChange={e => setPasswords(prev => ({ ...prev, [team.id]: e.target.value }))}
                />
              </div>
            ))}
            <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '0.25rem', paddingLeft: '0.25rem' }}>
              Leave a field empty to keep the existing password unchanged.
            </div>
          </div>
        )}
      </section>

      {/* Dashboard PIN */}
      <section>
        <SectionTitle>Dashboard PIN</SectionTitle>
        <div style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
          Spectators must enter this PIN to view the live dashboard at <code style={{ color: '#94a3b8' }}>/dashboard</code>.
          Leave empty for open access.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            style={{ ...inputSm, width: '200px' }}
            type="text"
            value={dashPin}
            onChange={e => setDashPin(e.target.value)}
            placeholder="No PIN — open access"
            maxLength={20}
          />
          {settings.dashboardPin
            ? <span style={{ color: '#f59e0b', fontSize: '0.78rem' }}>● PIN active</span>
            : <span style={{ color: '#475569', fontSize: '0.78rem' }}>○ Open access</span>
          }
        </div>
      </section>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={save}
          disabled={saving || !hasChanges}
          style={{
            padding: '0.65rem 2rem', fontWeight: 700, fontSize: '0.95rem',
            background: hasChanges ? '#22c55e' : '#334155',
            color: hasChanges ? '#fff' : '#64748b',
            border: hasChanges ? 'none' : '1px dashed #475569',
            borderRadius: '8px',
            cursor: hasChanges && !saving ? 'pointer' : 'not-allowed',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {msg && (
          <span style={{ fontSize: '0.85rem', color: msg.type === 'ok' ? '#22c55e' : '#ef4444' }}>
            {msg.type === 'ok' ? '✓' : '✗'} {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionTitle({ children, style }) {
  return (
    <h3 style={{
      color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase',
      letterSpacing: '0.08em', marginBottom: '0.75rem', ...style,
    }}>
      {children}
    </h3>
  );
}

function PhaseChip({ phase }) {
  const cfg = {
    SETUP:  { label: 'Setup',  bg: '#1e293b', color: '#64748b' },
    LIVE:   { label: '● Live', bg: '#14532d', color: '#22c55e' },
    PAUSED: { label: '⏸ Paused', bg: '#451a03', color: '#f59e0b' },
    ENDED:  { label: 'Ended', bg: '#1e293b', color: '#94a3b8' },
  }[phase] || { label: phase, bg: '#1e293b', color: '#94a3b8' };

  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: '999px', padding: '0.15rem 0.6rem',
      fontSize: '0.75rem', fontWeight: 700,
    }}>
      {cfg.label}
    </span>
  );
}

function smallBtn(bg) {
  return {
    background: bg, border: 'none', color: '#f1f5f9',
    borderRadius: '6px', padding: '0.4rem 0.8rem',
    fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600,
  };
}

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#475569' }}>
      Connecting to auction…
    </div>
  );
}
