import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { poolColor as themePoolColor } from '../../theme.js';
import { getAvgPointsKey, sortPlayersByPoints } from '../../utils/playerSort.js';

export default function DashboardView({ state }) {
  const [rightWidth, setRightWidth] = useState(380);
  const exportRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, { backgroundColor: '#0a0f1e' });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Rosters-Export-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    } finally {
      setIsExporting(false);
    }
  };

  const startDragRight = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightWidth;
    const onMove = (ev) => setRightWidth(Math.max(220, Math.min(700, startW + startX - ev.clientX)));
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [rightWidth]);

  const { phase, teams, leagueConfig, players, currentPlayerIndex } = state;
  const startingBudget = leagueConfig?.startingBudget ?? 0;
  const squadSize = leagueConfig?.squadSize ?? 0;
  const currentPlayer = (phase === 'LIVE' || phase === 'PAUSED') ? players?.[currentPlayerIndex] : null;
  const teamList = Object.values(teams).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Current player banner */}
      {currentPlayer && (
        <Paper square sx={{
          bgcolor: phase === 'PAUSED' ? '#1c0a00' : '#0c1a10',
          borderBottom: '1px solid',
          borderColor: phase === 'PAUSED' ? '#92400e' : '#166534',
          px: 3, py: 1,
          display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="overline" color="text.disabled">On Block</Typography>
            <Typography fontWeight={700}>{currentPlayer.name}</Typography>
            <Chip label={currentPlayer.pool} size="small" sx={{ height: 20, fontSize: '0.68rem', bgcolor: `${themePoolColor(currentPlayer.pool)}20`, color: themePoolColor(currentPlayer.pool) }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.disabled">Current Bid</Typography>
            <Typography fontWeight={800} color="success.main" fontSize="1.1rem">
              {state.currentBid?.amount?.toLocaleString()} pts
            </Typography>
            {state.currentBid?.teamId && (
              <Typography variant="caption" color="text.secondary">— {teams[state.currentBid.teamId]?.name}</Typography>
            )}
          </Box>
          {phase === 'PAUSED' && (
            <Chip label="⏸ PAUSED" size="small" color="warning" sx={{ fontWeight: 700 }} />
          )}
        </Paper>
      )}

      {/* Main: teams grid + drag + remaining pane */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, flex: 1, overflow: 'hidden' }}>

        {/* Teams grid */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pr: { xs: 'calc(16px + 48px)', lg: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExport}
              disabled={isExporting}
              sx={{ textTransform: 'none', fontWeight: 600, bgcolor: 'background.paper' }}
            >
              {isExporting ? 'Exporting...' : 'Export Dashboard to Image'}
            </Button>
          </Box>

          <Box ref={exportRef} sx={{ p: { xs: 0, sm: 2 }, bgcolor: '#0a0f1e', borderRadius: 2 }}>
            <BudgetChart teams={teams} startingBudget={startingBudget} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(320px, 1fr))' }, gap: 2 }}>
              {teamList.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  startingBudget={startingBudget}
                  squadSize={squadSize}
                  isLeading={state.currentBid?.teamId === team.id}
                />
              ))}
            </Box>
          </Box>
          {teamList.length === 0 && (
            <Typography color="text.disabled" sx={{ textAlign: 'center', p: 6 }}>
              No teams configured yet. Admin needs to complete League Setup.
            </Typography>
          )}
        </Box>

        {/* Drag handle */}
        <Box
          onMouseDown={startDragRight}
          title="Drag to resize"
          sx={{ display: { xs: 'none', lg: 'block' }, width: '5px', flexShrink: 0, cursor: 'col-resize', bgcolor: '#1e293b', transition: 'background 0.15s', zIndex: 10, '&:hover': { bgcolor: '#334155' } }}
        />

        {/* Remaining players pane */}
        <RemainingPlayersPane
          players={players}
          pools={leagueConfig?.pools ?? []}
          currentPlayerId={currentPlayer?.id ?? null}
          width={rightWidth}
        />
      </Box>
    </Box>
  );
}

// ── Remaining Players Pane ────────────────────────────────────────────────────

