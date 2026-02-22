import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { formatPts } from '../../utils/budgetCalc.js';

const S = {
  sidebar: {
    width: '240px',
    background: '#1e293b',
    borderRight: '1px solid #334155',
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    flexShrink: 0,
    overflowY: 'auto',
  },
  logo: {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: '#f59e0b',
    textAlign: 'center',
    paddingBottom: '1rem',
    borderBottom: '1px solid #334155',
  },
  teamCard: {
    background: '#0f172a',
    borderRadius: '8px',
    padding: '0.75rem',
  },
  label: { color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  value: { color: '#f1f5f9', fontWeight: 600, fontSize: '1rem', marginTop: '2px' },
  budgetValue: { color: '#22c55e', fontWeight: 700, fontSize: '1.1rem', marginTop: '2px' },
  rosterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginTop: '4px',
  },
  statusDot: (connected) => ({
    width: '8px', height: '8px', borderRadius: '50%',
    background: connected ? '#22c55e' : '#ef4444',
    display: 'inline-block', marginRight: '6px',
  }),
  connStatus: { fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', marginTop: 'auto' },
  logoutBtn: {
    background: 'none', border: '1px solid #334155', color: '#94a3b8',
    borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', fontSize: '0.85rem',
    width: '100%', marginTop: '0.5rem',
  },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { auctionState, connected } = useAuction();

  const team = auctionState?.teams?.[user?.teamId];
  const squadSize = auctionState?.leagueConfig?.squadSize ?? 18;
  const roster = team?.roster ?? [];

  return (
    <div style={S.sidebar}>
      <div style={S.logo}>🏏 RPL Auction</div>

      {team && (
        <div style={S.teamCard}>
          <div style={S.label}>Your Team</div>
          <div style={S.value}>{team.name}</div>

          <div style={{ ...S.label, marginTop: '0.75rem' }}>Budget Remaining</div>
          <div style={S.budgetValue}>{formatPts(team.budget)}</div>

          <div style={S.rosterRow}>
            <span>Squad</span>
            <span>{roster.length} / {squadSize}</span>
          </div>
        </div>
      )}

      {!team && user?.role === 'team' && (
        <div style={S.teamCard}>
          <div style={S.label}>Team</div>
          <div style={S.value}>{user.name}</div>
        </div>
      )}

      {/* Roster list */}
      {roster.length > 0 && (
        <div style={{ ...S.teamCard, padding: '0.6rem 0.75rem' }}>
          <div style={{ ...S.label, marginBottom: '0.4rem' }}>My Squad</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {roster.map((r, i) => (
              <div key={r.playerId || i} style={{
                borderTop: i > 0 ? '1px solid #1e293b' : 'none',
                paddingTop: i > 0 ? '0.4rem' : 0,
              }}>
                <div style={{ color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.playerName}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                  <span style={{
                    background: '#1e293b', border: '1px solid #334155',
                    borderRadius: '3px', padding: '0.05rem 0.3rem',
                    fontSize: '0.62rem', color: '#94a3b8',
                  }}>{r.pool}</span>
                  <span style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: 700 }}>
                    {r.price.toLocaleString()} pts
                  </span>
                </div>
                {r.extra && Object.entries(r.extra).map(([k, v]) => v && (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{ color: '#475569', fontSize: '0.65rem', textTransform: 'capitalize' }}>{k}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.65rem', textAlign: 'right', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={S.connStatus}>
        <span style={S.statusDot(connected)} />
        {connected ? 'Live' : 'Reconnecting…'}
      </div>

      <button style={S.logoutBtn} onClick={logout}>Sign Out</button>
    </div>
  );
}
