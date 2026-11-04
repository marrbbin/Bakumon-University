import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DiscordUser, UserRole, SupabaseConfig } from '../types';
import {
  getSupabaseClient,
  getSupabaseConfig,
  saveSupabaseConfig,
} from '../services/supabaseClient';
import {
  fetchDiscordMemberRoles,
  determineEffectiveRole,
} from '../services/supabaseService';
import { playRetroSound } from '../utils/audio';

const STORAGE_KEYS = {
  PROVIDER_TOKEN: 'bakumon_discord_provider_token',
  VERIFIED_ROLE_PREFIX: 'bakumon_verified_role_',
} as const;

export const VALID_TEACHER_PASSCODES = [
  'teachers',
  'teacher',
  '1567172563585597540',
  'bakumon2026',
  'admin',
  'faculty',
  'professor',
];

interface AuthContextType {
  user: DiscordUser | null;
  role: UserRole;
  isLoading: boolean;
  isConfigured: boolean;
  config: SupabaseConfig;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  updateConfig: (newConfig: Partial<SupabaseConfig>) => void;
  verifyTeacherPasscode: (passcode: string) => boolean;
  setUserRole: (newRole: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [role, setRole] = useState<UserRole>('guest');
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<SupabaseConfig>(getSupabaseConfig());

  const roleRef = React.useRef<UserRole>('guest');
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const isConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

  // Helper to resolve role for a given user & session
  const resolveRole = async (
    userId: string,
    providerToken: string | null | undefined,
    meta: any,
    currentRole: UserRole
  ): Promise<{ resolvedRole: UserRole; roles: string[] }> => {
    // 1. Check if user already holds a persisted verified role in localStorage
    try {
      const persistedUser = localStorage.getItem(`${STORAGE_KEYS.VERIFIED_ROLE_PREFIX}${userId}`) as UserRole;
      const persistedDiscord = meta?.provider_id
        ? (localStorage.getItem(`${STORAGE_KEYS.VERIFIED_ROLE_PREFIX}${meta.provider_id}`) as UserRole)
        : null;
      const persistedSub = meta?.sub
        ? (localStorage.getItem(`${STORAGE_KEYS.VERIFIED_ROLE_PREFIX}${meta.sub}`) as UserRole)
        : null;
      const persistedGlobal = localStorage.getItem('bakumon_verified_role_global') as UserRole;

      const persisted =
        persistedUser ||
        persistedDiscord ||
        persistedSub ||
        (currentRole === 'admin' ? 'admin' : null) ||
        persistedGlobal;

      if (persisted && (persisted === 'admin' || persisted === 'student')) {
        return { resolvedRole: persisted, roles: meta?.roles || [] };
      }
    } catch {
      // Ignore localStorage read errors
    }

    // 2. Fetch roles via Discord OAuth token
    let guildRoles: string[] = [];
    const activeToken = providerToken || localStorage.getItem(STORAGE_KEYS.PROVIDER_TOKEN);

    if (activeToken && config.discordGuildId) {
      guildRoles = await fetchDiscordMemberRoles(activeToken, config.discordGuildId);
    }

    // 3. Fallback to token claims or metadata
    if (guildRoles.length === 0 && meta?.roles && Array.isArray(meta.roles)) {
      guildRoles = meta.roles;
    }

    // 4. Calculate effective role based on role IDs and names (checks '1567172563585597540' and 'Teachers')
    let parsedRole = determineEffectiveRole(guildRoles, config, meta);

    // CRITICAL: If the user was already verified as Teacher/Admin, never demote them to guest!
    if (parsedRole === 'guest' && currentRole === 'admin') {
      parsedRole = 'admin';
    }

    // If successfully resolved to teacher/admin or student, cache it in all identifiers
    if (parsedRole !== 'guest') {
      try {
        localStorage.setItem(`${STORAGE_KEYS.VERIFIED_ROLE_PREFIX}${userId}`, parsedRole);
        localStorage.setItem('bakumon_verified_role_global', parsedRole);
        if (meta?.provider_id) {
          localStorage.setItem(`${STORAGE_KEYS.VERIFIED_ROLE_PREFIX}${meta.provider_id}`, parsedRole);
        }
        if (meta?.sub) {
          localStorage.setItem(`${STORAGE_KEYS.VERIFIED_ROLE_PREFIX}${meta.sub}`, parsedRole);
        }
      } catch {
        // Ignore
      }
    }

    return { resolvedRole: parsedRole, roles: guildRoles };
  };

  // Initialize auth state directly from Supabase session
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      setIsLoading(true);

      const supabase = getSupabaseClient();
      if (!supabase) {
        if (mounted) {
          setUser(null);
          setRole('guest');
          roleRef.current = 'guest';
          setIsLoading(false);
        }
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && session.user) {
          const authUser = session.user;
          const meta = authUser.user_metadata || {};

          // Cache provider_token if provided in this session
          if (session.provider_token) {
            try {
              localStorage.setItem(STORAGE_KEYS.PROVIDER_TOKEN, session.provider_token);
            } catch {
              // Ignore
            }
          }

          const { resolvedRole, roles } = await resolveRole(
            authUser.id,
            session.provider_token,
            meta,
            roleRef.current
          );

          roleRef.current = resolvedRole;

          const roleTitle =
            resolvedRole === 'admin'
              ? 'Teacher'
              : resolvedRole === 'student'
              ? 'Student'
              : 'Guest';

          const discordUser: DiscordUser = {
            id: authUser.id,
            email: authUser.email,
            username: meta.user_name || meta.name || authUser.email?.split('@')[0] || 'DiscordTrainer',
            globalName: meta.full_name || meta.custom_claims?.global_name || meta.name,
            avatar: meta.avatar_url || meta.picture,
            avatarUrl: meta.avatar_url || meta.picture || 'https://cdn.discordapp.com/embed/avatars/0.png',
            roles,
            effectiveRole: resolvedRole,
            roleTitle,
            isSimulated: false,
          };

          if (mounted) {
            setUser(discordUser);
            setRole(resolvedRole);
          }
        } else {
          if (mounted && roleRef.current === 'guest') {
            setUser(null);
            setRole('guest');
          }
        }
      } catch (err) {
        console.error('Error during Supabase session retrieval:', err);
        if (mounted && roleRef.current === 'guest') {
          setUser(null);
          setRole('guest');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth state changes from Supabase
    const supabase = getSupabaseClient();
    let authListener: any = null;

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        // Handle explicit sign out
        if (event === 'SIGNED_OUT') {
          try {
            localStorage.removeItem(STORAGE_KEYS.PROVIDER_TOKEN);
            localStorage.removeItem('bakumon_verified_role_global');
            if (user?.id) {
              localStorage.removeItem(`${STORAGE_KEYS.VERIFIED_ROLE_PREFIX}${user.id}`);
            }
          } catch {
            // Ignore
          }
          roleRef.current = 'guest';
          setUser(null);
          setRole('guest');
          return;
        }

        if (session && session.user) {
          const authUser = session.user;
          const meta = authUser.user_metadata || {};

          if (session.provider_token) {
            try {
              localStorage.setItem(STORAGE_KEYS.PROVIDER_TOKEN, session.provider_token);
            } catch {
              // Ignore
            }
          }

          const { resolvedRole, roles } = await resolveRole(
            authUser.id,
            session.provider_token,
            meta,
            roleRef.current
          );

          roleRef.current = resolvedRole;

          const roleTitle =
            resolvedRole === 'admin'
              ? 'Teacher'
              : resolvedRole === 'student'
              ? 'Student'
              : 'Guest';

          const discordUser: DiscordUser = {
            id: authUser.id,
            email: authUser.email,
            username: meta.user_name || meta.name || 'DiscordTrainer',
            globalName: meta.full_name || meta.name,
            avatarUrl: meta.avatar_url || meta.picture || 'https://cdn.discordapp.com/embed/avatars/0.png',
            roles,
            effectiveRole: resolvedRole,
            roleTitle,
            isSimulated: false,
          };

          setUser(discordUser);
          setRole(resolvedRole);
        } else if (event !== 'INITIAL_SESSION') {
          // Only clear if not in the initial token parsing window
          if (roleRef.current === 'guest') {
            setUser(null);
            setRole('guest');
          }
        }
      });
      authListener = data.subscription;
    }

    return () => {
      mounted = false;
      if (authListener) authListener.unsubscribe();
    };
  }, [config.supabaseUrl, config.supabaseAnonKey, config.discordGuildId, config.adminRoleId, config.studentRoleId]);

  const signInWithDiscord = async () => {
    playRetroSound('confirm');
    const supabase = getSupabaseClient();

    if (!supabase) {
      alert(
        'Supabase & Discord OAuth are not yet configured!\n\nPlease click "⚡ Supabase" in the navbar to configure your connection.'
      );
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          scopes: 'identify email guilds guilds.members.read',
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('Supabase Discord OAuth error:', error);
        alert(`Discord Authentication error: ${error.message}`);
      }
    } catch (err) {
      console.error('Failed to trigger Discord OAuth:', err);
    }
  };

  const signOut = async () => {
    playRetroSound('select');
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Clean up stored session tokens
    try {
      localStorage.removeItem(STORAGE_KEYS.PROVIDER_TOKEN);
      localStorage.removeItem('bakumon_verified_role_global');
      if (user?.id) {
        localStorage.removeItem(`${STORAGE_KEYS.VERIFIED_ROLE_PREFIX}${user.id}`);
      }
    } catch {
      // Ignore
    }
    roleRef.current = 'guest';
    setUser(null);
    setRole('guest');
  };

  const updateConfig = (newConfig: Partial<SupabaseConfig>) => {
    saveSupabaseConfig(newConfig);
    setConfig(getSupabaseConfig());
  };

  // Verify Teacher Passcode / Key (e.g. 'teachers', '1567172563585597540', 'bakumon2026')
  const verifyTeacherPasscode = (passcode: string): boolean => {
    const clean = passcode.trim().toLowerCase();
    const validKeys = [
      ...VALID_TEACHER_PASSCODES,
      config.adminRoleId?.toLowerCase(),
      config.teacherRoleId?.toLowerCase(),
    ].filter(Boolean);

    if (validKeys.includes(clean)) {
      playRetroSound('confirm');
      roleRef.current = 'admin';
      setRole('admin');
      try {
        localStorage.setItem('bakumon_verified_role_global', 'admin');
        if (user?.id) {
          localStorage.setItem(`${STORAGE_KEYS.VERIFIED_ROLE_PREFIX}${user.id}`, 'admin');
        }
      } catch {
        // Ignore
      }

      if (user) {
        const updated: DiscordUser = {
          ...user,
          effectiveRole: 'admin',
          roleTitle: 'Teacher',
        };
        setUser(updated);
      }
      return true;
    }

    playRetroSound('error');
    return false;
  };

  const setUserRole = (newRole: UserRole) => {
    roleRef.current = newRole;
    setRole(newRole);
    try {
      if (newRole !== 'guest') {
        localStorage.setItem('bakumon_verified_role_global', newRole);
      } else {
        localStorage.removeItem('bakumon_verified_role_global');
      }
      if (user?.id) {
        localStorage.setItem(`${STORAGE_KEYS.VERIFIED_ROLE_PREFIX}${user.id}`, newRole);
      }
    } catch {
      // Ignore
    }
    if (user) {
      const updated: DiscordUser = {
        ...user,
        effectiveRole: newRole,
        roleTitle: newRole === 'admin' ? 'Teacher' : newRole === 'student' ? 'Student' : 'Guest',
      };
      setUser(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        isConfigured,
        config,
        signInWithDiscord,
        signOut,
        updateConfig,
        verifyTeacherPasscode,
        setUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
