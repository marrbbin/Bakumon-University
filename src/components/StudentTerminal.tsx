import React, { useState, useEffect, useCallback } from 'react';
import { Enrollee, ExperienceLevel } from '../types';
import { CAMPUS_ASSETS } from '../data/curriculumData';
import {
  insertEnrollee,
  checkUserAlreadyEnrolled,
  deleteEnrolleeByUserId,
  checkSupabaseHealth,
  SupabaseHealth,
} from '../services/supabaseService';
import { MCPlayerHead } from './MCPlayerHead';
import { playRetroSound } from '../utils/audio';
import { useAuth } from '../context/AuthContext';

interface StudentTerminalProps {
  onEnrollmentComplete?: (newEnrollee: Enrollee) => void;
  onOpenSupabaseSetup?: () => void;
}

const EXPERIENCE_OPTIONS: ExperienceLevel[] = [
  'Beginner (Fresh out of Nuvema)',
  'Intermediate (Gym Challenger)',
  'Advanced (Elite Four Caliber)',
];

export const StudentTerminal: React.FC<StudentTerminalProps> = ({
  onEnrollmentComplete,
  onOpenSupabaseSetup,
}) => {
  const { user, role, signInWithDiscord, isConfigured } = useAuth();

  const [name, setName] = useState('');
  const [mcUsername, setMcUsername] = useState('');
  const [discordHandle, setDiscordHandle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(EXPERIENCE_OPTIONS[0]);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingPass, setIsRefreshingPass] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warn';
    text: string;
    showSqlAction?: boolean;
  } | null>(null);
  const [existingPass, setExistingPass] = useState<Enrollee | null>(null);
  const [terminalPower, setTerminalPower] = useState(true);

  // Supabase Table Health status
  const [dbHealth, setDbHealth] = useState<SupabaseHealth | null>(null);

  useEffect(() => {
    checkSupabaseHealth().then((h) => setDbHealth(h));
  }, []);

  // Check enrollment in database
  const refreshEnrollment = useCallback(async (userId?: string) => {
    const targetId = userId || user?.id;
    if (!targetId) {
      setExistingPass(null);
      setStatusMessage(null);
      return;
    }

    try {
      const res = await checkUserAlreadyEnrolled(targetId);
      if (res.enrolled && res.enrollee) {
        setExistingPass(res.enrollee);
        setStatusMessage({
          type: 'info',
          text: `Welcome back, Trainer! You are currently registered under Student ID ${res.enrollee.id}. Duplicate submissions are restricted.`,
        });
      } else {
        // Not enrolled or previously deleted!
        setExistingPass(null);
        setStatusMessage(null);
      }
    } catch (err) {
      console.warn('Error verifying enrollment:', err);
    }
  }, [user?.id]);

  // Auto-fill Discord handle and name from active session, and subscribe to database events
  useEffect(() => {
    if (user) {
      if (!name) setName(user.globalName || user.username || '');
      if (!discordHandle) setDiscordHandle(`@${user.username}`);
      if (!mcUsername) setMcUsername(user.username.replace(/[^a-zA-Z0-9_]/g, ''));

      refreshEnrollment(user.id);
    } else {
      setExistingPass(null);
      setStatusMessage(null);
    }

    const handleDatabaseUpdate = () => {
      if (user?.id) {
        refreshEnrollment(user.id);
      }
    };

    window.addEventListener('bakumon_enrollees_updated', handleDatabaseUpdate);
    return () => {
      window.removeEventListener('bakumon_enrollees_updated', handleDatabaseUpdate);
    };
  }, [user, refreshEnrollment]);

  const activeSkin = mcUsername.trim() || name.trim() || user?.username || 'Steve';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      playRetroSound('error');
      setStatusMessage({ type: 'error', text: 'Authentication error: Please log in with Discord first.' });
      return;
    }

    if (role !== 'student' && role !== 'admin') {
      playRetroSound('error');
      setStatusMessage({ type: 'error', text: 'Access Denied: Your Discord account lacks the Student Role.' });
      return;
    }

    if (!name.trim()) {
      playRetroSound('error');
      setStatusMessage({ type: 'error', text: 'Please enter your Trainer Name.' });
      return;
    }

    if (!discordHandle.trim()) {
      playRetroSound('error');
      setStatusMessage({ type: 'error', text: 'Please enter your Discord Handle.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    playRetroSound('confirm');

    try {
      const result = await insertEnrollee({
        name: name.trim(),
        discordHandle: discordHandle.trim(),
        experienceLevel,
        mcUsername: mcUsername.trim() || name.trim(),
        notes: notes.trim(),
        userId: user.id,
        avatarUrl: user.avatarUrl,
      });

      if (result.success && result.data) {
        setExistingPass(result.data);
        setStatusMessage({
          type: 'success',
          text: `Enrollment confirmed! Student ID: ${result.data.id} has been registered and written to Supabase!`,
        });
        if (onEnrollmentComplete) {
          onEnrollmentComplete(result.data);
        }
      } else {
        playRetroSound('error');
        setStatusMessage({
          type: 'error',
          text: result.error || 'Failed to complete registration.',
          showSqlAction: result.tableMissing,
        });
      }
    } catch (err: any) {
      console.error('Submission failed', err);
      playRetroSound('error');
      setStatusMessage({
        type: 'error',
        text: 'Network error communicating with database.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="terminal" className="py-20 px-4 sm:px-6 bg-white border-b-2 border-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Terminal Housing Container */}
        <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a] overflow-hidden">
          {/* DS PC Top Bar */}
          <div className="bg-slate-100 px-5 py-3.5 border-b-2 border-slate-900 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className={`w-3 h-3 rounded-full border border-slate-900 ${terminalPower ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="w-3 h-3 rounded-full border border-slate-900 bg-amber-400" />
                <span className="w-3 h-3 rounded-full border border-slate-900 bg-blue-500" />
              </div>
              <span className="font-pixel text-xs text-slate-900 tracking-tight">
                STUDENT TERMINAL // NAWAWA ACADEMIC OS
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 border border-slate-400 bg-white text-slate-700">
                RBAC: STUDENT ROLE ONLY
              </span>
              <button
                onClick={() => setTerminalPower(!terminalPower)}
                className="px-2 py-0.5 text-[11px] font-mono font-bold bg-white hover:bg-slate-200 border border-slate-900 text-slate-800 cursor-pointer"
                title="Toggle PC Screen Power"
              >
                {terminalPower ? 'PWR [ON]' : 'PWR [OFF]'}
              </button>
            </div>
          </div>

          {/* Terminal Screen Body */}
          {terminalPower ? (
            <div className="p-6 sm:p-10 bg-white">
              {/* Access Guard for Non-Students */}
              {role !== 'student' && role !== 'admin' ? (
                <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
                  <div className="w-16 h-16 mx-auto bg-amber-100 border-2 border-slate-900 flex items-center justify-center text-2xl shadow-[4px_4px_0_0_#0f172a]">
                    🔒
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-pixel text-base sm:text-lg text-slate-900">
                      STUDENT CREDENTIALS REQUIRED
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-mono max-w-md mx-auto">
                      This terminal accepts registrations exclusively from verified students holding the{' '}
                      <span className="font-bold text-slate-900">Student Discord Role</span> in the Bakumon University server.
                    </p>
                  </div>

                  {!user ? (
                    <button
                      onClick={() => signInWithDiscord()}
                      className="px-6 py-3 font-pixel text-xs bg-[#5865F2] hover:bg-[#4752C4] text-white border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>Login with Discord to Unlock</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <div className="bg-amber-50 border-2 border-slate-900 p-4 max-w-md mx-auto text-xs font-mono text-slate-800 space-y-2">
                      <p>
                        Logged in as: <strong>@{user.username}</strong>
                      </p>
                      <p className="text-amber-800">
                        Status: Guest / Unverified. Your Discord account has not been assigned the Student role in the Bakumon University Discord server yet.
                      </p>
                    </div>
                  )}
                </div>
              ) : existingPass ? (
                /* Already Enrolled Pass Display (Duplicate Prevention) */
                <div className="max-w-2xl mx-auto space-y-6 py-6">
                  <div className="bg-emerald-50 border-2 border-slate-900 p-4 shadow-[3px_3px_0_0_#0f172a] flex items-center gap-3">
                    <span className="text-2xl">✓</span>
                    <div>
                      <h4 className="font-pixel text-xs text-emerald-950">
                        ENROLLMENT RECORD VERIFIED (ONE SUBMISSION PER USER)
                      </h4>
                      <p className="text-xs font-mono text-emerald-800">
                        Your Discord account is linked to Student ID <strong>{existingPass.id}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Student ID Card Badge */}
                  <div className="bg-white border-3 border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-6 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full pointer-events-none" />
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={CAMPUS_ASSETS.logo}
                          alt="Bakumon Logo"
                          className="w-10 h-10 object-contain"
                        />
                        <div>
                          <span className="font-pixel text-xs text-rose-600 block">
                            BAKUMON UNIVERSITY · OFFICIAL STUDENT PASS
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            Nawawa Academic Council · Term 2026
                          </span>
                        </div>
                      </div>
                      <span className="font-pixel text-sm text-slate-900 bg-slate-100 px-3 py-1 border border-slate-900">
                        {existingPass.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                      <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-slate-900 space-y-2">
                        <MCPlayerHead username={existingPass.mcUsername || existingPass.name} size={64} />
                        <span className="text-[11px] font-mono text-slate-600 font-bold truncate max-w-[120px]">
                          {existingPass.mcUsername || existingPass.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">SkinRestorer Active</span>
                      </div>

                      <div className="sm:col-span-2 space-y-3 font-mono text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">TRAINER NAME</span>
                          <span className="font-bold text-slate-900 text-sm font-sans">{existingPass.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-400 block text-[10px]">DISCORD HANDLE</span>
                            <span className="text-slate-800 font-semibold">{existingPass.handle}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">EXPERIENCE LEVEL</span>
                            <span className="text-rose-700 font-semibold">{existingPass.experienceLevel || 'Beginner'}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">ENROLLMENT TIMESTAMP</span>
                          <span className="text-slate-600">{existingPass.timestamp}</span>
                        </div>
                        {existingPass.notes && (
                          <div>
                            <span className="text-slate-400 block text-[10px]">STUDENT AMBITION / NOTES</span>
                            <p className="text-slate-700 italic text-[11px]">{existingPass.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Database Sync & Withdraw Actions */}
                    <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isRefreshingPass}
                          onClick={async () => {
                            playRetroSound('select');
                            setIsRefreshingPass(true);
                            if (user?.id) {
                              await refreshEnrollment(user.id);
                            }
                            setIsRefreshingPass(false);
                          }}
                          className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-900 shadow-[1px_1px_0_0_#0f172a] cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          title="Verify live with Supabase if your record was deleted"
                        >
                          <span>{isRefreshingPass ? '⏳' : '🔄'}</span>
                          <span>{isRefreshingPass ? 'Querying Supabase...' : 'Check Database Status'}</span>
                        </button>
                        <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                          (Click if you deleted your record in the database)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!user?.id) return;
                          if (confirm('Withdraw and delete your current enrollment record? This will allow you to re-enroll with fresh data.')) {
                            playRetroSound('confirm');
                            await deleteEnrolleeByUserId(user.id);
                            setExistingPass(null);
                            setStatusMessage({
                              type: 'info',
                              text: 'Previous enrollment cleared. You may now submit a new registration below.',
                            });
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-mono font-semibold bg-white hover:bg-rose-50 text-rose-700 border border-slate-900 shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
                        title="Delete current enrollment record and re-enroll"
                      >
                        Withdraw & Re-enroll
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Registration Form for Unenrolled Students */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Form */}
                  <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-5">
                    <div className="border-b-2 border-slate-900 pb-3">
                      <span className="font-pixel text-xs text-rose-600 block">
                        UNIFIED REGISTRATION FORM
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">
                        Enroll in Bakumon University (All 4 Core Subjects)
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Authenticated as: <strong>@{user?.username}</strong> ({user?.id.slice(0, 8)}...)
                      </p>
                    </div>

                    {statusMessage && (
                      <div
                        className={`p-3.5 border-2 border-slate-900 text-xs font-mono shadow-[2px_2px_0_0_#0f172a] space-y-2 ${
                          statusMessage.type === 'error'
                            ? 'bg-rose-50 text-rose-900 border-rose-900'
                            : statusMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-900'
                            : 'bg-blue-50 text-blue-900 border-blue-900'
                        }`}
                      >
                        <p className="leading-relaxed">{statusMessage.text}</p>
                        {statusMessage.showSqlAction && onOpenSupabaseSetup && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                playRetroSound('select');
                                onOpenSupabaseSetup();
                              }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-pixel text-[11px] border border-slate-900 shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
                            >
                              Open 1-Click SQL Script to Create Table
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="block text-xs font-mono font-bold text-slate-900">
                          Trainer Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Hilbert Black"
                          className="w-full bg-white border-2 border-slate-900 px-3 py-2 text-xs text-slate-900 shadow-[2px_2px_0_0_#0f172a] outline-hidden focus:border-rose-600"
                        />
                      </div>

                      {/* Discord Handle */}
                      <div className="space-y-1">
                        <label className="block text-xs font-mono font-bold text-slate-900">
                          Discord Handle *
                        </label>
                        <input
                          type="text"
                          required
                          value={discordHandle}
                          onChange={(e) => setDiscordHandle(e.target.value)}
                          placeholder="@username"
                          className="w-full bg-white border-2 border-slate-900 px-3 py-2 text-xs text-slate-900 shadow-[2px_2px_0_0_#0f172a] outline-hidden focus:border-rose-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Experience Level */}
                      <div className="space-y-1">
                        <label className="block text-xs font-mono font-bold text-slate-900">
                          Experience Level *
                        </label>
                        <select
                          value={experienceLevel}
                          onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                          className="w-full bg-white border-2 border-slate-900 px-3 py-2 text-xs text-slate-900 shadow-[2px_2px_0_0_#0f172a] outline-hidden focus:border-rose-600 cursor-pointer"
                        >
                          {EXPERIENCE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Minecraft IGN / Skin */}
                      <div className="space-y-1">
                        <label className="block text-xs font-mono font-bold text-slate-900 flex items-center justify-between">
                          <span>Minecraft IGN (Head Skin)</span>
                          <span className="text-[10px] text-slate-500 font-normal">SkinRestorer ok</span>
                        </label>
                        <input
                          type="text"
                          value={mcUsername}
                          onChange={(e) => setMcUsername(e.target.value)}
                          placeholder="Minecraft username or skin name"
                          className="w-full bg-white border-2 border-slate-900 px-3 py-2 text-xs text-slate-900 shadow-[2px_2px_0_0_#0f172a] outline-hidden focus:border-rose-600"
                        />
                      </div>
                    </div>

                    {/* Ambition / Notes */}
                    <div className="space-y-1">
                      <label className="block text-xs font-mono font-bold text-slate-900">
                        Trainer Goals & Background (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Aspiring to master weather synergy and high-yield berry breeding."
                        className="w-full bg-white border-2 border-slate-900 px-3 py-2 text-xs text-slate-900 shadow-[2px_2px_0_0_#0f172a] outline-hidden focus:border-rose-600"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-3 font-pixel text-xs pixel-btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="animate-spin">⚙️</span>
                            <span>WRITING TO SUPABASE...</span>
                          </>
                        ) : (
                          <>
                            <span>SUBMIT ENROLLMENT</span>
                            <span>→</span>
                          </>
                        )}
                      </button>

                      {onOpenSupabaseSetup && (
                        <button
                          type="button"
                          onClick={() => {
                            playRetroSound('select');
                            onOpenSupabaseSetup();
                          }}
                          className="px-3.5 py-3 text-xs font-mono text-slate-600 hover:text-slate-900 underline cursor-pointer"
                        >
                          Supabase & RLS Setup
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Right Column: Live Avatar & Database Pipeline Card */}
                  <div className="lg:col-span-4 bg-slate-50 border-2 border-slate-900 p-5 shadow-[4px_4px_0_0_#0f172a] space-y-4">
                    <span className="font-pixel text-[11px] text-slate-900 block border-b border-slate-200 pb-2">
                      LIVE AVATAR PREVIEW
                    </span>

                    <div className="flex items-center gap-4">
                      <MCPlayerHead username={activeSkin} size={56} />
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-slate-900 block truncate font-sans">
                          {name || 'Trainer Pending'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 block truncate">
                          IGN: {activeSkin}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                          SkinRestorer & Cracked Ready
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-slate-300 text-xs font-mono space-y-2">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Database Pipeline
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">Supabase Table:</span>
                        {dbHealth?.tableExists ? (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                            ✓ 'enrollees' Active
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300">
                            ⚠️ Table Missing
                          </span>
                        )}
                      </div>

                      {!dbHealth?.tableExists && onOpenSupabaseSetup && (
                        <button
                          type="button"
                          onClick={() => {
                            playRetroSound('select');
                            onOpenSupabaseSetup();
                          }}
                          className="w-full text-left text-[11px] text-blue-700 hover:text-blue-900 underline font-bold cursor-pointer pt-1"
                        >
                          → Click here to create table via SQL
                        </button>
                      )}

                      <p className="text-[10px] text-slate-500 leading-tight pt-1">
                        Unique constraint prevents duplicate submissions per Discord ID.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 bg-slate-950 text-emerald-400 font-mono text-center space-y-3">
              <span className="text-3xl block">⚡</span>
              <p className="text-xs">TERMINAL IN POWER-SAVING STANDBY</p>
              <button
                onClick={() => setTerminalPower(true)}
                className="px-4 py-2 text-xs bg-emerald-500 text-slate-950 font-bold border border-emerald-300 cursor-pointer"
              >
                RESTORE POWER
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
