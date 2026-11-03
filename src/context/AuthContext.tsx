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
  getSimulatedUser,
  setSimulatedUser,
} from '../services/supabaseService';
import { playRetroSound } from '../utils/audio';

interface AuthContextType {
  user: DiscordUser | null;
  role: UserRole;
  isLoading: boolean;
  isConfigured: boolean;
  config: SupabaseConfig;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  switchSimulatedRole: (role: UserRole) => void;
  updateConfig: (newConfig: Partial<SupabaseConfig>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [role, setRole] = useState<UserRole>('guest');
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<SupabaseConfig>(getSupabaseConfig());

  const isConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      setIsLoading(true);

      // Check simulated user first
      const simulated = getSimulatedUser();
      if (simulated) {
        if (mounted) {
          setUser(simulated);
          setRole(simulated.effectiveRole);
          setIsLoading(false);
        }
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        // Fallback default: Start in Student mode for smooth instant onboarding
        const defaultStudent: DiscordUser = {
          id: 'mock-student-77',
          username: 'ash_unova',
          globalName: 'Ash Ketchum',
          avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
          roles: [config.studentRoleId],
          effectiveRole: 'student',
          isSimulated: true,
        };
        if (mounted) {
          setUser(defaultStudent);
          setRole('student');
          setSimulatedUser(defaultStudent);
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
          const providerToken = session.provider_token;

          let guildRoles: string[] = [];
          if (providerToken && config.discordGuildId) {
            guildRoles = await fetchDiscordMemberRoles(providerToken, config.discordGuildId);
          }

          // If no specific roles fetched from Discord API, check user metadata or assign student
          if (guildRoles.length === 0) {
            if (meta.roles && Array.isArray(meta.roles)) {
              guildRoles = meta.roles;
            } else {
              guildRoles = [config.studentRoleId];
            }
          }

          const parsedRole = determineEffectiveRole(guildRoles, config);

          const discordUser: DiscordUser = {
            id: authUser.id,
            email: authUser.email,
            username: meta.user_name || meta.name || authUser.email?.split('@')[0] || 'DiscordTrainer',
            globalName: meta.full_name || meta.custom_claims?.global_name || meta.name,
            avatar: meta.avatar_url || meta.picture,
            avatarUrl: meta.avatar_url || meta.picture || 'https://cdn.discordapp.com/embed/avatars/1.png',
            roles: guildRoles,
            effectiveRole: parsedRole,
            isSimulated: false,
          };

          if (mounted) {
            setUser(discordUser);
            setRole(parsedRole);
          }
        }
      } catch (err) {
        console.error('Error during Supabase session retrieval:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth state changes from Supabase
    const supabase = getSupabaseClient();
    let authListener: any = null;

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session && session.user) {
          const authUser = session.user;
          const meta = authUser.user_metadata || {};
          const providerToken = session.provider_token;

          let guildRoles: string[] = [];
          if (providerToken && config.discordGuildId) {
            guildRoles = await fetchDiscordMemberRoles(providerToken, config.discordGuildId);
          }
          if (guildRoles.length === 0) {
            guildRoles = [config.studentRoleId];
          }

          const parsedRole = determineEffectiveRole(guildRoles, config);

          const discordUser: DiscordUser = {
            id: authUser.id,
            email: authUser.email,
            username: meta.user_name || meta.name || 'DiscordTrainer',
            globalName: meta.full_name || meta.name,
            avatarUrl: meta.avatar_url || meta.picture || 'https://cdn.discordapp.com/embed/avatars/2.png',
            roles: guildRoles,
            effectiveRole: parsedRole,
            isSimulated: false,
          };

          setUser(discordUser);
          setRole(parsedRole);
        } else {
          // If logged out from Supabase and not in simulated mode
          const sim = getSimulatedUser();
          if (!sim) {
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
  }, [config.supabaseUrl, config.supabaseAnonKey, config.discordGuildId]);

  const signInWithDiscord = async () => {
    playRetroSound('confirm');
    const supabase = getSupabaseClient();

    if (!supabase) {
      // If Supabase is not configured yet, notify user and switch into realistic authenticated student simulation
      const simulated: DiscordUser = {
        id: 'simulated-discord-' + Math.floor(1000 + Math.random() * 9000),
        username: 'nawawa_trainer',
        globalName: 'Nawawa Trainee',
        avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
        roles: [config.studentRoleId],
        effectiveRole: 'student',
        isSimulated: true,
      };
      setUser(simulated);
      setRole('student');
      setSimulatedUser(simulated);
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
    setSimulatedUser(null);
    setUser(null);
    setRole('guest');
  };

  const switchSimulatedRole = (newRole: UserRole) => {
    playRetroSound('confirm');
    if (newRole === 'guest') {
      setSimulatedUser(null);
      setUser(null);
      setRole('guest');
      return;
    }

    const newUser: DiscordUser = {
      id: newRole === 'admin' ? 'admin-professor-dk' : 'student-trainer-01',
      username: newRole === 'admin' ? 'prof_dk_official' : 'unova_challenger',
      globalName: newRole === 'admin' ? 'Professor DK (Faculty Head)' : 'Unova Challenger (Student)',
      avatarUrl:
        newRole === 'admin'
          ? 'https://cdn.discordapp.com/embed/avatars/3.png'
          : 'https://cdn.discordapp.com/embed/avatars/1.png',
      roles: newRole === 'admin' ? [config.adminRoleId] : [config.studentRoleId],
      effectiveRole: newRole,
      isSimulated: true,
    };

    setUser(newUser);
    setRole(newRole);
    setSimulatedUser(newUser);
  };

  const updateConfig = (newConfig: Partial<SupabaseConfig>) => {
    saveSupabaseConfig(newConfig);
    setConfig(getSupabaseConfig());
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
        switchSimulatedRole,
        updateConfig,
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
