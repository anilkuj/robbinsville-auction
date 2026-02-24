# MUI Dark Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all inline styles across the RPL Auction client with MUI v5 components and a custom dark theme (cricket gold primary, deep purple secondary).

**Architecture:** Install `@mui/material` + emotion + `@mui/icons-material`. Create `client/src/theme.js` with a custom MUI dark theme. Wrap the app in `ThemeProvider` + `CssBaseline` in `main.jsx`. Then convert each file in order from foundation → shared → pages.

**Tech Stack:** React 18, MUI v5 (`@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/icons-material`), Roboto via Google Fonts. No server changes.

**Note:** This project has no test suite. Skip TDD steps — implement, visually verify with `npm run dev`, then commit.

---

### Task 1: Install packages, add Roboto, create theme, wire ThemeProvider

**Files:**
- Modify: `client/package.json`
- Modify: `client/index.html`
- Create: `client/src/theme.js`
- Modify: `client/src/main.jsx`

**Step 1: Install MUI packages**

In `client/` directory:
```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```

**Step 2: Add Roboto font to `client/index.html`**

In the `<head>`, after the existing `<style>` block, add:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
```

Also update the existing `<style>` block's `font-family` to include `'Roboto'` first:
```css
body { font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; ... }
```

**Step 3: Create `client/src/theme.js`**

```js
import { createTheme } from '@mui/material/styles';

const POOL_COLORS = {
  A: '#f59e0b',
  B: '#3b82f6',
  C: '#8b5cf6',
  D: '#64748b',
};

export function poolColor(poolId) {
  if (!poolId) return POOL_COLORS.D;
  if (poolId.startsWith('A')) return POOL_COLORS.A;
  if (poolId.startsWith('B')) return POOL_COLORS.B;
  if (poolId === 'C') return POOL_COLORS.C;
  return POOL_COLORS.D;
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#f59e0b' },
    secondary:  { main: '#7c3aed' },
    success:    { main: '#22c55e' },
    error:      { main: '#ef4444' },
    background: { default: '#0a0f1e', paper: '#141428' },
    text:       { primary: '#f1f5f9', secondary: '#94a3b8', disabled: '#475569' },
    divider: '#1e293b',
  },
  typography: {
    fontFamily: "'Roboto', -apple-system, sans-serif",
    h1: { fontWeight: 900 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 700 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          boxShadow: '0 4px 20px #f59e0b30',
          '&:hover': { background: 'linear-gradient(135deg, #fbbf24, #f87171)', boxShadow: '0 4px 24px #f59e0b50' },
          '&.Mui-disabled': { background: '#1e293b', color: '#475569', boxShadow: 'none' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: '#0a0f1e',
            '& fieldset': { borderColor: '#334155' },
            '&:hover fieldset': { borderColor: '#475569' },
            '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          '&.Mui-selected': { color: '#f59e0b', fontWeight: 700 },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#f59e0b' },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { background: '#141428', borderBottom: '1px solid #1e293b', boxShadow: 'none' },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        'html, body, #root': { margin: 0, padding: 0, minHeight: '100vh' },
        '::-webkit-scrollbar': { width: '6px', height: '6px' },
        '::-webkit-scrollbar-track': { background: '#0a0f1e' },
        '::-webkit-scrollbar-thumb': { background: '#334155', borderRadius: '3px' },
      },
    },
  },
});

export default theme;
```

**Step 4: Update `client/src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';
import theme from './theme.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

**Step 5: Start dev server and verify the app loads**

```bash
npm run dev
```

Open browser at http://localhost:5173 — the login page should now use Roboto font and dark background.

**Step 6: Commit**

```bash
git add client/package.json client/package-lock.json client/index.html client/src/theme.js client/src/main.jsx
git commit -m "feat: install MUI v5 + create dark theme + wire ThemeProvider"
```

---

### Task 2: LoginPage → MUI

**Files:**
- Modify: `client/src/pages/LoginPage.jsx`

**Step 1: Rewrite `LoginPage.jsx`**

