import { Enrollee, ExperienceLevel, UserRole, DiscordUser } from '../types';
import { getSupabaseClient, getSupabaseConfig } from './supabaseClient';
import {
  DEFAULT_INITIAL_STUDENTS,
  getLocalEnrolleesStore,
  saveLocalEnrolleesStore,
  addLocalEnrollee,
  removeLocalEnrollee,
  clearAllLocalEnrollees,
  resetToDefaultLocalEnrollees,
  findLocalEnrolleeByUserId,
} from '../store';

// Re-export for compatibility
export { DEFAULT_INITIAL_STUDENTS };
export const getLocalEnrollees = getLocalEnrolleesStore;
export const saveLocalEnrollees = saveLocalEnrolleesStore;

export interface SupabaseHealth {
  connected: boolean;
  tableExists: boolean;
  message?: string;
  code?: string;
}

/**
 * Health check to verify whether Supabase client connects and the 'enrollees' table exists
 */
export const checkSupabaseHealth = async (): Promise<SupabaseHealth> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      connected: false,
      tableExists: false,
      message: 'Supabase client is not configured.',
    };
  }

  try {
    const { data, error } = await supabase.from('enrollees').select('id').limit(1);
    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.message?.includes('Could not find the table') ||
        error.message?.includes('relation "enrollees" does not exist') ||
        error.message?.includes('relation "public.enrollees" does not exist')
      ) {
        return {
          connected: true,
          tableExists: false,
          code: error.code,
          message: "Table 'public.enrollees' not found in Supabase schema cache. Run the SQL table creation script.",
        };
      }

      return {
        connected: false,
        tableExists: false,
        code: error.code,
        message: error.message,
      };
    }

    return {
      connected: true,
      tableExists: true,
      message: "Supabase table 'public.enrollees' is active and reachable.",
    };
  } catch (err: any) {
    return {
      connected: false,
      tableExists: false,
      message: err?.message || 'Network exception while connecting to Supabase.',
    };
  }
};

/**
 * Fetch all enrollees (SELECT * FROM enrollees)
 */
export const fetchEnrollees = async (): Promise<{
  data: Enrollee[];
  source: 'supabase' | 'local_storage';
  error?: string;
  tableMissing?: boolean;
}> => {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('enrollees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const isTableMissing =
          error.code === 'PGRST205' ||
          error.message?.includes('Could not find the table') ||
          error.message?.includes('does not exist');

        console.warn('Supabase SELECT notice:', error.message);
        return {
          data: getLocalEnrollees(),
          source: 'local_storage',
          error: error.message,
          tableMissing: isTableMissing,
        };
      }

      if (data) {
        // Map postgres column names to Enrollee interface
        const mapped: Enrollee[] = data.map((row: any) => ({
          id: row.id || `BKU-${row.id_number || Math.floor(Math.random() * 9000 + 1000)}`,
          name: row.name || 'Unnamed Trainer',
          mcUsername: row.mc_username || row.mcUsername,
          handle: row.discord_handle || row.handle || '@trainer',
          experienceLevel: row.experience_level || row.experienceLevel || 'Beginner (Fresh out of Nuvema)',
          timestamp: row.created_at ? new Date(row.created_at).toLocaleString() : row.timestamp || new Date().toLocaleString(),
          status: row.status || 'Enrolled',
          notes: row.notes || '',
          userId: row.user_id || row.userId,
          avatarUrl: row.avatar_url,
        }));
        return { data: mapped, source: 'supabase' };
      }
    } catch (err: any) {
      console.warn('Error fetching from Supabase:', err);
    }
  }

  return {
    data: getLocalEnrollees(),
    source: 'local_storage',
  };
};

/**
 * Check if a user has already submitted an enrollment (prevent duplicate submissions)
 */
export const checkUserAlreadyEnrolled = async (
  userId: string
): Promise<{ enrolled: boolean; enrollee?: Enrollee }> => {
  if (!userId) return { enrolled: false };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('enrollees')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          enrolled: true,
          enrollee: {
            id: data.id,
            name: data.name,
            mcUsername: data.mc_username,
            handle: data.discord_handle,
            experienceLevel: data.experience_level,
            timestamp: new Date(data.created_at || Date.now()).toLocaleString(),
            status: data.status,
            notes: data.notes,
            userId: data.user_id,
          },
        };
      }
    } catch (err) {
      console.warn('Error checking existing enrollment in Supabase:', err);
    }
  }

  // Fallback to local storage store
  const existing = findLocalEnrolleeByUserId(userId);
  return { enrolled: !!existing, enrollee: existing };
};

/**
 * INSERT a single data payload into Supabase & store
 * Explicitly surfaces Supabase database failures instead of masking them.
 */
