import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { playRetroSound } from '../utils/audio';
import { DEFAULT_SUPABASE_CONFIG } from '../store';
import { checkSupabaseHealth, SupabaseHealth } from '../services/supabaseService';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'config' | 'sql' | 'discord' | 'security';
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'sql',
}) => {
  const { config, updateConfig, role, user } = useAuth();

  const [supabaseUrl, setSupabaseUrl] = useState(config.supabaseUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(config.supabaseAnonKey);
  const [discordGuildId, setDiscordGuildId] = useState(config.discordGuildId);
  const [studentRoleId, setStudentRoleId] = useState(config.studentRoleId);
  const [adminRoleId, setAdminRoleId] = useState(config.adminRoleId);

  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'discord' | 'security'>(defaultTab);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Live Supabase Health State
  const [health, setHealth] = useState<SupabaseHealth | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const runHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await checkSupabaseHealth();
      setHealth(res);
    } catch (err: any) {
      setHealth({
        connected: false,
        tableExists: false,
        message: err?.message || 'Failed to ping Supabase',
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Sync inputs and check health whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSupabaseUrl(config.supabaseUrl);
      setSupabaseAnonKey(config.supabaseAnonKey);
      setDiscordGuildId(config.discordGuildId);
      setStudentRoleId(config.studentRoleId);
      setAdminRoleId(config.adminRoleId);
      runHealthCheck();
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleRestoreDefaults = () => {
    playRetroSound('confirm');
    setSupabaseUrl(DEFAULT_SUPABASE_CONFIG.supabaseUrl);
    setSupabaseAnonKey(DEFAULT_SUPABASE_CONFIG.supabaseAnonKey);
    setDiscordGuildId(DEFAULT_SUPABASE_CONFIG.discordGuildId);
    setStudentRoleId(DEFAULT_SUPABASE_CONFIG.studentRoleId);
    setAdminRoleId(DEFAULT_SUPABASE_CONFIG.adminRoleId);
    updateConfig(DEFAULT_SUPABASE_CONFIG);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      runHealthCheck();
    }, 1500);
  };

  const handleSave = () => {
    playRetroSound('confirm');
    updateConfig({
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      discordGuildId: discordGuildId.trim(),
      studentRoleId: studentRoleId.trim(),
      adminRoleId: adminRoleId.trim(),
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      runHealthCheck();
    }, 1500);
  };

  const sqlInstructions = `-- ==============================================================================
-- BAKUMON UNIVERSITY - OFFICIAL DATABASE & RLS SETUP SCRIPT
-- Paste this script into: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Project: https://awcbsdwbzzisyqqzdmgp.supabase.co
-- ==============================================================================

-- 1. CREATE ENROLLEES TABLE
-- Uses 'text' for user_id to seamlessly accept both Discord Snowflake IDs and Supabase Auth UUIDs
create table if not exists public.enrollees (
  id text primary key,
  user_id text not null,
  name text not null,
  discord_handle text not null,
  experience_level text not null,
  mc_username text,
  notes text,
  status text default 'Enrolled',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_enrollment unique (user_id)
);

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
alter table public.enrollees enable row level security;

-- 3. PERMISSION: ALLOW SELECT (Anyone can view classmate registry)
drop policy if exists "Allow public select on enrollees" on public.enrollees;
create policy "Allow public select on enrollees"
on public.enrollees for select
to public
using (true);

-- 4. PERMISSION: ALLOW INSERT (Students can enroll with unique user check)
drop policy if exists "Allow public insert on enrollees" on public.enrollees;
create policy "Allow public insert on enrollees"
on public.enrollees for insert
to public
with check (true);

-- 5. PERMISSION: ALLOW DELETE (Admin Pokédex Roster programmatic deletions)
drop policy if exists "Allow public delete on enrollees" on public.enrollees;
create policy "Allow public delete on enrollees"
on public.enrollees for delete
to public
using (true);
`;

  const copyToClipboard = (text: string) => {
    playRetroSound('confirm');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a] my-auto text-slate-900 max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-slate-900 bg-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <span className="font-pixel text-xs text-slate-900 tracking-tight block">
                SUPABASE BACKEND & DATABASE SETUP
              </span>
              <span className="text-xs text-slate-500 font-mono">
                PostgreSQL Schema · Table Creation · Row Level Security (RLS)
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              playRetroSound('select');
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center bg-white hover:bg-rose-600 hover:text-white border-2 border-slate-900 text-slate-900 font-bold transition-colors cursor-pointer shadow-[2px_2px_0_0_#0f172a]"
          >
            ✕
          </button>
        </div>

        {/* Live Supabase Health Check Status Banner */}
        <div className="px-5 py-2.5 bg-slate-50 border-b-2 border-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Database Status:</span>
            {isCheckingHealth ? (
              <span className="text-slate-500 flex items-center gap-1">
                <span className="animate-spin">⚙️</span> Checking Supabase table...
              </span>
            ) : health?.tableExists ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold flex items-center gap-1">
                <span>✓</span>
                <span>'enrollees' Table Connected & Live</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-400 font-bold flex items-center gap-1">
                <span>⚠️</span>
                <span>Table 'enrollees' Not Created in Supabase Yet</span>
              </span>
            )}
          </div>

          <button
            onClick={runHealthCheck}
            disabled={isCheckingHealth}
            className="px-2.5 py-1 text-[11px] bg-white hover:bg-slate-100 border border-slate-900 text-slate-800 font-bold shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
          >
            {isCheckingHealth ? 'Pinging...' : '🔄 Re-check Status'}
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b-2 border-slate-900 bg-slate-50 px-5 pt-2 gap-2 text-xs font-mono">
          <button
            onClick={() => {
              playRetroSound('select');
              setActiveTab('sql');
            }}
            className={`px-3.5 py-2 border-t-2 border-x-2 font-bold cursor-pointer ${
              activeTab === 'sql'
                ? 'bg-white border-slate-900 text-slate-900 -mb-[2px] pb-[10px]'
                : 'bg-slate-100 border-transparent text-slate-600'
            }`}
          >
            📜 1-Click SQL Script
          </button>
          <button
            onClick={() => {
              playRetroSound('select');
              setActiveTab('config');
            }}
            className={`px-3.5 py-2 border-t-2 border-x-2 font-bold cursor-pointer ${
              activeTab === 'config'
                ? 'bg-white border-slate-900 text-slate-900 -mb-[2px] pb-[10px]'
                : 'bg-slate-100 border-transparent text-slate-600'
            }`}
          >
            ⚙️ Credentials & Keys
          </button>
          <button
            onClick={() => {
              playRetroSound('select');
              setActiveTab('discord');
            }}
            className={`px-3.5 py-2 border-t-2 border-x-2 font-bold cursor-pointer ${
              activeTab === 'discord'
                ? 'bg-white border-slate-900 text-slate-900 -mb-[2px] pb-[10px]'
                : 'bg-slate-100 border-transparent text-slate-600'
            }`}
          >
            👾 Discord Provider
          </button>
          <button
            onClick={() => {
              playRetroSound('select');
              setActiveTab('security');
            }}
            className={`px-3.5 py-2 border-t-2 border-x-2 font-bold cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white border-slate-900 text-slate-900 -mb-[2px] pb-[10px]'
                : 'bg-slate-100 border-transparent text-slate-600'
            }`}
          >
            🔒 RBAC Security
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-800">
          {activeTab === 'sql' && (
            <div className="space-y-4 font-mono">
              {/* Table Missing Alert Box */}
              {!health?.tableExists && !isCheckingHealth && (
                <div className="p-4 bg-amber-50 border-2 border-amber-600 text-amber-950 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span>⚠️</span>
                    <span>Why you don't see enrollments in Supabase yet:</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900">
                    The PostgreSQL table <code className="bg-amber-200 px-1 font-bold">public.enrollees</code> has not been created in your Supabase project (<code className="bg-amber-200 px-1">awcbsdwbzzisyqqzdmgp</code>) yet. PostgREST returned <code className="bg-amber-200 px-1 font-bold">404 PGRST205 (Could not find table)</code>.
                  </p>
                  <p className="text-xs text-amber-900">
                    Follow the <strong>3 simple steps</strong> below to create the table in 15 seconds. Once created, all student registrations will immediately write directly to your Supabase database!
                  </p>
                </div>
              )}

              {/* Instructions steps */}
              <div className="bg-blue-50 border-2 border-slate-900 p-4 space-y-2.5">
                <span className="font-bold text-blue-950 text-sm block">
                  How to create the 'enrollees' table in Supabase:
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-800 pl-1">
                  <li>
                    Open your Supabase project in your browser:{' '}
                    <a
                      href={`https://supabase.com/dashboard/project/${config.supabaseUrl.replace('https://', '').split('.')[0] || 'awcbsdwbzzisyqqzdmgp'}/sql/new`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 underline font-bold"
                    >
                      Open Supabase SQL Editor →
                    </a>
                  </li>
                  <li>Click the <strong>"COPY SQL SCRIPT"</strong> button below.</li>
                  <li>In the Supabase SQL Editor, paste the script into the query box and click <strong>"Run"</strong> (or Cmd/Ctrl + Enter).</li>
                  <li>
                    Return to this page and click <strong>"Re-check Status"</strong> above. It will turn green, and enrollments will start appearing in your Supabase Table Editor!
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <h4 className="font-bold text-slate-900">SQL Schema & Policies (enrollees)</h4>
                  <p className="text-slate-500 text-[11px]">
                    Includes table definition, unique Discord ID constraint, and RLS policies.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(sqlInstructions)}
                  className="px-4 py-2 text-xs font-pixel pixel-btn-primary cursor-pointer flex items-center gap-1.5"
                >
                  <span>{copied ? '✓ COPIED!' : '📋 COPY SQL SCRIPT'}</span>
                </button>
              </div>

              <pre className="bg-slate-900 text-emerald-400 p-4 border-2 border-slate-900 overflow-x-auto text-[11px] leading-relaxed max-h-80 selection:bg-rose-600">
                {sqlInstructions}
              </pre>

              <div className="bg-slate-50 border-2 border-slate-900 p-3 space-y-1 text-[11px]">
                <strong className="text-slate-900">Table Schema Features:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>
                    <code>user_id text not null</code>: Accommodates both Discord Snowflake strings and Supabase UUIDs.
                  </li>
                  <li>
                    <code>unique_user_enrollment</code> constraint strictly prevents duplicate student submissions per user.
                  </li>
                  <li>
                    <code>drop policy if exists</code> prevents SQL conflicts if executed multiple times.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border-2 border-slate-900 font-mono space-y-1">
                <span className="font-bold text-blue-900">Supabase API Connection:</span>
                <p className="text-slate-700">
                  Your credentials are automatically baked into the app build for Vercel. You can also view or edit them below.
                </p>
              </div>

              <div className="space-y-3 font-mono">
                <div>
                  <label className="block text-slate-900 font-bold mb-1">
                    SUPABASE_URL
                  </label>
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://YOUR_PROJECT_REF.supabase.co"
                    className="w-full bg-white border-2 border-slate-900 p-2 font-mono text-xs shadow-[2px_2px_0_0_#0f172a] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-900 font-bold mb-1">
                    SUPABASE_ANON_KEY (Public Publishable Key)
                  </label>
                  <input
                    type="text"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="sb_publishable_..."
                    className="w-full bg-white border-2 border-slate-900 p-2 font-mono text-xs shadow-[2px_2px_0_0_#0f172a] outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-900 font-bold mb-1">
                      Discord Guild ID
                    </label>
                    <input
                      type="text"
                      value={discordGuildId}
                      onChange={(e) => setDiscordGuildId(e.target.value)}
                      placeholder="1560226393181130805"
                      className="w-full bg-white border-2 border-slate-900 p-2 font-mono text-xs shadow-[2px_2px_0_0_#0f172a] outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-900 font-bold mb-1">
                      Student Role ID
                    </label>
                    <input
                      type="text"
                      value={studentRoleId}
                      onChange={(e) => setStudentRoleId(e.target.value)}
                      placeholder="1567172479808700536"
                      className="w-full bg-white border-2 border-slate-900 p-2 font-mono text-xs shadow-[2px_2px_0_0_#0f172a] outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-900 font-bold mb-1">
                      Admin Role ID
                    </label>
                    <input
                      type="text"
                      value={adminRoleId}
                      onChange={(e) => setAdminRoleId(e.target.value)}
                      placeholder="1567172563585597540"
                      className="w-full bg-white border-2 border-slate-900 p-2 font-mono text-xs shadow-[2px_2px_0_0_#0f172a] outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      className="px-5 py-2.5 font-pixel text-xs pixel-btn-primary cursor-pointer"
                    >
                      Save Credentials
                    </button>
                    <button
                      type="button"
                      onClick={handleRestoreDefaults}
                      className="px-3.5 py-2.5 font-mono text-xs border-2 border-slate-900 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold shadow-[2px_2px_0_0_#0f172a] cursor-pointer"
                    >
                      ↺ Reset to Store Defaults
                    </button>
                  </div>
                  {saved && (
                    <span className="text-emerald-700 font-bold font-mono">
                      ✓ Supabase settings updated!
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'discord' && (
            <div className="space-y-4 font-mono leading-relaxed">
              <h4 className="font-bold text-slate-900 text-sm">
                Configuring Discord OAuth in Supabase
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-700 pl-1">
                <li>
                  Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Discord Developer Portal</a> and select your application.
                </li>
                <li>
                  Navigate to <strong>OAuth2 → General</strong>.
                </li>
                <li>
                  Add Redirect URI: <br />
                  <code className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-rose-700 font-bold block mt-1">
                    https://{supabaseUrl ? new URL(supabaseUrl || 'https://xyz.supabase.co').hostname : 'awcbsdwbzzisyqqzdmgp.supabase.co'}/auth/v1/callback
                  </code>
                </li>
                <li>
                  Copy your Discord <strong>Client ID</strong> and <strong>Client Secret</strong>.
                </li>
                <li>
                  In your Supabase Dashboard, open <strong>Authentication → Providers → Discord</strong>, paste the credentials, and ensure scopes include: <code className="bg-slate-100 px-1 font-bold">identify email guilds guilds.members.read</code>.
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 font-mono">
              <div className="bg-slate-50 border-2 border-slate-900 p-4 space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  Role-Based Access Control (RBAC) Security Architecture
                </h4>
                <p className="text-slate-600 text-xs">
                  All visitors begin in <strong>Guest Mode</strong> (unauthenticated). Access is granted via Discord OAuth guild verification:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-white border-2 border-slate-900 space-y-1.5 shadow-[2px_2px_0_0_#0f172a]">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-xs text-slate-700">1. DEFAULT GUEST STATE</span>
                    <span className="px-2 py-0.5 text-[10px] bg-slate-200 text-slate-800 font-bold">UNAUTHENTICATED</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Visitors see university lore, curriculum information, and a prominent "Login with Discord" call-to-action. The Student PC Terminal and Admin Pokédex Registry are locked.
                  </p>
                </div>

                <div className="p-3.5 bg-white border-2 border-slate-900 space-y-1.5 shadow-[2px_2px_0_0_#0f172a]">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-xs text-emerald-800">2. STUDENT VERIFICATION</span>
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-900 font-bold">DISCORD STUDENT ROLE</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    When logging in with Discord, the app verifies if the user's guild member profile holds the <strong>Student Role ID ({studentRoleId || 'Not configured'})</strong>. If verified, the Student PC Terminal unlocks, allowing one-time enrollment.
                  </p>
                </div>

                <div className="p-3.5 bg-white border-2 border-slate-900 space-y-1.5 shadow-[2px_2px_0_0_#0f172a]">
                  <div className="flex items-center justify-between">
                    <span className="font-pixel text-xs text-amber-900">3. ADMIN CLEARANCE</span>
                    <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-900 font-bold">DISCORD ADMIN ROLE</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    If the logged-in Discord member holds the <strong>Admin Role ID ({adminRoleId || 'Not configured'})</strong> or uses the Faculty Key, the Pokédex Registry unlocks with SELECT queries and programmatic SQL DELETE capabilities.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t-2 border-slate-900 bg-slate-50 font-mono text-xs">
          <span className="text-slate-500">
            Active Session: <strong className="text-slate-900">{user ? `@${user.username} (${role.toUpperCase()})` : 'GUEST (Not logged in)'}</strong>
          </span>
          <button
            onClick={() => {
              playRetroSound('select');
              onClose();
            }}
            className="px-4 py-1.5 font-pixel text-xs pixel-btn-primary cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
