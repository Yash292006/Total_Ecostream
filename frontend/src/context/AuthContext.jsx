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
  const [token, setToken] = useState(localStorage.getItem('spotify_token') || 'guest_token');
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
            // In bypass mode, even on network error, keep guest session active
            setUser({
              _id: '000000000000000000000000',
              username: 'guest',
              email: 'guest@ecostream.com'
            });
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    } else {
      console.log('Bypass: falling back to guest_token');
      setToken('guest_token');
    }
  }, [token]);

  const login = async (username, password) => {
    return { success: true };
  };

  const register = async (username, password) => {
    return { success: true };
  };

  const logout = () => {
    setToken('guest_token');
    setUser({
      _id: '000000000000000000000000',
      username: 'guest',
      email: 'guest@ecostream.com'
    });
  };

  const googleLogin = async (credential) => {
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
