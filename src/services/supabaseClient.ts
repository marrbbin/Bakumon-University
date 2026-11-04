import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

import {
  DEFAULT_SUPABASE_CONFIG,
  loadConfigFromStore,
  persistConfigToStore,
} from '../store';

// Retrieve config with automatic defaults for Vercel and local dev
export const getSupabaseConfig = (): SupabaseConfig => {
  return loadConfigFromStore();
};

export const saveSupabaseConfig = (config: Partial<SupabaseConfig>) => {
  persistConfigToStore(config);
  // Reset the client instance so next call recreates it
  _client = null;
};

let _client: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (_client) return _client;

  const config = getSupabaseConfig();
  if (config.supabaseUrl && config.supabaseAnonKey) {
    try {
      _client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return _client;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return null;
};
