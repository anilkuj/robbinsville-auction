import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeModeProvider } from './contexts/ThemeContext.jsx';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <CssBaseline />
      <App />
    </ThemeModeProvider>
  </React.StrictMode>
);
