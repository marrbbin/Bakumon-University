import { Enrollee, ExperienceLevel, UserRole, DiscordUser, SubjectType } from '../types';
import { getSupabaseClient, getSupabaseConfig } from './supabaseClient';
import {
  DEFAULT_INITIAL_STUDENTS,
  getLocalEnrolleesStore,
  saveLocalEnrolleesStore,
  addLocalEnrollee,
  removeLocalEnrollee,
  removeLocalEnrolleeByUserId,
  clearAllLocalEnrollees,
  resetToDefaultLocalEnrollees,
  findLocalEnrolleeByUserId,
} from '../store';

/**
 * Clean any internal major tags stored inside notes if legacy table without 'majors' column was used
 */
export const cleanNotesText = (notes?: string): string => {
  if (!notes) return '';
  return notes
    .replace(/\|\s*\[MAJORS:\s*[^\]]+\]/gi, '')
    .replace(/\[MAJORS:\s*[^\]]+\]/gi, '')
    .trim();
};

/**
 * Resilient parser for majors from Postgres text[], PostgreSQL literal strings (e.g. '{"Breeding","Brewing"}'),
 * JSON arrays, comma-separated strings, notes fallback metadata, or cached local enrollees.
 */
export const parseMajorsList = (
  val: any,
  notesFallback?: string,
  cachedFallback?: SubjectType[]
): SubjectType[] => {
  const VALID_MAJORS: SubjectType[] = ['Battling', 'Breeding', 'Brewing', 'Berry Farming'];

  const sanitizeItem = (item: any): SubjectType | null => {
    if (!item) return null;
    const str = String(item).replace(/[{"}\\[\]]/g, '').trim();
    const found = VALID_MAJORS.find((m) => m.toLowerCase() === str.toLowerCase());
    return found || null;
  };

  // 1. Direct array
  if (Array.isArray(val) && val.length > 0) {
    const list = val.map(sanitizeItem).filter((m): m is SubjectType => m !== null);
    if (list.length > 0) return Array.from(new Set(list));
  }

  // 2. String representation (Postgres array "{Breeding,Brewing}", JSON, comma-separated)
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const list = parsed.map(sanitizeItem).filter((m): m is SubjectType => m !== null);
        if (list.length > 0) return Array.from(new Set(list));
      }
    } catch {
      // not JSON
    }
    // Clean PostgreSQL array curly braces and quotes
    const cleanedStr = val.replace(/^[{\[\s"]+|[}\]\s"]+$/g, '');
    const tokens = cleanedStr
      .split(/[,\n|]+/)
      .map(sanitizeItem)
      .filter((m): m is SubjectType => m !== null);
    if (tokens.length > 0) return Array.from(new Set(tokens));
  }

  // 3. Check if encoded in notes fallback (e.g. "[MAJORS: Breeding, Brewing]")
  if (typeof notesFallback === 'string') {
    const match =
      notesFallback.match(/\[MAJORS:\s*([^\]]+)\]/i) ||
      notesFallback.match(/Majors:\s*([^\n|]+)/i);
    if (match && match[1]) {
      const extracted = match[1]
        .split(',')
        .map(sanitizeItem)
        .filter((m): m is SubjectType => m !== null);
      if (extracted.length > 0) return Array.from(new Set(extracted));
    }
  }

  // 4. Cached fallback if available
  if (cachedFallback && Array.isArray(cachedFallback) && cachedFallback.length > 0) {
    const valid = cachedFallback.map(sanitizeItem).filter((m): m is SubjectType => m !== null);
    if (valid.length > 0) return Array.from(new Set(valid));
  }

  return ['Battling'];
};



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
          majors: parseMajorsList(row.majors, row.notes),
          timestamp: row.created_at ? new Date(row.created_at).toLocaleString() : row.timestamp || new Date().toLocaleString(),
          status: row.status || 'Enrolled',
          notes: cleanNotesText(row.notes),
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
 * Check if a user has already submitted an enrollment (prevent duplicate submissions).
 * Properly honors deletions in Supabase: if Supabase returns 0 records, local cache is pruned
 * and { enrolled: false } is returned so the student can re-enroll.
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

      if (!error) {
        if (data) {
          const existingLocal = findLocalEnrolleeByUserId(userId);
          const resolvedMajors = parseMajorsList(data.majors, data.notes, existingLocal?.majors);

          const enrollee: Enrollee = {
            id: data.id,
            name: data.name,
            mcUsername: data.mc_username,
            handle: data.discord_handle,
            experienceLevel: data.experience_level,
            majors: resolvedMajors,
            timestamp: new Date(data.created_at || Date.now()).toLocaleString(),
            status: data.status,
            notes: cleanNotesText(data.notes),
            userId: data.user_id,
            avatarUrl: data.avatar_url,
          };
          addLocalEnrollee(enrollee);
          return {
            enrolled: true,
            enrollee,
          };
        } else {
          // Explicit confirmation from Supabase: record was deleted or does not exist!
          removeLocalEnrolleeByUserId(userId);
          return { enrolled: false };
        }
      }

      // If table is missing, log warning
      const isTableMissing =
        error.code === 'PGRST205' ||
        error.message?.includes('Could not find the table') ||
        error.message?.includes('does not exist');

      if (!isTableMissing) {
        console.warn('Supabase check enrollment warning:', error.message);
      }
    } catch (err) {
      console.warn('Error checking existing enrollment in Supabase:', err);
    }
  }

  // Fallback to local storage store ONLY if Supabase is offline or not configured
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
  majors?: SubjectType[];
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

  const chosenMajors: SubjectType[] =
    payload.majors && payload.majors.length > 0 ? payload.majors : ['Battling'];

  const newEnrollee: Enrollee = {
    id: generatedId,
    name: payload.name.trim(),
    handle: payload.discordHandle.startsWith('@') ? payload.discordHandle : `@${payload.discordHandle}`,
    experienceLevel: payload.experienceLevel,
    majors: chosenMajors,
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
      const insertRecord: Record<string, any> = {
        id: generatedId,
        user_id: payload.userId,
        name: payload.name.trim(),
        discord_handle: newEnrollee.handle,
        experience_level: payload.experienceLevel,
        majors: chosenMajors,
        mc_username: newEnrollee.mcUsername,
        notes: payload.notes || '',
        status: 'Enrolled',
        avatar_url: payload.avatarUrl || null,
      };

      let { data, error } = await supabase
        .from('enrollees')
        .insert([insertRecord])
        .select()
        .single();

      // If error is specifically that the "majors" column does not exist on legacy tables, retry with majors embedded in notes
      if (error && (error.message?.includes('column "majors"') || error.message?.includes("'majors' column"))) {
        console.warn('Notice: majors column not yet created in Supabase schema. Preserving majors in notes metadata...');
        delete insertRecord.majors;
        const majorsTag = `[MAJORS: ${chosenMajors.join(', ')}]`;
        insertRecord.notes = payload.notes?.trim()
          ? `${payload.notes.trim()} | ${majorsTag}`
          : majorsTag;

        const retryResult = await supabase
          .from('enrollees')
          .insert([insertRecord])
          .select()
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

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

  // Broadcast event so StudentTerminal and other components immediately update
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bakumon_enrollees_updated'));
  }

  return { success: true, warning: supabaseWarning };
};

