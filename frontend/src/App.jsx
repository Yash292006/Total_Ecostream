// Watermark: Yash Creations

import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import BottomPlayer from './components/BottomPlayer';
import MobileNav from './components/MobileNav';
import Search from './pages/Search';
import Library from './pages/Library';
import YashCreationLogo from './components/YashCreationLogo';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import './App.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "1028374982734-abc123xyz.apps.googleusercontent.com";

function AppContent() {
  const { loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // 1. Request notification permission programmatically using native Capacitor plugin
    const requestNotificationPermission = async () => {
      try {
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display !== 'granted') {
          console.log('[Native] Requesting local notification permissions...');
          await LocalNotifications.requestPermissions();
        }
      } catch (err) {
        console.error('[Native] Failed to request notification permission:', err);
      }
    };
    requestNotificationPermission();

    // 2. Enable native background mode & disable webview sleep optimizations (handles startup race conditions)
    const enableBackgroundMode = () => {
      const bg = window.cordova?.plugins?.backgroundMode;
      if (bg) {
        console.log('[Native] Configuring background mode defaults...');
        bg.setDefaults({
          title: 'EchoStream Playback',
          text: 'Keeping music active in the background.',
          icon: 'icon',
          color: '1DB954',
          resume: true,
          hidden: false
        });
        console.log('[Native] Enabling background mode service...');
        bg.enable();
        bg.on('activate', () => {
          bg.disableWebViewOptimizations();
        });
      } else {
        console.warn('[Native] Background mode plugin is not defined yet.');
      }
    };

    if (window.cordova) {
      enableBackgroundMode();
    } else {
      document.addEventListener('deviceready', enableBackgroundMode, false);
    }

    // 3. Register hardware back button event handler
    let handle;
    const registerListener = async () => {
      handle = await CapApp.addListener('backButton', () => {
        // Safe navigation check: If we are on the main search landing page with no query params, exit the app.
        // Otherwise, navigate back.
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;

        if (currentPath === '/search' && !currentSearch) {
          CapApp.exitApp();
        } else {
          navigate(-1);
        }
      });
    };

    registerListener();

    return () => {
      if (handle) {
        handle.remove();
      }
      document.removeEventListener('deviceready', enableBackgroundMode);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-zinc-500 font-sans">
        <div className="w-10 h-10 border-4 border-spotify-green border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs uppercase font-bold tracking-wider">Syncing session...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black text-white flex overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-900 relative overflow-hidden">
        {/* Background Watermark */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-[0.035] z-0">
          <YashCreationLogo className="w-80 h-80 mb-6 text-white" />
          <h1 className="text-5xl font-black uppercase tracking-[0.2em] text-white">Yash Creations</h1>
        </div>

        {/* Scrollable contents */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-40 z-10 relative">
          <Routes>
            <Route path="/search" element={<Search />} />
            <Route path="/library" element={<Library />} />
            <Route path="*" element={<Navigate to="/search" replace />} />
          </Routes>
        </main>

        {/* Persistent Media Playback Controls */}
        <BottomPlayer />
      </div>

      {/* Bottom Navigation for Mobile */}
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <PlayerProvider>
          <Router>
            <AppContent />
          </Router>
        </PlayerProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
