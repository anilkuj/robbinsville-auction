import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/public/teams')
      .then(r => r.json())
      .then(data => {
        setTeams(data.teams || []);
        if (data.teams?.length) setUsername(data.teams[0].name);
      })
      .catch(() => {});
  }, []);

  // Already logged in
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '1rem',
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        border: '1px solid #334155',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏏</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9' }}>RPL Auction</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Robbinsville Premier League
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
              Team
            </label>
            {teams.length > 0 ? (
              <select
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#f1f5f9',
                  fontSize: '1rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {teams.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your team name"
                required
                autoFocus
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#f1f5f9',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
            )}
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              style={{
                width: '100%',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: '#f1f5f9',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#7f1d1d40',
              border: '1px solid #ef444440',
              color: '#ef4444',
              borderRadius: '7px',
              padding: '0.6rem 1rem',
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.85rem',
              background: loading ? '#334155' : 'linear-gradient(135deg, #f59e0b, #ef4444)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '0.5rem',
              boxShadow: loading ? 'none' : '0 4px 15px #f59e0b30',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