export const insertEnrollee = async (payload: {
  name: string;
  discordHandle: string;
  experienceLevel: ExperienceLevel | string;
  mcUsername?: string;
  notes?: string;
  userId: string;
  avatarUrl?: string;
}): Promise<{
  success: boolean;
  data?: Enrollee;
  error?: string;
  tableMissing?: boolean;
  savedToSupabase?: boolean;
}> => {
  // Prevent duplicate submission check
  const duplicateCheck = await checkUserAlreadyEnrolled(payload.userId);
  if (duplicateCheck.enrolled) {
    return {
      success: false,
      error: `Trainer profile already registered with Student ID ${duplicateCheck.enrollee?.id}. Duplicate submissions are restricted.`,
    };
  }

  const generatedId = `BKU-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toLocaleString();

  const newEnrollee: Enrollee = {
    id: generatedId,
    name: payload.name.trim(),
    handle: payload.discordHandle.startsWith('@') ? payload.discordHandle : `@${payload.discordHandle}`,
    experienceLevel: payload.experienceLevel,
    mcUsername: payload.mcUsername?.trim() || payload.name.trim(),
    notes: payload.notes?.trim() || '',
    timestamp: now,
    status: 'Enrolled',
    userId: payload.userId,
    avatarUrl: payload.avatarUrl,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('enrollees')
        .insert([
          {
            id: generatedId,
            user_id: payload.userId,
            name: payload.name.trim(),
            discord_handle: newEnrollee.handle,
            experience_level: payload.experienceLevel,
            mc_username: newEnrollee.mcUsername,
            notes: payload.notes || '',
            status: 'Enrolled',
            avatar_url: payload.avatarUrl || null,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase INSERT failed:', error);
        // Also save to local store as a safety fallback
        addLocalEnrollee(newEnrollee);

        const isTableMissing =
          error.code === 'PGRST205' ||
          error.message?.includes('Could not find the table') ||
          error.message?.includes('does not exist');

        if (isTableMissing) {
          return {
            success: false,
            tableMissing: true,
            error: "The table 'public.enrollees' does not exist in your Supabase project (awcbsdwbzzisyqqzdmgp). Please run the SQL setup script in your Supabase SQL Editor so submissions can be stored.",
          };
        }

        return {
          success: false,
          error: `Supabase INSERT error (${error.code || 'FAIL'}): ${error.message}`,
        };
      }

      if (data) {
        // Successfully written to Supabase!
        addLocalEnrollee(newEnrollee);
        return {
          success: true,
          data: newEnrollee,
          savedToSupabase: true,
        };
      }
    } catch (err: any) {
      console.error('Error during Supabase insert:', err);
      addLocalEnrollee(newEnrollee);
      return {
        success: false,
        error: `Supabase Network Exception: ${err?.message || 'Failed to reach Supabase'}`,
      };
    }
  }

  // Supabase not configured: local store only
  addLocalEnrollee(newEnrollee);
  return {
    success: true,
    data: newEnrollee,
    savedToSupabase: false,
  };
};

/**
 * DELETE an enrollee by ID (Admin Role only)
 */
export const deleteEnrollee = async (
  id: string
): Promise<{ success: boolean; warning?: string; error?: string }> => {
  const supabase = getSupabaseClient();
  let supabaseWarning: string | undefined;

  if (supabase) {
    try {
      const { error } = await supabase.from('enrollees').delete().eq('id', id);
      if (error) {
        if (
          error.code === 'PGRST205' ||
          error.message?.includes('Could not find the table') ||
          error.message?.includes('does not exist')
        ) {
          supabaseWarning = "Table 'enrollees' not found in Supabase. Deleted from local cache.";
        } else {
          console.warn('Supabase DELETE warning:', error.message);
          supabaseWarning = error.message;
        }
      }
    } catch (err: any) {
      console.warn('Failed to delete on Supabase:', err);
      supabaseWarning = err?.message || 'Network exception';
    }
  }

  // Always remove from local store so UI synchronizes
  removeLocalEnrollee(id);
  return { success: true, warning: supabaseWarning };
};

/**
 * DELETE ALL enrollees (Wipe / Reset entire student registry)
 */
export const clearAllEnrollees = async (): Promise<{ success: boolean; warning?: string }> => {
  const supabase = getSupabaseClient();
  let supabaseWarning: string | undefined;

  if (supabase) {
    try {
      const { error } = await supabase.from('enrollees').delete().neq('id', '');
      if (error) {
        console.warn('Supabase delete all warning:', error.message);
        supabaseWarning = error.message;
      }
    } catch (err: any) {
      console.warn('Supabase delete all exception:', err);
      supabaseWarning = err?.message;
    }
  }

  clearAllLocalEnrollees();
  return { success: true, warning: supabaseWarning };
};

/**
 * Reset roster back to initial curriculum sample students
 */
export const resetAllEnrolleesToDefault = async (): Promise<Enrollee[]> => {
  return resetToDefaultLocalEnrollees();
};

/**
 * Fetch Discord member roles using Discord OAuth provider_token
 */
export const fetchDiscordMemberRoles = async (
  providerToken: string,
  guildId: string
): Promise<string[]> => {
  if (!providerToken || !guildId) return [];

  try {
    const res = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    });

    if (!res.ok) {
      console.warn('Discord API returned status:', res.status);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data.roles) ? data.roles : [];
  } catch (err) {
    console.error('Failed to fetch Discord guild member roles:', err);
    return [];
  }
};

/**
 * Determine effective role (Admin, Student, Guest) from Discord roles list
 */
export const determineEffectiveRole = (
  roleIds: string[],
  config = getSupabaseConfig()
): UserRole => {
  if (!roleIds || roleIds.length === 0) return 'guest';

  // Check if user has Discord Admin role
  if (config.adminRoleId && roleIds.includes(config.adminRoleId)) {
    return 'admin';
  }

  // Check if user has Discord Student role
  if (config.studentRoleId && roleIds.includes(config.studentRoleId)) {
    return 'student';
  }

  // If authenticated on Discord but lacking the server role, they remain a guest
  return 'guest';
};