/**
 * DELETE an enrollee by userId (for withdraw/re-enroll from Student Terminal)
 */
export const deleteEnrolleeByUserId = async (
  userId: string
): Promise<{ success: boolean; warning?: string }> => {
  const supabase = getSupabaseClient();
  let supabaseWarning: string | undefined;

  if (supabase) {
    try {
      const { error } = await supabase.from('enrollees').delete().eq('user_id', userId);
      if (error) {
        supabaseWarning = error.message;
      }
    } catch (err: any) {
      supabaseWarning = err?.message;
    }
  }

  removeLocalEnrolleeByUserId(userId);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bakumon_enrollees_updated'));
  }

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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bakumon_enrollees_updated'));
  }

  return { success: true, warning: supabaseWarning };
};

/**
 * Reset roster back to initial curriculum sample students
 */
export const resetAllEnrolleesToDefault = async (): Promise<Enrollee[]> => {
  return resetToDefaultLocalEnrollees();
};

/**
 * Fetch Discord member roles using Discord OAuth provider_token.
 * Automatically caches successfully retrieved roles so that subsequent
 * auth token refresh events or Discord API rate-limiting don't wipe out the user's role.
 */
export const fetchDiscordMemberRoles = async (
  providerToken: string,
  guildId: string
): Promise<string[]> => {
  const CACHE_KEY = `bakumon_cached_discord_roles_${guildId}`;

  if (!providerToken || !guildId) {
    // Check if we have cached roles from this session
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    });

    if (!res.ok) {
      console.warn('Discord API returned status:', res.status, res.statusText);
      // Fall back to cached roles if available
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // Ignore
      }
      return [];
    }

    const data = await res.json();
    const roles: string[] = Array.isArray(data.roles) ? data.roles : [];

    if (roles.length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(roles));
      } catch {
        // Ignore
      }
    }

    return roles;
  } catch (err) {
    console.error('Failed to fetch Discord guild member roles:', err);
    // Fall back to cached roles on network failure
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  }
};

/**
 * Determine effective role (Teacher/Admin, Student, Guest) from Discord member role IDs.
 * Note: The Teacher role in the Discord server is strictly verified via Role ID:
 * 1567172563585597540, which grants the Teacher/Faculty administrative clearance ('admin').
 *
 * Enforces strict Snowflake ID matching so student testers are NEVER elevated to Teacher.
 */
export const determineEffectiveRole = (
  roleIds: string[],
  config = getSupabaseConfig()
): UserRole => {
  if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) return 'guest';

  const cleanRoleIds = roleIds.map((id) => String(id).trim());

  // 1. Strict Teacher Role Check: Must explicitly hold the Teachers Discord Snowflake ID
  const teacherRoleIds = [
    '1567172563585597540',
    config.adminRoleId,
    config.teacherRoleId,
  ].filter(Boolean) as string[];

  const isTeacher = teacherRoleIds.some((targetId) => cleanRoleIds.includes(targetId));
  if (isTeacher) {
    return 'admin'; // Grants Teacher/Faculty administrative clearance
  }

  // 2. Student Role Check: Holds the Student Discord Snowflake ID
  const studentRoleIds = [
    '1567172479808700536',
    config.studentRoleId,
  ].filter(Boolean) as string[];

  const isStudent = studentRoleIds.some((targetId) => cleanRoleIds.includes(targetId));
  if (isStudent) {
    return 'student';
  }

  return 'guest';
};

