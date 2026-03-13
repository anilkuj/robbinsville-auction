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

export const getThemeOptions = (mode) => ({
  palette: {
    mode,
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
      default: mode === 'dark' ? '#0b0e14' : '#f1f5f9', 
      paper: mode === 'dark' ? '#111827' : '#f8fafc',
    },
    text: { 
      primary: mode === 'dark' ? '#f8fafc' : '#0f172a', 
      secondary: mode === 'dark' ? '#94a3b8' : '#475569', 
      disabled: mode === 'dark' ? '#475569' : '#94a3b8',
    },
    divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
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
            boxShadow: mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          boxShadow: '0 4px 14px 0 rgba(245, 158, 11, 0.39)',
          border: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : 'none',
          '&:hover': { 
            background: 'linear-gradient(135deg, #fbbf24 0%, #f87171 100%)',
            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.5)',
          },
        },
        outlined: {
          borderColor: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
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
          backgroundColor: mode === 'dark' ? '#111827' : '#ffffff',
          border: mode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          borderRadius: 16,
          boxShadow: mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          '&.MuiPaper-elevation24': {
            boxShadow: mode === 'dark' ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: mode === 'dark' ? '#0b0e14' : '#f1f5f9',
            borderRadius: 8,
            '& fieldset': { borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
            '&:hover fieldset': { borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' },
            '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { 
          background: mode === 'dark' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(241, 245, 249, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)', 
          boxShadow: 'none',
          color: mode === 'dark' ? '#f8fafc' : '#0f172a',
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
          backgroundColor: mode === 'dark' ? '#0b0e14' : '#f1f5f9',
        },
        body: {
          backgroundImage: mode === 'dark' 
            ? 'radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.05) 0%, transparent 70%)'
            : 'radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.03) 0%, transparent 70%)',
          backgroundAttachment: 'fixed',
        },
        '::-webkit-scrollbar': { width: '5px', height: '5px' },
        '::-webkit-scrollbar-track': { background: mode === 'dark' ? '#0b0e14' : '#f1f5f9' },
        '::-webkit-scrollbar-thumb': { 
          background: mode === 'dark' ? '#334155' : '#cbd5e1', 
          borderRadius: '10px',
          '&:hover': { background: mode === 'dark' ? '#475569' : '#94a3b8' },
        },
        '.glass-panel': {
          background: mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(241, 245, 249, 0.7)',
          backdropFilter: 'blur(12px)',
          border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
          borderRadius: 16,
        },
      },
    },
  },
});

const theme = createTheme(getThemeOptions('dark'));
export default theme;