Replace the entire file with:

```jsx
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
      .catch(() => {});
  }, []);

  if (user) {
    navigate(user.role === 'admin' ? '/admin' : '/auction', { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(username.trim(), password);
      navigate(userData.role === 'admin' ? '/admin' : '/auction', { replace: true });
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
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
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
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
```

**Step 2: Verify login page looks correct**

Run `npm run dev`, open http://localhost:5173 — should see a centered dark card with MUI inputs, a gold gradient Sign In button, and Roboto font.

**Step 3: Commit**

```bash
git add client/src/pages/LoginPage.jsx
git commit -m "feat: convert LoginPage to MUI components"
```

---

### Task 3: Auction small components — PlayerCard, BidDisplay, BidHistory

**Files:**
- Modify: `client/src/components/auction/PlayerCard.jsx`
- Modify: `client/src/components/auction/BidDisplay.jsx`
- Modify: `client/src/components/auction/BidHistory.jsx`

**Step 1: Rewrite `PlayerCard.jsx`**

```jsx
import React from 'react';
import { formatPts } from '../../utils/budgetCalc.js';
import { poolColor } from '../../theme.js';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default function PlayerCard({ player }) {
  if (!player) {
    return (
      <Card variant="outlined" sx={{ borderStyle: 'dashed', textAlign: 'center', p: 3 }}>
        <Typography color="text.disabled">Waiting for next player…</Typography>
      </Card>
    );
  }

  const color = poolColor(player.pool);

  return (
    <Card sx={{
      border: '1px solid',
      borderColor: `${color}40`,
      boxShadow: `0 0 24px ${color}20`,
      borderTop: `3px solid ${color}`,
    }}>
      <CardContent>
        <Box sx={{ mb: 1 }}>
          <Chip
            label={`POOL ${player.pool}`}
            size="small"
            sx={{ bgcolor: color, color: '#fff', fontWeight: 700, fontSize: '0.7rem' }}
          />
        </Box>
        <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.2, mb: 0.5 }}>
          {player.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Base Price:{' '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {formatPts(player.basePrice)}
          </Box>
        </Typography>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Rewrite `BidDisplay.jsx`**

```jsx
import React from 'react';
import { formatPts } from '../../utils/budgetCalc.js';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function BidDisplay({ currentBid, teams, player }) {
  const leadingTeam = currentBid?.teamId ? teams?.[currentBid.teamId] : null;
  const amount = currentBid?.amount;
  const hasBid = !!currentBid?.teamId;

  return (
    <Paper sx={{ p: '1rem 1.25rem', textAlign: 'center', bgcolor: 'background.default' }}>
      <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: '0.1em' }}>
        {hasBid ? 'Highest Bid' : 'Opening Bid'}
      </Typography>
      <Typography
        variant="h3"
        fontWeight={900}
        sx={{
          color: hasBid ? 'success.main' : 'primary.main',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {formatPts(amount || player?.basePrice)}
      </Typography>
      {hasBid && leadingTeam && (
        <Chip
          icon={<EmojiEventsIcon sx={{ fontSize: '0.9rem !important' }} />}
          label={leadingTeam.name}
          size="small"
          color="success"
          variant="outlined"
          sx={{ mt: 0.75, fontWeight: 700 }}
        />
      )}
      {!hasBid && (
        <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
          No bids yet
        </Typography>
      )}
    </Paper>
  );
}
```

**Step 3: Rewrite `BidHistory.jsx`**

```jsx
import React, { useEffect, useRef } from 'react';
import { formatPts } from '../../utils/budgetCalc.js';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';

