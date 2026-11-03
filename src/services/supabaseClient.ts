import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

const STORAGE_KEYS = {
  URL: 'bakumon_supabase_url',
  ANON_KEY: 'bakumon_supabase_anon_key',
  GUILD_ID: 'bakumon_discord_guild_id',
  STUDENT_ROLE: 'bakumon_student_role_id',
  ADMIN_ROLE: 'bakumon_admin_role_id',
};

// Retrieve config from localStorage or Vite environment variables
export const getSupabaseConfig = (): SupabaseConfig => {
  return {
    supabaseUrl:
      localStorage.getItem(STORAGE_KEYS.URL) ||
      (import.meta.env.VITE_SUPABASE_URL as string) ||
      '',
    supabaseAnonKey:
      localStorage.getItem(STORAGE_KEYS.ANON_KEY) ||
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
      '',
    discordGuildId:
      localStorage.getItem(STORAGE_KEYS.GUILD_ID) ||
      (import.meta.env.VITE_DISCORD_GUILD_ID as string) ||
      '123456789012345678', // Default Bakumon University Guild ID
    studentRoleId:
      localStorage.getItem(STORAGE_KEYS.STUDENT_ROLE) ||
      (import.meta.env.VITE_STUDENT_ROLE_ID as string) ||
      'student-role-101',
    adminRoleId:
      localStorage.getItem(STORAGE_KEYS.ADMIN_ROLE) ||
      (import.meta.env.VITE_ADMIN_ROLE_ID as string) ||
      'admin-role-professor-dk',
  };
};

export const saveSupabaseConfig = (config: Partial<SupabaseConfig>) => {
  if (config.supabaseUrl !== undefined) localStorage.setItem(STORAGE_KEYS.URL, config.supabaseUrl);
  if (config.supabaseAnonKey !== undefined) localStorage.setItem(STORAGE_KEYS.ANON_KEY, config.supabaseAnonKey);
  if (config.discordGuildId !== undefined) localStorage.setItem(STORAGE_KEYS.GUILD_ID, config.discordGuildId);
  if (config.studentRoleId !== undefined) localStorage.setItem(STORAGE_KEYS.STUDENT_ROLE, config.studentRoleId);
  if (config.adminRoleId !== undefined) localStorage.setItem(STORAGE_KEYS.ADMIN_ROLE, config.adminRoleId);

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
