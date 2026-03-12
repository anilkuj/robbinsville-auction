import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

export default function SpectatorPage() {
  // Auth state
  const [pinRequired, setPinRequired] = useState(null);
  const [spectatorToken, setSpectatorToken] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Auction state
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetch('/api/public/dashboard-settings')
      .then(r => r.json())
      .then(data => setPinRequired(data.requiresPin))
      .catch(() => setPinRequired(false));
  }, []);

  useEffect(() => {
    if (pinRequired === null) return;
    if (pinRequired && !spectatorToken) return;

    const socketOpts = { reconnectionDelay: 1000, reconnectionAttempts: Infinity, timeout: 5000 };
    if (spectatorToken) socketOpts.auth = { token: spectatorToken };

    const socket = io('/', socketOpts);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      if (err.message === 'Dashboard requires PIN authentication') {
        setPinRequired(true);
        setSpectatorToken(null);
      } else {
        setError('Connection failed. Retrying...');
      }
    });

    const updateState = (s) => {
      if (s.settings && s.settings.spectatorEnabled === false) {
        setError('SPECTATOR_BLOCKED');
      } else {
        setState(s);
        setError(null);
      }
    };

    socket.on('state:full', updateState);
    socket.on('auction:settingsChanged', updateState);
    socket.on('auction:sold', ({ publicState }) => updateState(publicState));
    socket.on('auction:unsold', ({ publicState }) => updateState(publicState));
    socket.on('auction:phaseChange', (s) => updateState(s));

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [pinRequired, spectatorToken]);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError('');
    setPinLoading(true);
    try {
      const res = await fetch('/api/public/dashboard-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (!res.ok) { setPinError(data.error || 'Invalid PIN'); return; }
      setSpectatorToken(data.token);
    } catch {
      setPinError('Connection error — is the server running?');
    } finally {
      setPinLoading(false);
    }
  };

  if (error === 'SPECTATOR_BLOCKED') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center', bgcolor: '#0f172a' }}>
        <Typography variant="h2" sx={{ mb: 2 }}>🚫</Typography>
        <Typography variant="h4" fontWeight={800} color="white" gutterBottom>Spectator Screen Blocked</Typography>
        <Typography color="text.secondary">The administrator has temporarily disabled this screen for performance reasons.</Typography>
      </Box>
    );
  }

  if (pinRequired && !spectatorToken) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #141428 100%)', p: 2 }}>
        <Card sx={{ width: '100%', maxWidth: 360, bgcolor: '#1e293b', color: 'white', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }} elevation={24}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🏏</Typography>
              <Typography variant="h5" fontWeight={900} color="white">SPECTATOR LOGIN</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1 }}>
                Enter the PIN to view live rosters
              </Typography>
            </Box>
            <Box component="form" onSubmit={handlePinSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                type="password"
                placeholder="Enter PIN"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                autoFocus
                fullWidth
                error={!!pinError}
                inputProps={{ style: { textAlign: 'center', letterSpacing: '0.2em', color: 'white' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  }
                }}
              />
              {pinError && <Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ff8a80', border: '1px solid rgba(211, 47, 47, 0.2)' }}>{pinError}</Alert>}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={!pinInput || pinLoading}
                fullWidth
                sx={{ py: 1.5, fontWeight: 800, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
              >
                {pinLoading ? <CircularProgress size={24} color="inherit" /> : 'ENTER SPECTATOR VIEW'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!state) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a' }}>
        <CircularProgress size={60} thickness={4} />
        <Typography sx={{ mt: 3, color: 'text.secondary', fontWeight: 600 }}>
          {error || 'Connecting to rosters...'}
        </Typography>
      </Box>
    );
  }

  const teamList = Object.values(state.teams).sort((a, b) => a.name.localeCompare(b.name));
  const isEnded = state.phase === 'ENDED';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0b0e14', p: { xs: 1, md: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={950} color="white" sx={{ letterSpacing: '-0.04em', mb: 0, fontSize: { xs: '1.2rem', md: '2rem' } }}>
            RPL <Box component="span" sx={{ color: 'primary.main' }}>ROSTERS</Box>
          </Typography>
          <Typography variant="caption" color="rgba(255,255,255,0.3)" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.6rem' }}>
            Live Feed • {teamList.length} Teams
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Chip
            size="small"
            label={isEnded ? 'ENDED' : (connected ? 'LIVE' : 'CONNECTING')}
            color={isEnded ? 'default' : (connected ? 'success' : 'warning')}
            sx={{
              fontWeight: 900,
              px: 1,
              height: 20,
              fontSize: '0.6rem',
              bgcolor: isEnded ? 'rgba(255,255,255,0.1)' : undefined,
              color: isEnded ? 'rgba(255,255,255,0.7)' : undefined,
            }}
          />
        </Box>
      </Box>

      {/* Grid for 5 columns */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, 
        gap: 1.5,
        px: 1
      }}>
        {teamList.map((team) => (
          <TeamCard key={team.id} team={team} color={team.color || '#3b82f6'} allPlayers={state.players || []} />
        ))}
      </Box>
    </Box>
  );
}

