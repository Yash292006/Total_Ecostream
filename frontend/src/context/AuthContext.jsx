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
      localStorage.setItem('spotify_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token viability by loading profile
      api.get('/api/auth/me')
        .then(res => {
          setUser(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Session verification failed. Logging out.', err);
          logout();
          setLoading(false);
        });
    } else {
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

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
