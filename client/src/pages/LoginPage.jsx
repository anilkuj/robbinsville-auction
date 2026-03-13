import React, { useState, useEffect } from 'react';
import rplLogo from '../assets/rpl-logo.jpg';
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
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminLogin = searchParams.get('admin') === '1';
  const isHostLogin = searchParams.get('host') === '1';
  const [teams, setTeams] = useState([]);
  const [username, setUsername] = useState(isAdminLogin ? 'admin' : isHostLogin ? 'host' : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdminLogin || isHostLogin) return;
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
      const u = username.trim();
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
      position: 'relative',
      overflow: 'hidden',
      bgcolor: 'background.default',
      p: 2,
    }}>
      {/* Background Decorative Elements */}
      <Box sx={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '40%',
        height: '40%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)',
        zIndex: 0,
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '50%',
        height: '50%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.05) 0%, transparent 70%)',
        zIndex: 0,
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 400, zIndex: 1 }}
      >
        <Card className="glass-panel" sx={{ border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'divider' }} elevation={0}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
              >
                <Box 
                  component="img" 
                  src={rplLogo} 
                  sx={{ 
                    height: 100, 
                    width: 'auto', 
                    mb: 2,
                    borderRadius: '12px',
                    boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)',
                    border: '1px solid',
                    borderColor: 'divider'
                  }} 
                />
              </motion.div>
              <Typography variant="h4" fontWeight={900} color="primary.main" sx={{ letterSpacing: '0.02em', mb: 0.5 }}>
                RPL 2026
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6 }}>
                Robbinsville Premier League
              </Typography>
            </Box>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={isAdminLogin ? 'admin' : isHostLogin ? 'host' : 'team'}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
              >
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {isAdminLogin ? (
                    <TextField
                      label="Admin Username"
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
                      sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: theme.palette.text.disabled } }}
                    />
                  ) : teams.length > 0 ? (
                    <FormControl fullWidth size="small">
                      <InputLabel>Select Your Team</InputLabel>
                      <Select
                        label="Select Your Team"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        autoFocus
                        MenuProps={{
                          PaperProps: {
                            className: 'glass-panel',
                            sx: { mt: 1, maxHeight: 300 }
                          }
                        }}
                      >
                        {teams.map(t => <MenuItem key={t.id} value={t.name}>{t.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      label="Team Name"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Enter identity"
                      required
                      autoFocus
                      fullWidth
                    />
                  )}

                  <TextField
                    label={isHostLogin ? "Access PIN" : "Security Key"}
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={isHostLogin ? "Enter 4-digit PIN" : "Enter password"}
                    required={!isHostLogin}
                    fullWidth
                  />

                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <Alert severity="error" sx={{ py: 0, border: '1px solid rgba(239, 68, 68, 0.2)', bgcolor: 'rgba(239, 68, 68, 0.05)' }}>{error}</Alert>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={loading}
                    fullWidth
                    sx={{ 
                      mt: 1, 
                      py: 1.8, 
                      fontSize: '1rem',
                      boxShadow: '0 8px 16px rgba(245, 158, 11, 0.25)' 
                    }}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {loading ? 'Authenticating…' : 'Access Auction'}
                  </Button>
                </Box>
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
}
