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

const TABS = ['League Setup', 'Auction Controls', 'Teams & Rosters'];

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
          <PhaseChip phase={phase} />
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
          <button onClick={downloadState} style={smallBtn('#334155')}>⬇ State JSON</button>

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleLoad() {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/admin/load-test-data');
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

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} style={{ ...modalBtn('#334155'), flex: 1 }}>Cancel</button>
            <button
              onClick={handleLoad}
              disabled={loading}
              style={{ ...modalBtn('#0369a1'), flex: 2, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Loading…' : hasExistingData ? '⚠ Replace & Load' : '🧪 Load Test Data'}
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
