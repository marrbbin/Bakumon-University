import { Enrollee, ExperienceLevel, UserRole, DiscordUser } from '../types';
import { getSupabaseClient, getSupabaseConfig } from './supabaseClient';
import {
  DEFAULT_INITIAL_STUDENTS,
  getLocalEnrolleesStore,
  saveLocalEnrolleesStore,
  addLocalEnrollee,
  removeLocalEnrollee,
  findLocalEnrolleeByUserId,
} from '../store';

// Re-export for compatibility
export { DEFAULT_INITIAL_STUDENTS };
export const getLocalEnrollees = getLocalEnrolleesStore;
export const saveLocalEnrollees = saveLocalEnrolleesStore;

/**
 * Fetch all enrollees (SELECT * FROM enrollees)
 */
export const fetchEnrollees = async (): Promise<{
  data: Enrollee[];
  source: 'supabase' | 'local_storage';
  error?: string;
}> => {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('enrollees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase SELECT error, falling back to local:', error.message);
        return {
          data: getLocalEnrollees(),
          source: 'local_storage',
          error: error.message,
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

  // Fallback to local storage
  const localList = getLocalEnrollees();
  const existing = localList.find((e) => e.userId === userId);
  return { enrolled: !!existing, enrollee: existing };
};

/**
 * INSERT a single data payload into Supabase
 */
export const insertEnrollee = async (payload: {
  name: string;
  discordHandle: string;
  experienceLevel: ExperienceLevel | string;
  mcUsername?: string;
  notes?: string;
  userId: string;
  avatarUrl?: string;
}): Promise<{ success: boolean; data?: Enrollee; error?: string }> => {
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
        console.warn('Supabase INSERT error, falling back to local:', error.message);
        // Continue to save locally as fallback
      } else if (data) {
        return { success: true, data: newEnrollee };
      }
    } catch (err: any) {
      console.warn('Error during Supabase insert:', err);
    }
  }

  // Save to local fallback store
  const localList = getLocalEnrollees();
  saveLocalEnrollees([newEnrollee, ...localList]);
  return { success: true, data: newEnrollee };
};

/**
 * DELETE an enrollee by ID (Admin Role only)
 */
export const deleteEnrollee = async (id: string): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { error } = await supabase.from('enrollees').delete().eq('id', id);
      if (error) {
        console.warn('Supabase DELETE error:', error.message);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.warn('Failed to delete on Supabase:', err);
    }
  }

  // Also update local store
  const localList = getLocalEnrollees();
  const updated = localList.filter((item) => item.id !== id);
  saveLocalEnrollees(updated);
  return { success: true };
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
