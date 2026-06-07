// Watermark: Yash Creations
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

import { getApiUrl } from '../apiConfig';

export const AuthContext = createContext();

const API_URL = getApiUrl();

// Create a configured Axios instance
export const api = axios.create({
  baseURL: API_URL,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('spotify_token') || null);
  const [loading, setLoading] = useState(true);

  // Synchronize token state with Axios common headers and local storage
  useEffect(() => {
    if (token) {
      console.log('Token found, configuring api client...');
      localStorage.setItem('spotify_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token viability on startup
      if (loading) {
        console.log('Verifying session with backend...');
        api.get('/api/auth/me')
          .then(res => {
            console.log('Session verified successfully for user:', res.data.username);
            setUser(res.data);
            setLoading(false);
          })
          .catch(err => {
            console.error('Session verification failed:', err.message);
            // If the server returns 401/403/404, the token is dead
            if (err.response && (err.response.status === 401 || err.response.status === 403 || err.response.status === 404)) {
              console.log('Token invalid, logging out...');
              logout();
            }
            // If it's a network error (e.g. Render server sleeping), don't log out yet, just stop loading
            setLoading(false);
          });
      } else {
        // Just sync user if loading was already false (e.g. after login)
        setLoading(false);
      }
    } else {
      console.log('No active session token found.');
      localStorage.removeItem('spotify_token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await api.post('/api/auth/login', { username, password });
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Login failed. Please check your credentials.'
      };
    }
  };

  const register = async (username, password) => {
    try {
      const res = await api.post('/api/auth/register', { username, password });
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Registration failed.'
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const googleLogin = async (credential) => {
    try {
      const res = await api.post('/api/auth/google', { credential });
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Google login failed.'
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