export default function BidHistory({ history = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length]);

  if (history.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 1.5 }}>
        No bids yet
      </Typography>
    );
  }

  return (
    <List dense disablePadding sx={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {[...history].reverse().map((entry, i) => (
        <ListItem
          key={i}
          sx={{
            borderRadius: 1,
            px: 1.5,
            py: 0.5,
            bgcolor: i === 0 ? '#14532d30' : 'background.paper',
            border: '1px solid',
            borderColor: i === 0 ? '#22c55e40' : 'divider',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="body2"
            fontWeight={i === 0 ? 700 : 400}
            sx={{ color: i === 0 ? 'success.main' : 'text.secondary' }}
          >
            {entry.teamName}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ color: i === 0 ? 'success.main' : 'text.disabled', fontVariantNumeric: 'tabular-nums' }}
          >
            {formatPts(entry.amount)}
          </Typography>
        </ListItem>
      ))}
      <div ref={bottomRef} />
    </List>
  );
}
```

**Step 4: Verify the auction page renders correctly (LIVE phase)**

Open the auction page in the browser — PlayerCard should have a colored top border stripe, BidDisplay should show a large gold/green amount, BidHistory should show MUI list items.

**Step 5: Commit**

```bash
git add client/src/components/auction/PlayerCard.jsx client/src/components/auction/BidDisplay.jsx client/src/components/auction/BidHistory.jsx
git commit -m "feat: convert PlayerCard, BidDisplay, BidHistory to MUI"
```

---

### Task 4: BidButton → MUI

**Files:**
- Modify: `client/src/components/auction/BidButton.jsx`

**Step 1: Rewrite `BidButton.jsx`**

The logic (state, bid calculation, socket events) stays **identical**. Only replace the JSX render section. Key replacements:
- `<input type="number">` → `<TextField type="number" />`
- `<button>` (main bid) → `<Button variant="contained" size="large" />`
- `Modal` inner component → `<Dialog>`
- `cancelBtnStyle` / `confirmBtnStyle` buttons → `<Button variant="outlined" />` / `<Button variant="contained" />`

```jsx
import React, { useState, useEffect } from 'react';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { computeMaxBid, formatPts } from '../../utils/budgetCalc.js';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';

