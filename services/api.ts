import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Backend Render — SOURCE UNIQUE ET VERROUILLÉE
 * ❌ Pas de fallback
 * ❌ Pas de Constants.expoConfig
 * ❌ Pas de logique par environnement
 */
const API_URL = 'https://aerologix-backend.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Storage compatible mobile + web
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

// Interceptor JWT
api.interceptors.request.use(
  async (config) => {
    const isAuthRoute =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/signup');

    if (!isAuthRoute) {
      const token = await storage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export { storage };
export default api;
