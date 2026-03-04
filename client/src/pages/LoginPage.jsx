import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminLogin = searchParams.get('admin') === '1';
  const [isHostLogin, setIsHostLogin] = useState(false);
  const [teams, setTeams] = useState([]);
  const [username, setUsername] = useState(isAdminLogin ? 'admin' : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdminLogin) return;
    fetch('/api/public/teams')
      .then(r => r.json())
      .then(data => {
        setTeams(data.teams || []);
        if (data.teams?.length) setUsername(data.teams[0].name);
      })
      .catch(() => { });
  }, []);

  if (user) {
    if (user.role === 'admin') navigate('/admin', { replace: true });
    else if (user.role === 'host') navigate('/host', { replace: true });
    else navigate('/auction', { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = isHostLogin ? 'host' : username.trim();
      const userData = await login(u, password);
      if (userData.role === 'admin') navigate('/admin', { replace: true });
      else if (userData.role === 'host') navigate('/host', { replace: true });
      else navigate('/auction', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #141428 100%)',
      p: 2,
    }}>
      <Card sx={{ width: '100%', maxWidth: 400, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }} elevation={24}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h2" sx={{ fontSize: '3rem', mb: 0.5 }}>🏏</Typography>
            <Typography variant="h5" fontWeight={900} color="text.primary">RPL Auction</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Robbinsville Premier League
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {isAdminLogin ? (
              <TextField
                label="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                fullWidth
              />
            ) : isHostLogin ? (
              <TextField
                label="Host Username"
                value="host"
                disabled
                fullWidth
                sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#94a3b8' } }}
              />
            ) : teams.length > 0 ? (
              <FormControl fullWidth size="small">
                <InputLabel>Team</InputLabel>
                <Select
                  label="Team"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                  sx={{ background: '#0a0f1e' }}
                >
                  {teams.map(t => <MenuItem key={t.id} value={t.name}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label="Team"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your team name"
                required
                autoFocus
                fullWidth
              />
            )}

            <TextField
              label={isHostLogin ? "Host PIN (optional)" : "Password"}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isHostLogin ? "Enter PIN or leave blank" : "Enter password"}
              required={!isHostLogin}
              autoFocus={isHostLogin}
              fullWidth
            />

            {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              fullWidth
              sx={{ mt: 1, py: 1.5 }}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>

            {!isAdminLogin && (
              <Button
                variant="text"
                color="secondary"
                onClick={() => {
                  setIsHostLogin(!isHostLogin);
                  setError('');
                  setPassword('');
                }}
                sx={{ textTransform: 'none', mt: 1 }}
              >
                {isHostLogin ? 'Return to Team Login' : 'Join as Host'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
