import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to={adminOnly ? '/login?admin=1' : '/login'} replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/auction" replace />;

  return children;
}
