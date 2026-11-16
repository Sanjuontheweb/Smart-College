import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

/**
 * Global configuration values.
 * Values are read from environment variables (via .env) or Expo extra.
 */
export const CONFIG = {
  // App meta
  appName: 'Survive College',
  version: '1.0.0',
  universityName: 'Survive College',

  // Supabase
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key',

  // AI server URL (kept for profile.tsx compatibility; HF calls bypass this)
  aiServerUrl: process.env.EXPO_PUBLIC_AI_SERVER_URL || 'http://localhost:5000',
  networkTimeoutMs: 6000,

  // Notification lead times (days)
  notificationLeadDays: {
    internal: 5,
    external: 10,
  },
};

/**
 * Load the Hugging Face token from SecureStore (or from Expo extra in dev).
 * The token is stored securely on the device; NEVER commit it.
 */
export let HF_TOKEN = '';
export const loadHFToken = async () => {
  // Try secure store first
  const stored = await SecureStore.getItemAsync('HF_TOKEN');
  if (stored) {
    HF_TOKEN = stored;
    return;
  }
  // Fallback to Expo extra (development only)
  const extra = (Constants.manifest?.extra as any) ?? {};
  if (extra.HF_TOKEN) {
    await SecureStore.setItemAsync('HF_TOKEN', extra.HF_TOKEN);
    HF_TOKEN = extra.HF_TOKEN;
  }
};

// Auto‑load token on module import (dev env). In production the token will already be stored.
loadHFToken();
