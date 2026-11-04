import { SupabaseConfig } from '../types';

/**
 * BAKUMON UNIVERSITY - PRODUCTION & VERCEL DEFAULT CONFIGURATION STORE
 * 
 * These credentials are baked directly into the build so the app functions
 * automatically out of the box when deployed to Vercel or any hosting provider,
 * even if environment variables are not manually configured in the host dashboard.
 * 
 * Users can also view or manually adjust these values right here.
 */
export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  supabaseUrl: 'https://awcbsdwbzzisyqqzdmgp.supabase.co',
  supabaseAnonKey: 'sb_publishable_z8jMZ_ArJWBp1TURIkeEhg_b5RiVhLr',
  discordGuildId: '1560226393181130805',
  studentRoleId: '1567172479808700536',
  adminRoleId: '1567172563585597540',
};

export const CONFIG_STORAGE_KEYS = {
  URL: 'bakumon_supabase_url',
  ANON_KEY: 'bakumon_supabase_anon_key',
  GUILD_ID: 'bakumon_discord_guild_id',
  STUDENT_ROLE: 'bakumon_student_role_id',
  ADMIN_ROLE: 'bakumon_admin_role_id',
} as const;

// Legacy placeholders that should be automatically upgraded to real production defaults
const OUTDATED_PLACEHOLDERS = new Set([
  '123456789012345678',
  'student-role-101',
  'admin-role-professor-dk',
  '',
]);

/**
 * Read active config with cascade:
 * 1. User manual override from localStorage (if valid & not legacy dummy placeholder)
 * 2. Vite environment variables (VITE_*)
 * 3. Default production store values (Vercel-ready)
 */
export const loadConfigFromStore = (): SupabaseConfig => {
  const readStoredOrEnv = (key: string, envVal: string | undefined, defaultVal: string): string => {
    try {
      const stored = localStorage.getItem(key);
      if (stored && !OUTDATED_PLACEHOLDERS.has(stored.trim())) {
        return stored.trim();
      }
    } catch {
      // Ignore localStorage access errors (e.g. private browsing mode)
    }

    if (envVal && !OUTDATED_PLACEHOLDERS.has(envVal.trim())) {
      return envVal.trim();
    }

    return defaultVal;
  };

  return {
    supabaseUrl: readStoredOrEnv(
      CONFIG_STORAGE_KEYS.URL,
      import.meta.env.VITE_SUPABASE_URL,
      DEFAULT_SUPABASE_CONFIG.supabaseUrl
    ),
    supabaseAnonKey: readStoredOrEnv(
      CONFIG_STORAGE_KEYS.ANON_KEY,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      DEFAULT_SUPABASE_CONFIG.supabaseAnonKey
    ),
    discordGuildId: readStoredOrEnv(
      CONFIG_STORAGE_KEYS.GUILD_ID,
      import.meta.env.VITE_DISCORD_GUILD_ID,
      DEFAULT_SUPABASE_CONFIG.discordGuildId
    ),
    studentRoleId: readStoredOrEnv(
      CONFIG_STORAGE_KEYS.STUDENT_ROLE,
      import.meta.env.VITE_STUDENT_ROLE_ID,
      DEFAULT_SUPABASE_CONFIG.studentRoleId
    ),
    adminRoleId: readStoredOrEnv(
      CONFIG_STORAGE_KEYS.ADMIN_ROLE,
      import.meta.env.VITE_ADMIN_ROLE_ID,
      DEFAULT_SUPABASE_CONFIG.adminRoleId
    ),
  };
};

/**
 * Persist manual config overrides to localStorage
 */
export const persistConfigToStore = (partialConfig: Partial<SupabaseConfig>): void => {
  try {
    if (partialConfig.supabaseUrl !== undefined) {
      localStorage.setItem(CONFIG_STORAGE_KEYS.URL, partialConfig.supabaseUrl.trim());
    }
    if (partialConfig.supabaseAnonKey !== undefined) {
      localStorage.setItem(CONFIG_STORAGE_KEYS.ANON_KEY, partialConfig.supabaseAnonKey.trim());
    }
    if (partialConfig.discordGuildId !== undefined) {
      localStorage.setItem(CONFIG_STORAGE_KEYS.GUILD_ID, partialConfig.discordGuildId.trim());
    }
    if (partialConfig.studentRoleId !== undefined) {
      localStorage.setItem(CONFIG_STORAGE_KEYS.STUDENT_ROLE, partialConfig.studentRoleId.trim());
    }
    if (partialConfig.adminRoleId !== undefined) {
      localStorage.setItem(CONFIG_STORAGE_KEYS.ADMIN_ROLE, partialConfig.adminRoleId.trim());
    }
  } catch (err) {
    console.error('Failed to persist config to localStorage:', err);
  }
};

/**
 * Reset config back to default Bakumon University store values
 */
export const resetConfigToDefaults = (): void => {
  try {
    Object.values(CONFIG_STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.error('Failed to reset config store:', err);
  }
};
