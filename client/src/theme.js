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
    primary: { 
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    secondary: { 
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    success: { main: '#10b981' },
    error: { main: '#ef4444' },
    background: { 
      default: '#0b0e14', 
      paper: '#111827',
    },
    text: { 
      primary: '#f8fafc', 
      secondary: '#94a3b8', 
      disabled: '#475569',
    },
    divider: 'rgba(255, 255, 255, 0.06)',
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: { fontFamily: "'Outfit', sans-serif", fontWeight: 900 },
    h2: { fontFamily: "'Outfit', sans-serif", fontWeight: 800 },
    h3: { fontFamily: "'Outfit', sans-serif", fontWeight: 800 },
    h4: { fontFamily: "'Outfit', sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Outfit', sans-serif", fontWeight: 700 },
    h6: { fontFamily: "'Outfit', sans-serif", fontWeight: 700 },
    button: { fontWeight: 700, letterSpacing: '0.02em' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { 
          textTransform: 'none', 
          borderRadius: 8,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          boxShadow: '0 4px 14px 0 rgba(245, 158, 11, 0.39)',
          border: '1px solid rgba(255,255,255,0.1)',
          '&:hover': { 
            background: 'linear-gradient(135deg, #fbbf24 0%, #f87171 100%)',
            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.5)',
          },
        },
        outlined: {
          borderColor: 'rgba(255,255,255,0.12)',
          '&:hover': {
            borderColor: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111827',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          '&.MuiPaper-elevation24': {
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: '#0b0e14',
            borderRadius: 8,
            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
            '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { 
          background: 'rgba(17, 24, 39, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)', 
          boxShadow: 'none',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        'html, body, #root': { 
          margin: 0, 
          padding: 0, 
          minHeight: '100vh',
          backgroundColor: '#0b0e14',
        },
        body: {
          backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.05) 0%, transparent 70%)',
          backgroundAttachment: 'fixed',
        },
        '::-webkit-scrollbar': { width: '5px', height: '5px' },
        '::-webkit-scrollbar-track': { background: '#0b0e14' },
        '::-webkit-scrollbar-thumb': { 
          background: '#334155', 
          borderRadius: '10px',
          '&:hover': { background: '#475569' },
        },
        '.glass-panel': {
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 16,
        },
      },
    },
  },
});

export default theme;
