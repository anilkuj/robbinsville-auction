import React, { useEffect, useState, useRef } from 'react';
import DashboardView from '../components/admin/DashboardView.jsx';
import { io } from 'socket.io-client';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Chip from '@mui/material/Chip';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

export default function DashboardPage() {
  const [pinRequired, setPinRequired] = useState(null);
  const [spectatorToken, setSpectatorToken] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
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

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      if (err.message === 'Dashboard requires PIN authentication') {
        setPinRequired(true);
        setSpectatorToken(null);
      }
    });

    const set = (s) => setState(s);
    socket.on('state:full',              set);
    socket.on('auction:playerUp',        set);
    socket.on('auction:paused',          set);
    socket.on('auction:resumed',         set);
    socket.on('auction:settingsChanged', set);
    socket.on('auction:phaseChange',     set);
    socket.on('auction:awaitingHammer',  set);
    socket.on('auction:bid',    ({ publicState }) => setState(publicState));
    socket.on('auction:sold',   ({ publicState }) => setState(publicState));
    socket.on('auction:unsold', ({ publicState }) => setState(publicState));

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [pinRequired, spectatorToken]);

  async function handlePinSubmit(e) {
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
  }

  // Loading PIN settings
  if (pinRequired === null) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  // PIN gate
  if (pinRequired && !spectatorToken) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #141428 100%)', p: 2 }}>
        <Card sx={{ width: '100%', maxWidth: 340, border: '1px solid', borderColor: 'divider' }} elevation={24}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography sx={{ fontSize: '2rem', mb: 0.5 }}>🏏</Typography>
              <Typography variant="h6" fontWeight={800} color="primary">RPL Dashboard</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Enter the PIN to view the live auction
              </Typography>
            </Box>
            <Box component="form" onSubmit={handlePinSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                type="password"
                placeholder="Enter PIN"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                autoFocus
                fullWidth
                error={!!pinError}
                inputProps={{ style: { textAlign: 'center', letterSpacing: '0.2em' } }}
              />
              {pinError && <Alert severity="error" sx={{ py: 0.5 }}>{pinError}</Alert>}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={!pinInput || pinLoading}
                fullWidth
                startIcon={pinLoading ? <CircularProgress size={18} color="inherit" /> : null}
              >
                {pinLoading ? 'Checking…' : 'Enter Dashboard'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Connecting
  if (!state) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Typography color="text.disabled">Connecting to auction…</Typography>
      </Box>
    );
  }

  const { phase, players } = state;
  const totalSold    = players.filter(p => p.status === 'SOLD').length;
  const totalUnsold  = players.filter(p => p.status === 'UNSOLD').length;
  const totalPending = players.filter(p => p.status === 'PENDING').length;
  const awaitingHammer = phase === 'LIVE' && !state.timerEndsAt && state.settings?.endMode === 'manual';

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: '1.4rem' }}>🏏</Typography>
            <Box>
              <Typography fontWeight={800} color="primary" lineHeight={1.2}>RPL Auction</Typography>
              <Typography variant="caption" color="text.disabled">Live Team Dashboard</Typography>
            </Box>
            {phase !== 'SETUP' && <PhaseChip phase={phase} awaitingHammer={awaitingHammer} />}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {[
                { label: 'Sold',    val: totalSold,    color: 'success' },
                { label: 'Unsold',  val: totalUnsold,  color: 'error' },
                { label: 'Pending', val: totalPending, color: 'warning' },
              ].map(s => (
                <Box key={s.label} sx={{ textAlign: 'center' }}>
                  <Typography fontWeight={800} fontSize="1.1rem" color={`${s.color}.main`} lineHeight={1}>{s.val}</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FiberManualRecordIcon sx={{ fontSize: 10, color: connected ? 'success.main' : 'error.main' }} />
              <Typography variant="caption" color="text.disabled">{connected ? 'Live' : 'Reconnecting…'}</Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => {
                sessionStorage.removeItem('spectatorToken'); // Check if it's sessionStorage or localStorage
                localStorage.removeItem('spectatorToken');
                window.location.reload();
              }}
              sx={{ borderColor: 'rgba(255,255,255,0.1)', color: 'text.secondary', ml: 1 }}
            >
              Sign Out
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <DashboardView state={state} />
    </Box>
  );
}

function PhaseChip({ phase, awaitingHammer }) {
  if (awaitingHammer) return <Chip label="🔨 Hammer" size="small" sx={{ bgcolor: '#2e1065', color: '#a855f7', fontWeight: 700 }} />;
  const map = {
    LIVE:   <Chip label="● Live"     size="small" color="success" sx={{ fontWeight: 700 }} />,
    PAUSED: <Chip label="⏸ Paused"  size="small" color="warning" sx={{ fontWeight: 700 }} />,
    ENDED:  <Chip label="Ended"      size="small" sx={{ fontWeight: 700 }} />,
  };
  return map[phase] ?? null;
}