function TeamCard({ team, color, allPlayers }) {
  const roster = [...(team.roster || [])];
  
  // Final display list: Owner first, then others
  const displayRows = [];

  // Identify all owners
  if (team.ownerIsPlayer && team.ownerPlayerIds?.length > 0) {
    team.ownerPlayerIds.forEach(ownerId => {
      // 1. Check if they are already in the roster (SOLD)
      const soldOwner = roster.find(p => p.playerId === ownerId);
      if (soldOwner) {
        displayRows.push({ ...soldOwner, isOwner: true });
      } else {
        // 2. If not sold yet, find them in global players list to show them as PENDING owner
        const pendingOwner = allPlayers.find(p => p.id === ownerId);
        if (pendingOwner) {
          displayRows.push({
            playerId: pendingOwner.id,
            playerName: pendingOwner.name,
            isOwner: true,
            status: 'PENDING'
          });
        }
      }
    });
  } else if (!team.ownerIsPlayer && team.ownerName) {
    // Non-player owner virtual row
    displayRows.push({
      playerId: 'owner-virtual',
      playerName: team.ownerName,
      isOwner: true,
      virtual: true
    });
  }

  // Add the rest of the players (excluding those already added as owners)
  const ownerIdsInRows = new Set(displayRows.map(r => r.playerId));
  const otherPlayers = roster.filter(p => !ownerIdsInRows.has(p.playerId));
  otherPlayers.sort((a, b) => a.playerName.localeCompare(b.playerName));
  
  displayRows.push(...otherPlayers);

  return (
    <Card sx={{
      height: '100%',
      background: 'rgba(23, 27, 34, 0.7)',
      backdropFilter: 'blur(10px)',
      border: `1px solid rgba(255,255,255,0.05)`,
      borderTop: `3px solid ${color}`,
      borderRadius: 2,
      transition: 'all 0.2s',
      '&:hover': { borderColor: color, transform: 'translateY(-2px)' }
    }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.01)' }}>
          <Typography variant="body1" fontWeight={950} color="white" noWrap sx={{ letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '1rem' }}>
            {team.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <Typography variant="caption" sx={{ color: color, fontWeight: 900, fontSize: '0.75rem' }}>
              {roster.length}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}>
              Players
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {displayRows.length === 0 ? (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography variant="caption" color="rgba(255,255,255,0.1)" fontStyle="italic">
                Empty Roster
              </Typography>
            </Box>
          ) : (
            displayRows.map((p, idx) => (
              <PlayerRow 
                key={p.playerId} 
                player={p} 
                isOwner={p.isOwner || team.ownerPlayerIds?.includes(p.playerId)} 
                index={idx}
                teamColor={color}
              />
            ))
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function PlayerRow({ player, isOwner, index, teamColor }) {
  // Uniform styling for all rows
  const bg = isOwner 
    ? `linear-gradient(90deg, ${teamColor}33 0%, ${teamColor}05 100%)` 
    : 'rgba(255,255,255,0.02)';

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      p: 0.75,
      px: 1,
      borderRadius: 1,
      background: bg,
      border: isOwner ? `1px solid ${teamColor}66` : '1px solid rgba(255,255,255,0.02)',
      transition: 'all 0.1s',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
         {/* Dot of team color for owner, subtle for others */}
        <Box sx={{ 
          width: 5, 
          height: 5, 
          borderRadius: '50%', 
          bgcolor: isOwner ? teamColor : 'rgba(255,255,255,0.2)',
          boxShadow: isOwner ? `0 0 6px ${teamColor}` : 'none'
        }} />
        <Typography 
          variant="body2" 
          fontWeight={isOwner ? 950 : 700} 
          color={isOwner ? 'white' : 'rgba(255,255,255,0.85)'} 
          noWrap 
          sx={{ fontSize: '0.9rem', letterSpacing: '0.01em' }}
        >
          {player.playerName}
        </Typography>
      </Box>
      {isOwner && (
        <Chip
          label="OWNER"
          size="small"
          sx={{
            height: 16,
            fontSize: '0.6rem',
            fontWeight: 1000,
            bgcolor: teamColor,
            color: '#fff',
            '& .MuiChip-label': { px: 0.75 }
          }}
        />
      )}
    </Box>
  );
}
