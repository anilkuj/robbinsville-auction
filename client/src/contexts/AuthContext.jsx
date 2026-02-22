import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rpl_token');
    const userData = localStorage.getItem('rpl_user');
    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch {
        // Corrupted storage — clear it
        localStorage.removeItem('rpl_token');
        localStorage.removeItem('rpl_user');
      }
    }
    setLoading(false);
  }, []);

  async function login(username, password) {
    const res = await axios.post('/api/auth/login', { username, password });
    const { token, ...userData } = res.data;
    localStorage.setItem('rpl_token', token);
    localStorage.setItem('rpl_user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    return userData;
  }

  function logout() {
    localStorage.removeItem('rpl_token');
    localStorage.removeItem('rpl_user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
