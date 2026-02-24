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
