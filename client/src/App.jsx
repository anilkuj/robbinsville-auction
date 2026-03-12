import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { AuctionProvider } from './contexts/AuctionContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AuctionPage from './pages/AuctionPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HostPage from './pages/HostPage.jsx';
import SpectatorPage from './pages/SpectatorPage.jsx';
import ProtectedRoute from './components/shared/ProtectedRoute.jsx';
import { audioSystem } from './utils/audioSystem.js';
import { useAuction } from './contexts/AuctionContext.jsx';
import Alert from '@mui/material/Alert';

function ConnectionBanner() {
  const { connected } = useAuction();
  const { user } = useAuth();
  if (connected || !user) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      <Alert severity="error" variant="filled" square sx={{ justifyContent: 'center', fontWeight: 'bold' }}>
        ⚠ Connection Lost - Reconnecting to Server...
      </Alert>
    </div>
  );
}

export default function App() {
  React.useEffect(() => {
    const initAudio = () => audioSystem.init();
    window.addEventListener('mousedown', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    return () => {
      window.removeEventListener('mousedown', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, []);
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuctionProvider>
          <ConnectionBanner />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/auction"
              element={
                <ProtectedRoute>
                  <AuctionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host"
              element={
                <ProtectedRoute allowedRoles={['host', 'admin']}>
                  <HostPage />
                </ProtectedRoute>
              }
            />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/spectator" element={<SpectatorPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuctionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
