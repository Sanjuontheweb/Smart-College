import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_PREFIX = 'sc_survive_college_';

/**
 * Hardware-backed secure storage using Android Keystore / iOS Keychain.
 * Falls back safely on web environments.
 */
export const SecureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(`${KEY_PREFIX}${key}`, value);
        return;
      }
      await SecureStore.setItemAsync(`${KEY_PREFIX}${key}`, value);
    } catch (e) {
      console.warn(`[SecureStorage] Error saving ${key}:`, e);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(`${KEY_PREFIX}${key}`);
      }
      return await SecureStore.getItemAsync(`${KEY_PREFIX}${key}`);
    } catch (e) {
      console.warn(`[SecureStorage] Error reading ${key}:`, e);
      return null;
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(`${KEY_PREFIX}${key}`);
        return;
      }
      await SecureStore.deleteItemAsync(`${KEY_PREFIX}${key}`);
    } catch (e) {
      console.warn(`[SecureStorage] Error deleting ${key}:`, e);
    }
  },

  /**
   * Lightweight obfuscation layer for non-sensitive local JSON backups.
   * Prevents raw plaintext exposure if app storage is inspected.
   */
  obfuscate(text: string): string {
    try {
      return btoa(encodeURIComponent(text));
    } catch {
      return text;
    }
  },

  deobfuscate(encoded: string): string {
    try {
      return decodeURIComponent(atob(encoded));
    } catch {
      return encoded;
    }
  },
};

export default SecureStorage;