export function RemainingPlayersPane({ players, pools, currentPlayerId, width = 380 }) {
  const [isOpen, setIsOpen] = React.useState(() => window.innerWidth >= 1200);
  const pending = players.filter(p => p.status === 'PENDING');
  const poolOrder = pools.map(p => p.id);
  const avgKey = getAvgPointsKey(players);
  const byPool = {};
  for (const p of pending) {
    if (!byPool[p.pool]) byPool[p.pool] = [];
    byPool[p.pool].push(p);
  }
  const orderedPools = poolOrder.filter(id => byPool[id]?.length > 0);

  if (!isOpen) {
    return (
      <Box sx={{ width: 48, height: '100%', flexShrink: 0, borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1, position: 'absolute', top: 0, right: 0, zIndex: 1200 }}>
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
      height: '100%',
      flexShrink: 0,
      borderLeft: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: { xs: 'absolute', lg: 'relative' },
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
                <div style={{ padding: '0.45rem 1rem', background: clr.bg, borderTop: `2px solid ${clr.border}`, borderBottom: `1px solid ${clr.border}50`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1 }}>
                  <span style={{ color: clr.text, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Pool {poolId}</span>
                  <span style={{ color: clr.text, fontSize: '0.68rem', fontWeight: 700, opacity: 0.75 }}>{poolPlayers.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: GRID, background: '#0c1521', borderBottom: `1px solid ${clr.border}30` }}>
                  <DColHead label="Player" first /><DColHead label="Pool" center /><DColHead label="Base" right />
                </div>
                {sortPlayersByPoints(poolPlayers, avgKey).map((player, rowIdx) => {
                  const isOnBlock = player.id === currentPlayerId;
                  const rowBg = isOnBlock ? '#0c1a10' : rowIdx % 2 === 0 ? 'transparent' : '#0d1825';
                  return (
                    <div key={player.id} style={{ display: 'grid', gridTemplateColumns: GRID, background: rowBg, borderBottom: '1px solid #0f172a' }}>
                      <DCell first style={{ color: isOnBlock ? '#22c55e' : '#cbd5e1', fontWeight: isOnBlock ? 700 : 400 }}>
                        {isOnBlock && <span style={{ marginRight: '4px' }}>▶</span>}{player.name}
                      </DCell>
                      <DCell center>
                        <span style={{ background: clr.bg, color: clr.text, border: `1px solid ${clr.border}50`, borderRadius: '4px', padding: '0.1rem 0.35rem', fontSize: '0.65rem', fontWeight: 700 }}>{player.pool}</span>
                      </DCell>
                      <DCell right style={{ color: isOnBlock ? '#22c55e' : '#475569', fontWeight: isOnBlock ? 700 : 400 }}>
                        {fmtPts(player.basePrice)}
                      </DCell>
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

// ── Team Card ─────────────────────────────────────────────────────────────────

function TeamCard({ team, startingBudget, squadSize, isLeading }) {
  const spent = startingBudget - team.budget;
  const spentPct = startingBudget > 0 ? (spent / startingBudget) * 100 : 0;
  const roster = team.roster ?? [];

  const progressColor = spentPct > 80 ? 'error' : spentPct > 60 ? 'warning' : 'success';

  return (
    <Card sx={{
      border: '1px solid',
      borderColor: isLeading ? 'success.main' : 'divider',
      boxShadow: isLeading ? '0 0 0 1px #22c55e40' : 'none',
      transition: 'border-color 0.3s',
    }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography fontWeight={700}>🏏 {team.name}</Typography>
          {isLeading && <Chip label="● LEADING" size="small" color="success" sx={{ height: 20, fontSize: '0.62rem' }} />}
        </Box>
        <Typography variant="caption" color="text.disabled">{roster.length} / {squadSize} players</Typography>
      </Box>

      <Box sx={{ px: 2, py: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stat label="Initial Budget" value={fmtPts(startingBudget)} color="text.secondary" />
        <Stat label="Spent" value={fmtPts(spent)} color="error.main" />
        <Stat label="Remaining" value={fmtPts(team.budget)} color="success.main" />
      </Box>

      <Box sx={{ px: 2, pb: 1.5, pt: 1 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, spentPct)}
          color={progressColor}
          sx={{ height: 4, borderRadius: 2, bgcolor: 'background.default' }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" color="text.disabled">0</Typography>
          <Typography variant="caption" color="text.disabled">{spentPct.toFixed(0)}% spent</Typography>
          <Typography variant="caption" color="text.disabled">{fmtPts(startingBudget)}</Typography>
        </Box>
      </Box>

      {roster.length > 0 ? (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ px: 2, py: 0.5, display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 1 }}>
            {['Player', 'Pool', 'Price'].map((h, i) => (
              <Typography key={h} variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i === 2 ? 'right' : 'left' }}>{h}</Typography>
            ))}
          </Box>
          <Box sx={{ maxHeight: 220, overflowY: 'auto' }}>
            {roster.map((r, i) => {
              const isOwner = team.ownerPlayerId === r.playerId;
              return (
                <Box key={i} sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: i % 2 === 0 ? 'transparent' : 'background.default' }}>
                  <Box sx={{ px: 2, py: 0.5, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 1, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                      <Typography variant="body2" noWrap>{r.playerName}</Typography>
                      {isOwner && <Chip label="★ OWNER" size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: 'secondary.dark', color: 'white', fontWeight: 800, flexShrink: 0 }} />}
                    </Box>
                    <Chip label={r.pool} size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: `${themePoolColor(r.pool)}20`, color: themePoolColor(r.pool) }} />
                    <Typography variant="body2" color="success.main" fontWeight={600} sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {r.price.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      ) : (
        <Typography color="text.disabled" fontSize="0.8rem" sx={{ textAlign: 'center', py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          No players yet
        </Typography>
      )}
    </Card>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function BudgetChart({ teams, startingBudget }) {
  const teamList = Object.values(teams).sort((a, b) => a.name.localeCompare(b.name));
  if (teamList.length === 0 || startingBudget <= 0) return null;

  return (
    <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
      <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, display: 'block', letterSpacing: '0.05em' }}>League Budget Overview</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2 }}>
        {teamList.map(team => {
          const spent = startingBudget - team.budget;
          const spentPct = Math.min(100, (spent / startingBudget) * 100);
          const remPct = 100 - spentPct;

          return (
            <Box key={team.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.75rem' }}>
                <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{team.name}</Typography>
                <Typography sx={{ fontWeight: 700, color: 'success.main', fontSize: '0.8rem' }}>{fmtPts(team.budget)} rem</Typography>
              </Box>
              <Box sx={{ height: 8, display: 'flex', borderRadius: 4, overflow: 'hidden', bgcolor: 'background.default' }}>
                {spentPct > 0 && <Box sx={{ width: `${spentPct}%`, bgcolor: 'error.main', opacity: 0.85 }} />}
                {remPct > 0 && <Box sx={{ width: `${remPct}%`, bgcolor: 'success.main', opacity: 0.85 }} />}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function poolColor(poolId) {
  if (poolId.startsWith('A')) return { bg: '#1c0d00', border: '#f59e0b', text: '#f59e0b' };
  if (poolId.startsWith('B')) return { bg: '#0d1c35', border: '#3b82f6', text: '#60a5fa' };
  if (poolId === 'C') return { bg: '#150d2e', border: '#8b5cf6', text: '#a78bfa' };
  return { bg: '#0f1a2e', border: '#64748b', text: '#94a3b8' };
}

function DColHead({ label, first, right }) {
  return (
    <span style={{ padding: '0.32rem 0.6rem', fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderLeft: first ? 'none' : '1px solid #1e293b', textAlign: right ? 'right' : first ? 'left' : 'center', whiteSpace: 'nowrap', ...(first && { paddingLeft: '1rem' }), ...(right && { paddingRight: '1rem' }) }}>{label}</span>
  );
}

function DCell({ children, first, right, center, style = {} }) {
  return (
    <span style={{ padding: '0.32rem 0.6rem', fontSize: '0.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderLeft: first ? 'none' : '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: right ? 'flex-end' : center ? 'center' : 'flex-start', ...(first && { paddingLeft: '1rem' }), ...(right && { paddingRight: '1rem' }), ...style }}>{children}</span>
  );
}

function Stat({ label, value, color }) {
  return (
    <Box>
      <Typography variant="caption" color="text.disabled" display="block" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>{label}</Typography>
      <Typography fontWeight={700} fontSize="0.88rem" color={color}>{value}</Typography>
    </Box>
  );
}

function fmtPts(n) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return n?.toLocaleString() ?? '0';
}
