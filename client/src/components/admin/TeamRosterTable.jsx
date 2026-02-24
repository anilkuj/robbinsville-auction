import React, { useState } from 'react';
import { formatPts } from '../../utils/budgetCalc.js';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Collapse from '@mui/material/Collapse';

export default function TeamRosterTable({ teams, leagueConfig }) {
  const [expanded, setExpanded] = useState(null);

  if (!teams || Object.keys(teams).length === 0) {
    return <Typography color="text.disabled" fontSize="0.85rem">No teams configured yet.</Typography>;
  }

  const { squadSize, startingBudget } = leagueConfig;
  const teamList = Object.values(teams).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {teamList.map(team => {
        const pctBudget = startingBudget > 0 ? team.budget / startingBudget : 0;
        const isExpanded = expanded === team.id;
        const progressColor = pctBudget < 0.1 ? 'error' : pctBudget < 0.3 ? 'warning' : 'success';

        return (
          <Paper
            key={team.id}
            variant="outlined"
            sx={{ overflow: 'hidden', cursor: 'pointer' }}
          >
            <Box
              onClick={() => setExpanded(isExpanded ? null : team.id)}
              sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 2, px: 2, py: 1.25, alignItems: 'center', '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Typography fontWeight={600}>{team.name}</Typography>

              <Box sx={{ width: 80 }}>
                <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, pctBudget * 100))} color={progressColor} sx={{ height: 6, borderRadius: 1 }} />
              </Box>

              <Typography color="success.main" fontWeight={700} fontSize="0.85rem" whiteSpace="nowrap">
                {formatPts(team.budget)}
              </Typography>

              <Typography color="text.disabled" fontSize="0.85rem" whiteSpace="nowrap">
                {team.roster.length}/{squadSize} {isExpanded ? '▲' : '▼'}
              </Typography>
            </Box>

            <Collapse in={isExpanded}>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: 2, py: 1 }}>
                {team.roster.length === 0 ? (
                  <Typography color="text.disabled" fontSize="0.8rem">No players yet</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    {team.roster.map((p, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', py: 0.25 }}>
                        <Typography fontSize="0.8rem" color="text.secondary">{p.playerName}</Typography>
                        <Typography fontSize="0.8rem" color="text.disabled">{p.pool} — {formatPts(p.price)}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Collapse>
          </Paper>
        );
      })}
    </Box>
  );
}
