import React, { useState, useEffect } from 'react';
import { CAMPUS_ASSETS } from '../data/curriculumData';
import { playRetroSound } from '../utils/audio';
import { useAuth } from '../context/AuthContext';

interface HeroProps {
  onOpenSupabaseSetup?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenSupabaseSetup }) => {
  const { user, role, signInWithDiscord, signOut } = useAuth();

  const fullDialogue =
    "Hello there! Welcome to Bakumon University! Our academy was founded in Nawawa Region to teach the true science of Pokémon mechanics. Choose one or multiple majors that match your ambitions: Battling, Breeding, Brewing, or Berry Farming! Log in with your Discord account to enroll. Ready to begin?";

  const [displayedText, setDisplayedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullDialogue.length) {
        setDisplayedText(fullDialogue.slice(0, index + 1));
        if (index % 4 === 0) {
          playRetroSound('typewriter');
        }
        index++;
      } else {
        setIsTypingDone(true);
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, []);

  const handleSkipTyping = () => {
    playRetroSound('select');
    setDisplayedText(fullDialogue);
    setIsTypingDone(true);
  };

  return (
    <section className="relative overflow-hidden border-b-2 border-slate-900 bg-white pixel-grid-pattern">
      {/* Background Campus Image with Light Ambient Gradient Scrim */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-25">
        <img
          src={CAMPUS_ASSETS.heroCampus}
          alt="Bakumon Campus White Academy"
          className="w-full h-full object-cover object-center filter saturate-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
      </div>

      {/* Main Hero Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-20 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Text & CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-slate-900 text-xs font-mono font-semibold text-slate-800 shadow-[2px_2px_0_0_#0f172a]">
              <span className="w-2 h-2 bg-rose-600 rounded-full" />
              <span>NAWAWA ACADEMIC ENROLLMENT · TERM 2026</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
                Master the Art of <br />
                <span className="text-rose-600 font-pixel text-2xl sm:text-4xl lg:text-5xl">
                  Pokémon Mechanics
                </span>
              </h1>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
                Bakumon University is the premier roleplay institution dedicated to transforming beginners into competitive masters. Study EV/IV calculus, pedigree genetics, medicine compounding, and berry agriculture in custom single or multi-major tracks.
              </p>
            </div>

            {/* Retro Professor Dialogue Box (White Minimalist DS Aesthetic) */}
            <div className="relative bg-white border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] p-4 sm:p-5 text-slate-900 max-w-xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-rose-500" />
                  <span className="font-pixel text-[11px] text-slate-900">
                    PROFESSOR DK'S DISPATCH
                  </span>
                </div>
                {!isTypingDone && (
                  <button
                    onClick={handleSkipTyping}
                    className="text-[11px] font-mono text-slate-500 hover:text-slate-900 underline cursor-pointer"
                  >
                    Skip typing [A]
                  </button>
                )}
              </div>
              <p className="font-mono text-xs sm:text-sm leading-relaxed text-slate-800 min-h-[58px]">
                {displayedText}
                {!isTypingDone && <span className="inline-block w-2 h-3.5 bg-rose-600 ml-1 animate-pulse" />}
              </p>
            </div>

            {/* Prominent Discord Authentication Area */}
            <div className="pt-2 max-w-xl space-y-3">
              {!user ? (
                <div className="space-y-2">
                  <button
                    onClick={() => signInWithDiscord()}
                    className="w-full sm:w-auto px-6 py-4 font-pixel text-xs sm:text-sm bg-[#5865F2] hover:bg-[#4752C4] text-white border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                    <span>Login with Discord</span>
                  </button>
                  <p className="text-[11px] font-mono text-slate-500">
                    🔒 Privacy safe: Verifies your @Student or @Teacher role in the official Bakumon server.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-slate-900 p-3.5 shadow-[3px_3px_0_0_#0f172a] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatarUrl}
                        alt={user.username}
                        className="w-10 h-10 rounded-full border-2 border-slate-900 bg-white"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {user.globalName || user.username}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-pixel border border-slate-900 ${
                              role === 'admin'
                                ? 'bg-amber-300 text-slate-900'
                                : role === 'student'
                                ? 'bg-emerald-200 text-emerald-950'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {role === 'admin' ? 'TEACHER' : role.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          @{user.username}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={signOut}
                      className="px-3 py-1.5 text-xs font-mono font-semibold bg-white hover:bg-rose-50 text-rose-700 border-2 border-slate-900 shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>

                  {/* Route shortcut depending on role */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200">
                    {role === 'student' && (
                      <a
                        href="#terminal"
                        onClick={() => playRetroSound('confirm')}
                        className="px-4 py-2 text-xs font-pixel pixel-btn-primary flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Open Student PC Terminal</span>
                        <span>↓</span>
                      </a>
                    )}
                    {role === 'admin' && (
                      <a
                        href="#admin-roster"
                        onClick={() => playRetroSound('confirm')}
                        className="px-4 py-2 text-xs font-pixel bg-amber-400 hover:bg-amber-500 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Access Teacher Roster [Pokédex]</span>
                        <span>↓</span>
                      </a>
                    )}
                    <a
                      href="#curriculum"
                      onClick={() => playRetroSound('select')}
                      className="px-3.5 py-2 text-xs font-mono font-semibold pixel-btn-secondary"
                    >
                      Explore The 4 Majors
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Clean unboxed proof metrics */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs max-w-lg">
              <div>
                <span className="font-pixel text-slate-900 block text-base tabular-nums">4</span>
                <span className="text-slate-500 font-medium">Major Tracks</span>
              </div>
              <div>
                <span className="font-pixel text-rose-600 block text-base tabular-nums">1 - 4</span>
                <span className="text-slate-500 font-medium">Majors / Student</span>
              </div>
              <div>
                <span className="font-pixel text-slate-900 block text-base tabular-nums">RBAC</span>
                <span className="text-slate-500 font-medium">Discord Roles</span>
              </div>
            </div>
          </div>

          {/* Right Visual Crest - Features the User's Uploaded Dragon Pokéball Logo */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 animate-float-idle flex items-center justify-center p-4 bg-white/80 rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0_0_#0f172a]">
              <img
                src={CAMPUS_ASSETS.logo}
                alt="Official Bakumon Dragon Logo"
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            </div>

            {/* University Tag Seal */}
            <div className="mt-4 px-4 py-2 bg-white border-2 border-slate-900 text-center space-y-0.5 shadow-[2px_2px_0_0_#0f172a]">
              <span className="font-pixel text-[10px] text-rose-600 block">
                BAKUMON UNIVERSITY · NAWAWA
              </span>
              <span className="text-xs text-slate-600 font-mono font-medium">
                "Scientia et Fortitudo in Proelio"
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
