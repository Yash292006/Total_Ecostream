import { Capacitor } from '@capacitor/core';

// The local network IP of your laptop running the backend container.
export const LAPTOP_IP = '10.17.207.109';

export const getApiUrl = () => {
  // If running as a native Android or iOS app wrapped by Capacitor
  if (Capacitor.isNativePlatform()) {
    return `http://${LAPTOP_IP}:5002`;
  }
  
  // If running locally in a browser
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5002';
  }
  
  // Otherwise, running in production/deployed environment
  return import.meta.env.VITE_API_URL || 'https://ecostream-backend.onrender.com';
};
