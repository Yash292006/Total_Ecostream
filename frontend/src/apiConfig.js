import { Capacitor } from '@capacitor/core';

// The local network IP of your laptop running the backend container.
export const LAPTOP_IP = '10.17.207.109';

export const getApiUrl = () => {
  // If running as a native Android or iOS app wrapped by Capacitor
  if (Capacitor.isNativePlatform()) {
    return `http://${LAPTOP_IP}:5000`;
  }
  
  // Otherwise, running in a standard web browser
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};
