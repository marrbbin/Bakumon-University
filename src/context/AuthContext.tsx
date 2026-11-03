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

interface AuthContextType {
  user: DiscordUser | null;
  role: UserRole;
  isLoading: boolean;
  isConfigured: boolean;
  config: SupabaseConfig;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  updateConfig: (newConfig: Partial<SupabaseConfig>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // STRICT SECURITY DEFAULT: Every visitor begins as an unauthenticated 'guest'
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [role, setRole] = useState<UserRole>('guest');
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<SupabaseConfig>(getSupabaseConfig());

  const isConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

  // Initialize auth state directly from Supabase session
  useEffect(() => {
    let mounted = true;

    // Purge any lingering simulated session keys from previous iterations
    localStorage.removeItem('bakumon_simulated_user');

    const initAuth = async () => {
      setIsLoading(true);

      const supabase = getSupabaseClient();
      if (!supabase) {
        // Without a configured Supabase backend, user is securely kept as Guest
        if (mounted) {
          setUser(null);
          setRole('guest');
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

          // If no external Discord API response, check roles claim if available
          if (guildRoles.length === 0 && meta.roles && Array.isArray(meta.roles)) {
            guildRoles = meta.roles;
          }

          // Strictly determine role based on verified Discord Guild Role IDs
          const parsedRole = determineEffectiveRole(guildRoles, config);

          const discordUser: DiscordUser = {
            id: authUser.id,
            email: authUser.email,
            username: meta.user_name || meta.name || authUser.email?.split('@')[0] || 'DiscordTrainer',
            globalName: meta.full_name || meta.custom_claims?.global_name || meta.name,
            avatar: meta.avatar_url || meta.picture,
            avatarUrl: meta.avatar_url || meta.picture || 'https://cdn.discordapp.com/embed/avatars/0.png',
            roles: guildRoles,
            effectiveRole: parsedRole,
            isSimulated: false,
          };

          if (mounted) {
            setUser(discordUser);
            setRole(parsedRole);
          }
        } else {
          if (mounted) {
            setUser(null);
            setRole('guest');
          }
        }
      } catch (err) {
        console.error('Error during Supabase session retrieval:', err);
        if (mounted) {
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
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session && session.user) {
          const authUser = session.user;
          const meta = authUser.user_metadata || {};
          const providerToken = session.provider_token;

          let guildRoles: string[] = [];
          if (providerToken && config.discordGuildId) {
            guildRoles = await fetchDiscordMemberRoles(providerToken, config.discordGuildId);
          }
          if (guildRoles.length === 0 && meta.roles && Array.isArray(meta.roles)) {
            guildRoles = meta.roles;
          }

          const parsedRole = determineEffectiveRole(guildRoles, config);

          const discordUser: DiscordUser = {
            id: authUser.id,
            email: authUser.email,
            username: meta.user_name || meta.name || 'DiscordTrainer',
            globalName: meta.full_name || meta.name,
            avatarUrl: meta.avatar_url || meta.picture || 'https://cdn.discordapp.com/embed/avatars/0.png',
            roles: guildRoles,
            effectiveRole: parsedRole,
            isSimulated: false,
          };

          setUser(discordUser);
          setRole(parsedRole);
        } else {
          setUser(null);
          setRole('guest');
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
      // Alert the administrator/user that Supabase needs to be connected
      alert(
        'Supabase & Discord OAuth are not yet configured!\n\nPlease click "⚡ Supabase" in the navbar to enter your Supabase URL, Anon Key, and Discord Role IDs.'
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
    setUser(null);
    setRole('guest');
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
