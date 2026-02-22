import React, { useState } from 'react';
import { formatPts } from '../../utils/budgetCalc.js';

export default function TeamRosterTable({ teams, leagueConfig }) {
  const [expanded, setExpanded] = useState(null);

  if (!teams || Object.keys(teams).length === 0) {
    return <div style={{ color: '#475569', fontSize: '0.85rem' }}>No teams configured yet.</div>;
  }

  const { squadSize, startingBudget } = leagueConfig;
  const teamList = Object.values(teams).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {teamList.map(team => {
        const pctBudget = team.budget / startingBudget;
        const isExpanded = expanded === team.id;

        return (
          <div key={team.id} style={{
            background: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #1e293b',
            overflow: 'hidden',
          }}>
            {/* Header row */}
            <div
              onClick={() => setExpanded(isExpanded ? null : team.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: '1rem',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{team.name}</div>

              {/* Budget bar */}
              <div style={{ width: '80px' }}>
                <div style={{ height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.max(0, Math.min(100, pctBudget * 100))}%`,
                    background: pctBudget > 0.3 ? '#22c55e' : pctBudget > 0.1 ? '#f59e0b' : '#ef4444',
                    borderRadius: '3px',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>

              <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                {formatPts(team.budget)}
              </div>

              <div style={{ color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                {team.roster.length}/{squadSize} {isExpanded ? '▲' : '▼'}
              </div>
            </div>

            {/* Expanded roster */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid #1e293b', padding: '0.5rem 1rem 0.75rem' }}>
                {team.roster.length === 0 ? (
                  <div style={{ color: '#475569', fontSize: '0.8rem', padding: '0.25rem 0' }}>No players yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {team.roster.map((p, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: '0.8rem', color: '#94a3b8',
                        padding: '0.2rem 0',
                      }}>
                        <span>{p.playerName}</span>
                        <span style={{ color: '#64748b' }}>{p.pool} — {formatPts(p.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
