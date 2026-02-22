import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { AuctionProvider } from './contexts/AuctionContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AuctionPage from './pages/AuctionPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProtectedRoute from './components/shared/ProtectedRoute.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuctionProvider>
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
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuctionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