export default function BidButton() {
  const { auctionState, placeBid, socket } = useAuction();
  const { user } = useAuth();
  const [customAmount, setCustomAmount] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [confirmBid, setConfirmBid] = useState(null);
  const [budgetWarn, setBudgetWarn] = useState(null);

  useEffect(() => {
    if (!socket) return;
    const onRejected = ({ reason }) => {
      setFeedback({ type: 'err', msg: reason });
      setConfirmBid(null);
    };
    socket.on('bid:rejected', onRejected);
    return () => socket.off('bid:rejected', onRejected);
  }, [socket]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  useEffect(() => {
    setCustomAmount('');
    setConfirmBid(null);
    setBudgetWarn(null);
  }, [auctionState?.currentPlayerIndex]);

  if (!auctionState || auctionState.phase !== 'LIVE') return null;
  const player = auctionState.players?.[auctionState.currentPlayerIndex];
  if (!player) return null;
  const team = auctionState.teams?.[user?.teamId];
  if (!team) return null;

  const { squadSize, minBid, pools } = auctionState.leagueConfig;
  const { bidIncrement } = auctionState.settings;
  const { currentBid, timerPaused } = auctionState;

  const minNextBid = currentBid.teamId === null ? player.basePrice : currentBid.amount + bidIncrement;
  const maxBid = computeMaxBid(team.budget, team.roster.length, squadSize, minBid);
  const minPlayerCost = pools?.length ? Math.min(...pools.map(p => p.basePrice)) : minBid;

  const isLeading = currentBid.teamId === user.teamId;
  const rosterFull = team.roster.length >= squadSize;
  const cantAfford = minNextBid > maxBid;
  const disabled = timerPaused || isLeading || rosterFull || cantAfford;

  let disabledReason = '';
  if (timerPaused) disabledReason = 'Auction paused';
  else if (isLeading) disabledReason = 'You are leading';
  else if (rosterFull) disabledReason = 'Squad full';
  else if (cantAfford) disabledReason = `Max: ${formatPts(maxBid)}`;

  const parsedCustom = customAmount !== '' ? parseInt(customAmount) : null;
  const effectiveBid = parsedCustom && parsedCustom >= minNextBid ? parsedCustom : minNextBid;

  const slotsAfterThis = Math.max(0, squadSize - team.roster.length - 1);
  const maxAffordable = team.budget - slotsAfterThis * minPlayerCost;

  let customError = null;
  if (parsedCustom !== null) {
    if (parsedCustom < minNextBid) customError = `Min bid is ${formatPts(minNextBid)}`;
    else if (parsedCustom > maxAffordable) customError = `Max bid is ${formatPts(maxAffordable)} — must keep ${formatPts(slotsAfterThis * minPlayerCost)} for ${slotsAfterThis} remaining player${slotsAfterThis !== 1 ? 's' : ''}`;
    else if (parsedCustom > maxBid) customError = `Max bid is ${formatPts(maxBid)}`;
  }

  function handleBidClick() {
    if (disabled || customError) return;
    const budgetAfter = team.budget - effectiveBid;
    const minNeeded = slotsAfterThis * minPlayerCost;
    if (slotsAfterThis > 0 && budgetAfter < minNeeded) {
      setBudgetWarn({ amount: effectiveBid, slotsAfterThis, budgetAfter, minNeeded, minPlayerCost });
      return;
    }
    if (auctionState.settings.requireBidConfirm ?? true) {
      setConfirmBid(effectiveBid);
    } else {
      doBid(effectiveBid);
    }
  }

  function doBid(amount) {
    placeBid(player.id, amount);
    setConfirmBid(null);
    setBudgetWarn(null);
    setCustomAmount('');
    setFeedback({ type: 'ok', msg: `Bid ${formatPts(amount)} placed!` });
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        {!disabled && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', width: '100%', maxWidth: 320 }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                type="number"
                label="Custom amount"
                size="small"
                placeholder={String(minNextBid)}
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                error={!!customError}
                inputProps={{ min: minNextBid, max: maxBid }}
                fullWidth
              />
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.6, pt: '6px' }}>
              Min: {formatPts(minNextBid)}<br />
              Max: {formatPts(maxBid)}
            </Typography>
          </Box>
        )}

        {customError && (
          <Typography variant="caption" color="error" sx={{ width: '100%', maxWidth: 320 }}>
            {customError}
          </Typography>
        )}

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleBidClick}
          disabled={disabled || !!customError}
          fullWidth
          sx={{ maxWidth: 320, py: 1.5, fontSize: '1.1rem' }}
        >
          {disabled ? (disabledReason || '—') : `BID ${formatPts(effectiveBid)}`}
        </Button>

        {feedback && (
          <Alert
            severity={feedback.type === 'ok' ? 'success' : 'error'}
            sx={{ py: 0, width: '100%', maxWidth: 320 }}
          >
            {feedback.msg}
          </Alert>
        )}
      </Box>

      {/* Budget warning dialog */}
      <Dialog open={!!budgetWarn} onClose={() => setBudgetWarn(null)} maxWidth="xs" fullWidth>
        <DialogTitle>⚠️ Budget Warning</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Bidding <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{budgetWarn && formatPts(budgetWarn.amount)}</Box> will
            leave you with <Box component="span" color="error.main" fontWeight={700}>{budgetWarn && formatPts(budgetWarn.budgetAfter)}</Box>.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You still need <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{budgetWarn?.slotsAfterThis}</Box> more
            player{budgetWarn?.slotsAfterThis !== 1 ? 's' : ''} — at minimum{' '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{budgetWarn && formatPts(budgetWarn.minPlayerCost)}</Box> each,
            you need at least <Box component="span" color="error.main" fontWeight={700}>{budgetWarn && formatPts(budgetWarn.minNeeded)}</Box> in reserve.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBudgetWarn(null)} variant="outlined" color="inherit">OK, Cancel Bid</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm bid dialog */}
      <Dialog open={confirmBid !== null} onClose={() => setConfirmBid(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: 'center' }}>🏏 Confirm Bid</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Bid <Box component="span" color="primary.main" sx={{ fontSize: '1.3rem', fontWeight: 800 }}>{confirmBid !== null && formatPts(confirmBid)}</Box>
          </Typography>
          <Typography variant="body2" color="text.disabled">
            for <Box component="span" color="text.primary" fontWeight={700}>{player.name}</Box>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1 }}>
          <Button onClick={() => setConfirmBid(null)} variant="outlined" color="inherit">Cancel</Button>
          <Button onClick={() => doBid(confirmBid)} variant="contained" color="primary">Confirm Bid</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
