import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '@/constants/Config';

const isValidSupabaseConfig = 
  CONFIG.supabaseUrl && 
  CONFIG.supabaseUrl.startsWith('https://') && 
  !CONFIG.supabaseUrl.includes('your-project') &&
  CONFIG.supabaseAnonKey && 
  !CONFIG.supabaseAnonKey.includes('your-anon-key');

export const isLiveSupabaseAvailable = Boolean(isValidSupabaseConfig);

export const supabase = createClient(
  CONFIG.supabaseUrl,
  CONFIG.supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
