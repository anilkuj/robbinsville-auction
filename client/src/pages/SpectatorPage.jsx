import React, { useEffect, useState, useRef } from 'react';
import rplLogo from '../assets/rpl-logo.jpg';
import { motion, AnimatePresence } from 'framer-motion';
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
import TeamLogo from '../components/shared/TeamLogo.jsx';
import SquadGrid from '../components/auction/SquadGrid.jsx';

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
      if (s?.settings?.spectatorEnabled === false) {
        setError('SPECTATOR_BLOCKED');
      } else if (s && typeof s === 'object') {
        setState(prev => ({ ...(prev || {}), ...s }));
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
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: '#0b0e14',
        p: 2 
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="glass-panel" sx={{ width: '100%', maxWidth: 360, color: 'white', border: '1px solid rgba(255,255,255,0.08)' }} elevation={0}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box 
                  component="img" 
                  src={rplLogo} 
                  sx={{ height: 80, width: 'auto', mb: 1.5, borderRadius: '8px' }} 
                />
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
                />
                {pinError && <Alert severity="error" sx={{ bgcolor: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.1)' }}>{pinError}</Alert>}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={!pinInput || pinLoading}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  {pinLoading ? <CircularProgress size={24} color="inherit" /> : 'ENTER SPECTATOR VIEW'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
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

  const isEnded = state?.phase === 'ENDED';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0b0e14', p: { xs: 1, md: 2 } }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 2, 
        px: 2,
        gap: { xs: 2, sm: 0 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box 
            component="img" 
            src={rplLogo} 
            sx={{ height: { xs: 40, md: 60 }, width: 'auto', borderRadius: '4px' }} 
          />
          <Box>
            <Typography variant="h4" fontWeight={950} color="white" sx={{ letterSpacing: '0.05em', mb: 0, fontSize: { xs: '1.1rem', sm: '1.5rem', md: '2rem' } }}>
              RPL <Box component="span" sx={{ color: 'primary.main' }}>2026</Box>
            </Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.3)" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: { xs: '0.5rem', md: '0.6rem' } }}>
              High-Speed Feed • {Object.keys(state?.teams || {}).length} Teams
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, width: { xs: '100%', sm: 'auto' }, display: 'flex', flexDirection: { xs: 'row', sm: 'column' }, alignItems: { xs: 'center', sm: 'flex-end' }, justifyContent: 'space-between' }}>
          <Chip
            size="small"
            label={isEnded ? 'ENDED' : (connected ? 'LIVE' : 'CONNECTING')}
            color={isEnded ? 'default' : (connected ? 'success' : 'warning')}
            sx={{
              fontWeight: 900,
              px: 1,
              height: 20,
              fontSize: '0.6rem',
              bgcolor: isEnded ? 'rgba(125,125,125,0.2)' : undefined,
              color: isEnded ? 'rgba(255,255,255,0.7)' : undefined,
            }}
          />
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() => {
              localStorage.removeItem('spectatorToken');
              window.location.reload();
            }}
            sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 800, mt: { xs: 0, sm: 0.5 }, '&:hover': { color: 'white' } }}
          >
            Sign Out
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, width: '100%', maxWidth: 1800, mx: 'auto' }}>
        <SquadGrid 
          teams={state.teams} 
          players={state.players} 
          phase={state.phase}
          hideToggle={true} 
          hidePoints={true} 
        />
      </Box>
    </Box>
  );
}