```

**Step 2: Verify bid dialogs open and close correctly**

**Step 3: Commit**

```bash
git add client/src/components/auction/BidButton.jsx
git commit -m "feat: convert BidButton to MUI with Dialog modals"
```

---

### Task 5: Sidebar → MUI

**Files:**
- Modify: `client/src/components/shared/Sidebar.jsx`

**Step 1: Rewrite `Sidebar.jsx`**

```jsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useAuction } from '../../contexts/AuctionContext.jsx';
import { formatPts } from '../../utils/budgetCalc.js';
import { poolColor } from '../../theme.js';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LogoutIcon from '@mui/icons-material/Logout';

export default function Sidebar({ width }) {
  const { user, logout } = useAuth();
  const { auctionState, connected } = useAuction();

  const team = auctionState?.teams?.[user?.teamId];
  const squadSize = auctionState?.leagueConfig?.squadSize ?? 18;
  const roster = team?.roster ?? [];

  return (
    <Paper
      square
      sx={{
        width: width ?? 240,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
        bgcolor: 'background.paper',
      }}
    >
      <Typography fontWeight={800} color="primary" sx={{ textAlign: 'center', pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        🏏 RPL Auction
      </Typography>

      {team && (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Typography variant="overline" color="text.disabled">Your Team</Typography>
          <Typography fontWeight={700} sx={{ mt: 0.25 }}>{team.name}</Typography>

          <Typography variant="overline" color="text.disabled" display="block" sx={{ mt: 1.5 }}>Budget Remaining</Typography>
          <Typography fontWeight={800} color="success.main" fontSize="1.1rem">{formatPts(team.budget)}</Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75 }}>
            <Typography variant="caption" color="text.disabled">Squad</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{roster.length} / {squadSize}</Typography>
          </Box>
        </Paper>
      )}

      {!team && user?.role === 'team' && (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Typography variant="overline" color="text.disabled">Team</Typography>
          <Typography fontWeight={700}>{user.name}</Typography>
        </Paper>
      )}

      {roster.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Typography variant="overline" color="text.disabled">My Squad</Typography>
          <List dense disablePadding sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {roster.map((r, i) => (
              <ListItem
                key={r.playerId || i}
                disablePadding
                sx={{ borderTop: i > 0 ? '1px solid' : 'none', borderColor: 'divider', pt: i > 0 ? 0.5 : 0 }}
              >
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{r.playerName}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
                    <Chip
                      label={r.pool}
                      size="small"
                      sx={{ height: 18, fontSize: '0.6rem', bgcolor: `${poolColor(r.pool)}20`, color: poolColor(r.pool), fontWeight: 700 }}
                    />
                    <Typography variant="caption" color="success.main" fontWeight={700}>
                      {r.price.toLocaleString()} pts
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <FiberManualRecordIcon sx={{ fontSize: 10, color: connected ? 'success.main' : 'error.main' }} />
          <Typography variant="caption" color="text.disabled">{connected ? 'Live' : 'Reconnecting…'}</Typography>
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          startIcon={<LogoutIcon />}
          onClick={logout}
          fullWidth
          sx={{ borderColor: 'divider', color: 'text.secondary' }}
        >
          Sign Out
        </Button>
      </Box>
    </Paper>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/shared/Sidebar.jsx
git commit -m "feat: convert Sidebar to MUI"
```

---

### Task 6: AuctionPage → MUI

**Files:**
- Modify: `client/src/pages/AuctionPage.jsx`

**Step 1: Replace inline styles with MUI `sx` props throughout**

Key changes to make in `AuctionPage.jsx`:
- Outer wrapper `<div>` → `<Box sx={{ display: 'flex', minHeight: '100vh', userSelect: 'none' }}>`
- Toast notification → `<Paper>` with `sx={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', ... }}` using `color="success"` or `color="error"` variants
- SETUP waiting screen → `<Paper sx={{ textAlign: 'center', p: 4, mt: 1, borderRadius: 2 }}>`
- ENDED screen → same `<Paper>` pattern
- Bid History wrapper → `<Paper sx={{ p: 2, borderRadius: 2 }}>` with `<Typography variant="overline">Bid History</Typography>`
- Mobile roster → `<Paper>` with `<Table size="small">`
- `MobileHeader` inner component → use `<AppBar position="sticky">` + `<Toolbar>`
- `PhaseBar` inner component → `<Box>` with `<Chip>` for phase + player count
- `RemainingPlayersPanel` headers → use MUI `Typography` + `Chip`
- drag handles stay as raw `<div>` (functional, not visual)
- `<style>` tag for media queries — keep as-is (MUI doesn't replace CSS media queries)

The component's logic (drag resize, toast state, effects) stays **identical**. Only render output changes.

**Key pattern for the LIVE section:**

```jsx
{(phase === 'LIVE' || phase === 'PAUSED') && player && (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
    <PlayerCard player={player} />
    <PlayerExtraData player={player} />
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
      <CountdownTimer ... />
      <Box sx={{ flex: 1 }}>
        <BidDisplay ... />
      </Box>
    </Box>
    {user.role === 'team' && <BidButton />}
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="overline" color="text.disabled" display="block" sx={{ mb: 1 }}>
        Bid History
      </Typography>
      <BidHistory history={currentBid?.history} />
    </Paper>
  </Box>
)}
```

**Key pattern for MobileHeader:**

```jsx
function MobileHeader({ user, auctionState, connected }) {
  return (
    <AppBar position="sticky" sx={{ display: { md: 'none' } }}>
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: '52px !important' }}>
        <Typography fontWeight={800} color="primary">🏏 RPL</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {auctionState?.teams?.[user?.teamId] && (
            <Typography variant="caption" color="success.main" fontWeight={700}>
              {formatPts(auctionState.teams[user.teamId].budget)}
            </Typography>
          )}
          <FiberManualRecordIcon sx={{ fontSize: 10, color: connected ? 'success.main' : 'error.main' }} />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
```

**Step 2: Verify auction page renders all 3 phases correctly (SETUP, LIVE, ENDED)**

**Step 3: Commit**

```bash
git add client/src/pages/AuctionPage.jsx
git commit -m "feat: convert AuctionPage to MUI layout"
```

---

### Task 7: DashboardView + DashboardPage → MUI

**Files:**
- Modify: `client/src/components/admin/DashboardView.jsx`
- Modify: `client/src/pages/DashboardPage.jsx`

**Step 1: Update `DashboardView.jsx`**

Key changes:
- Current player banner → `<Paper sx={{ bgcolor: phase === 'PAUSED' ? '#1c0a00' : '#0c1a10', ... }}>` using MUI `Chip` for pool badge, `Typography` for bid amount
- Teams grid → keep CSS grid but use `<Paper sx={{ p: 2 }}>` wrapper
- `TeamCard` → `<Card>` with `<CardHeader>` and team name, leading `<Chip>` for "LEADING" badge, `<LinearProgress>` for budget bar, pool chips for roster rows
- `RemainingPlayersPane` headers → MUI `Typography` + `Chip` for count badge
- Pool section headers → `<Box sx={{ bgcolor: clr.bg, borderTop: ..., position: 'sticky', ... }}>`

**Key pattern for TeamCard:**

```jsx
function TeamCard({ team, startingBudget, squadSize, isLeading }) {
  const spent = startingBudget - team.budget;
  const spentPct = startingBudget > 0 ? (spent / startingBudget) * 100 : 0;
  const roster = team.roster ?? [];

  return (
    <Card sx={{
      border: '1px solid',
      borderColor: isLeading ? 'success.main' : 'divider',
      boxShadow: isLeading ? '0 0 0 1px #22c55e40' : 'none',
      transition: 'border-color 0.3s',
    }}>
      <Box sx={{ p: '0.85rem 1rem', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography fontWeight={700}>🏏 {team.name}</Typography>
          {isLeading && <Chip label="LEADING" size="small" color="success" sx={{ height: 20, fontSize: '0.6rem' }} />}
        </Box>
        <Typography variant="caption" color="text.disabled">{roster.length} / {squadSize}</Typography>
      </Box>
      {/* ... budget/roster content */}
    </Card>
  );
}
```

**Step 2: Update `DashboardPage.jsx` PIN screen**

Replace the PIN entry screen's raw `<div>` / `<input>` / `<button>` with MUI `Card`, `TextField`, `Button`, `Alert`.

**Step 3: Commit**

```bash
git add client/src/components/admin/DashboardView.jsx client/src/pages/DashboardPage.jsx
git commit -m "feat: convert DashboardView and DashboardPage to MUI"
```

---

### Task 8: AdminPage top bar + tabs + live preview panel → MUI

**Files:**
- Modify: `client/src/pages/AdminPage.jsx`

**Step 1: Replace AdminPage top bar**

```jsx
{/* Replace the top bar div */}
<AppBar position="static">
  <Toolbar sx={{ justifyContent: 'space-between' }}>
    <Typography fontWeight={900} color="primary">🏏 RPL Admin</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <FiberManualRecordIcon sx={{ fontSize: 10, color: connected ? 'success.main' : 'error.main' }} />
      <Button variant="outlined" color="inherit" size="small" startIcon={<LogoutIcon />} onClick={logout}
        sx={{ borderColor: 'divider', color: 'text.secondary' }}>
        Sign Out
      </Button>
    </Box>
  </Toolbar>
</AppBar>
```

**Step 2: Replace tabs**

```jsx
{/* Replace the hand-rolled tab buttons */}
<Tabs
  value={tab}
  onChange={(_, v) => setTab(v)}
  sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', px: 2 }}
  variant="scrollable"
  scrollButtons="auto"
>
  {TABS.map(t => <Tab key={t} label={t} value={t} />)}
</Tabs>
```

**Step 3: Replace live preview panel (left sidebar)**

```jsx
{(phase === 'LIVE' || phase === 'PAUSED') && player && (
  <Paper square sx={{ width: 280, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto' }}>
    <Typography variant="overline" color="text.disabled">On Block</Typography>
    <PlayerCard player={player} />
    <CountdownTimer ... />
    <BidDisplay ... />
    <Typography variant="overline" color="text.disabled">Bids</Typography>
    <BidHistory history={auctionState.currentBid?.history} />
  </Paper>
)}
```

**Step 4: Replace `Loading` sub-component**

```jsx
function Loading() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress color="primary" />
    </Box>
  );
}
```

**Step 5: Commit**

```bash
git add client/src/pages/AdminPage.jsx
git commit -m "feat: convert AdminPage shell (AppBar, Tabs, preview panel) to MUI"
```

---

### Task 9: Admin sub-components → MUI

**Files:**
- Modify: `client/src/components/admin/AuctionControls.jsx`
- Modify: `client/src/components/admin/PlayerImport.jsx`
- Modify: `client/src/components/admin/TeamRosterTable.jsx`
- Modify: `client/src/components/admin/UnsoldList.jsx`

**Step 1: AuctionControls.jsx**

Read the file first, then replace:
- Section headers → `<Typography variant="subtitle1" fontWeight={700}>`
- Control buttons (Next Player, Pause, Resume, Accept Bid) → `<Button variant="contained">` with appropriate colors (`color="success"`, `color="warning"`, etc.)
- Toggle chips (Fixed/Random, Timer/Manual) → `<ToggleButton>` from `@mui/material/ToggleButton`
- Number inputs (timer seconds, bid increment) → `<TextField type="number">`
- Manual Sale panel → `<Accordion>` with `<AccordionSummary>` / `<AccordionDetails>`
- Error alerts → `<Alert severity="error">`

**Step 2: PlayerImport.jsx**

Read the file first, then replace:
- CSV textarea → `<TextField multiline rows={8}>`
- Import button → `<Button variant="contained">`
- Status messages → `<Alert severity="success/error">`

**Step 3: TeamRosterTable.jsx**

Read the file first, then replace:
- Table structure → `<TableContainer component={Paper}><Table size="small"><TableHead><TableBody>`
- Table header cells → `<TableCell>` with `sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase' }}`
- Pool badges → `<Chip size="small">` with pool color

**Step 4: UnsoldList.jsx**

Read the file first, then replace:
- List items → MUI `<List>` + `<ListItem>` + `<ListItemText>`
- Re-auction buttons → `<Button variant="outlined" size="small">`

**Step 5: Commit**

```bash
git add client/src/components/admin/AuctionControls.jsx client/src/components/admin/PlayerImport.jsx client/src/components/admin/TeamRosterTable.jsx client/src/components/admin/UnsoldList.jsx
git commit -m "feat: convert admin sub-components to MUI"
```

---

### Task 10: AdminPage inline tab components → MUI

**Files:**
- Modify: `client/src/pages/AdminPage.jsx` (the inline tab components: LeagueSetupTab, TeamsTab, PlayerDataTab, SettingsTab)

**Step 1: LeagueSetupTab**

Replace inline `<input>` / `<button>` elements with:
- League config inputs → `<TextField>`
- Pool rows → `<Paper variant="outlined">` grid with `<TextField>` cells
- Add/Remove pool buttons → `<Button variant="outlined" size="small">`
- Save button → `<Button variant="contained" color="primary" size="large">`
- Success/error messages → `<Alert>`

**Step 2: TeamsTab (within AdminPage)**

- Team rows → `<TableContainer><Table>` with `<TextField>` for name/password inline editing

**Step 3: PlayerDataTab**

- Table → `<TableContainer component={Paper}><Table size="small">`
- Status chips → `<Chip>` with colors: SOLD=success, UNSOLD=error, PENDING=default, OWNER badge=secondary
- Owner avg indicator → `<Chip size="small" label="avg" />`
- Edit button → `<IconButton size="small"><EditIcon /></IconButton>`
- Edit price input → `<TextField size="small" type="number">`
- Search input → `<TextField size="small" InputAdornment with SearchIcon>`
- Owner filter toggle → `<Chip>` toggle button

**Step 4: SettingsTab**

- Settings fields → `<TextField type="number">` / `<Select>` for endMode
- Toggle switches → `<Switch>` with `<FormControlLabel>`
- Dashboard PIN → `<TextField>` with `<InputAdornment>`
- Save button → `<Button variant="contained">`

**Step 5: Commit**

```bash
git add client/src/pages/AdminPage.jsx
git commit -m "feat: convert AdminPage inline tab components to MUI"
```

---

### Task 11: Final polish pass

**Files:** All modified files (review only)

**Step 1: Do a visual pass through all pages**

Check:
- [ ] Login page: card, inputs, button, error alert
- [ ] Auction page (SETUP / LIVE / PAUSED / ENDED phases)
- [ ] Auction BidButton with confirm + budget warning dialogs
- [ ] Sidebar roster list
- [ ] Admin page: all 6 tabs
- [ ] Dashboard page: PIN gate + team grid + remaining players

**Step 2: Fix any visual regressions**

Common issues to watch for:
- `bgcolor` vs `background` in `sx` prop — use `bgcolor` for theme tokens, `background` for raw CSS values
- `Box` `sx={{ color }}` vs `Typography color` prop — both work but be consistent
- MUI `Select` needs `<InputLabel>` + matching `label` prop on `<Select>` to render label correctly
- `Paper elevation={0}` vs `Paper variant="outlined"` — use `outlined` for bordered cards

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: MUI dark theme polish pass"
```
