import React, { useState, useEffect } from 'react';
import { CAMPUS_ASSETS } from '../data/curriculumData';
import { playRetroSound, toggleSound, isSoundMuted } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { checkSupabaseHealth } from '../services/supabaseService';

interface NavbarProps {
  onOpenSupabaseSetup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSupabaseSetup }) => {
  const [muted, setMuted] = useState(isSoundMuted());
  const [isTableReady, setIsTableReady] = useState<boolean | null>(null);
  const { user, role, signInWithDiscord, signOut, setUserRole } = useAuth();

  useEffect(() => {
    checkSupabaseHealth().then((res) => {
      setIsTableReady(res.tableExists);
    });
  }, []);

  const handleToggleSound = () => {
    const next = toggleSound();
    setMuted(next);
    if (!next) {
      playRetroSound('confirm');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-slate-900">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5">
        {/* Brand wordmark with the Bakumon Dragon Logo */}
        <a
          href="#"
          onClick={() => playRetroSound('select')}
          className="flex items-center gap-2.5 text-slate-900 font-pixel text-xs sm:text-sm tracking-tight whitespace-nowrap shrink-0 hover:text-rose-600 transition-colors"
        >
          <img
            src={CAMPUS_ASSETS.logo}
            alt="Bakumon Official Logo"
            className="w-8 h-8 object-contain filter drop-shadow-xs"
          />
          <span className="hidden sm:inline">Bakumon University</span>
          <span className="sm:hidden">Bakumon</span>
        </a>

        {/* Concise single-line nav links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <a
            href="#curriculum"
            onClick={() => playRetroSound('select')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            The 4 Subjects
          </a>
          <a
            href="#terminal"
            onClick={() => playRetroSound('select')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <span>Student PC</span>
            {role === 'student' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </a>
          <a
            href="#admin-roster"
            onClick={() => playRetroSound('select')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <span>Teacher Roster</span>
            {role === 'admin' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </a>
          <a
            href="#about"
            onClick={() => playRetroSound('select')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            Campus Life
          </a>
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
            title={muted ? 'Enable Retro Audio' : 'Mute Audio'}
            aria-label="Toggle retro audio"
          >
            {muted ? '🔇' : '🔊'}
          </button>

          {/* Supabase & RLS Setup button with live health status */}
          <button
            onClick={() => {
              playRetroSound('select');
              onOpenSupabaseSetup();
            }}
            className="px-2.5 py-1 text-xs font-mono font-bold text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 shadow-[1px_1px_0_0_#0f172a] transition-colors cursor-pointer flex items-center gap-1.5"
            title={
              isTableReady === true
                ? "Supabase connected: Table 'enrollees' is active"
                : isTableReady === false
                ? "Notice: Table 'enrollees' not found in Supabase. Click to view SQL script."
                : "Configure Supabase Backend & Schema"
            }
          >
            <span
              className={`w-2 h-2 rounded-full border border-slate-900 ${
                isTableReady === true
                  ? 'bg-emerald-500'
                  : isTableReady === false
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            <span>⚡</span>
            <span className="hidden sm:inline">Supabase</span>
            {isTableReady === false && (
              <span className="text-[10px] text-amber-800 font-bold hidden md:inline">SQL Setup</span>
            )}
          </button>

          {/* Real Discord Auth Button or Verified User Badge */}
          {!user ? (
            <button
              onClick={() => signInWithDiscord()}
              className="px-3.5 py-1.5 text-xs font-pixel bg-[#5865F2] hover:bg-[#4752C4] text-white border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Login with Discord</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-900 px-2 py-1">
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-5 h-5 rounded-full border border-slate-900 bg-white"
                />
                <span className="font-mono text-xs font-bold text-slate-800 hidden sm:inline">
                  @{user.username}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-pixel border border-slate-900 ${
                    role === 'admin'
                      ? 'bg-amber-300 text-slate-950 font-bold shadow-[1px_1px_0_0_#0f172a]'
                      : role === 'student'
                      ? 'bg-emerald-300 text-emerald-950 font-bold'
                      : 'bg-slate-300 text-slate-800'
                  }`}
                  title={role === 'admin' ? 'Teacher / Faculty Clearance Active' : `Role: ${role}`}
                >
                  {role === 'admin' ? 'TEACHER' : role.toUpperCase()}
                </span>
              </div>
              {role !== 'admin' && (
                <button
                  onClick={() => {
                    playRetroSound('confirm');
                    setUserRole('admin');
                  }}
                  className="px-2 py-1 text-[10px] font-pixel bg-amber-300 hover:bg-amber-400 text-slate-950 border border-slate-900 shadow-[1px_1px_0_0_#0f172a] cursor-pointer hidden md:inline-flex items-center gap-1"
                  title="Verify as Teacher (Discord Role: Teachers - 1567172563585597540)"
                >
                  <span>⚡</span>
                  <span>Teacher</span>
                </button>
              )}
              <button
                onClick={signOut}
                className="px-2 py-1 text-[11px] font-mono font-bold text-rose-700 bg-white hover:bg-rose-50 border border-slate-900 cursor-pointer shadow-[1px_1px_0_0_#0f172a]"
                title="Sign out of Discord session"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
