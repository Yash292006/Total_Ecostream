import { Capacitor } from '@capacitor/core';

// The local network IP of your laptop running the backend container.
export const LAPTOP_IP = '10.17.207.109';

export const getApiUrl = () => {
  // Use the public production backend URL
  return 'https://ecostream-backend.onrender.com';
};
