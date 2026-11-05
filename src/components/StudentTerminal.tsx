import React, { useState, useEffect, useCallback } from 'react';
import { Enrollee, ExperienceLevel, SubjectType } from '../types';
import { CAMPUS_ASSETS, AVAILABLE_MAJORS } from '../data/curriculumData';
import {
  insertEnrollee,
  checkUserAlreadyEnrolled,
  deleteEnrolleeByUserId,
  checkSupabaseHealth,
  SupabaseHealth,
  parseMajorsList,
  cleanNotesText,
} from '../services/supabaseService';
import { MCPlayerHead } from './MCPlayerHead';
import { playRetroSound } from '../utils/audio';
import { useAuth } from '../context/AuthContext';

interface StudentTerminalProps {
  onEnrollmentComplete?: (newEnrollee: Enrollee) => void;
  onOpenSupabaseSetup?: () => void;
  preselectedMajor?: SubjectType;
}

const EXPERIENCE_OPTIONS: ExperienceLevel[] = [
  'Beginner (Fresh out of Nuvema)',
  'Intermediate (Gym Challenger)',
  'Advanced (Elite Four Caliber)',
];

export const StudentTerminal: React.FC<StudentTerminalProps> = ({
  onEnrollmentComplete,
  onOpenSupabaseSetup,
  preselectedMajor,
}) => {
  const { user, role, signInWithDiscord, isConfigured, verifyStudentPasscode } = useAuth();

  const [name, setName] = useState('');
  const [mcUsername, setMcUsername] = useState('');
  const [discordHandle, setDiscordHandle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(EXPERIENCE_OPTIONS[0]);
  const [selectedMajors, setSelectedMajors] = useState<SubjectType[]>(
    preselectedMajor ? [preselectedMajor] : []
  );
  const [notes, setNotes] = useState('');

  // Manual Student Passcode / Fast-Pass unlock state
  const [showStudentPasscode, setShowStudentPasscode] = useState(false);
  const [studentPasscode, setStudentPasscode] = useState('');
  const [manualTrainerHandle, setManualTrainerHandle] = useState('');
  const [studentPasscodeError, setStudentPasscodeError] = useState(false);

  // Sync preselectedMajor if user clicks "Select [Major] Track" from curriculum cards
  useEffect(() => {
    if (preselectedMajor) {
      setSelectedMajors([preselectedMajor]);
    }
  }, [preselectedMajor]);

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

  const handleToggleMajor = (majorId: SubjectType) => {
    playRetroSound('select');
    setSelectedMajors((prev) =>
      prev.includes(majorId) ? prev.filter((m) => m !== majorId) : [...prev, majorId]
    );
  };

  const handleSelectAllMajors = () => {
    playRetroSound('confirm');
    setSelectedMajors(['Battling', 'Breeding', 'Brewing', 'Berry Farming']);
  };

  const handleClearMajors = () => {
    playRetroSound('select');
    setSelectedMajors([]);
  };

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

    if (selectedMajors.length === 0) {
      playRetroSound('error');
      setStatusMessage({ type: 'error', text: 'Please select at least one major track for your degree.' });
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
        majors: selectedMajors,
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
                <div className="max-w-2xl mx-auto py-8 sm:py-12 text-center space-y-6">
                  <div className="w-16 h-16 mx-auto bg-amber-100 border-2 border-slate-900 flex items-center justify-center text-2xl shadow-[4px_4px_0_0_#0f172a]">
                    🎓
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-pixel text-base sm:text-lg text-slate-900">
                      STUDENT PASS REQUIRED TO ENROLL
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-mono max-w-md mx-auto">
                      Verify your student standing in the Bakumon University Discord community to unlock your terminal and receive your official Student ID.
                    </p>
                  </div>

                  {!user ? (
                    <div className="space-y-4 max-w-md mx-auto">
                      <button
                        onClick={() => signInWithDiscord()}
                        className="w-full px-6 py-3 font-pixel text-xs bg-[#5865F2] hover:bg-[#4752C4] text-white border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] cursor-pointer inline-flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                        <span>Verify with Discord</span>
                        <span>→</span>
                      </button>

                      {/* Friendly Non-Tech Privacy Card */}
                      <div className="bg-slate-50 border border-slate-300 p-3.5 text-left text-xs font-mono space-y-1.5 shadow-[2px_2px_0_0_#0f172a]">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                          <span>🛡️</span>
                          <span>Privacy & Safety Guarantee:</span>
                        </div>
                        <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside pl-0.5">
                          <li>We only check if you hold the student role in the Bakumon server.</li>
                          <li>We <strong>never</strong> ask for or see your Discord password.</li>
                          <li>We <strong>do not</strong> request your email address or list of servers.</li>
                          <li>We cannot send messages or read your private chats.</li>
                        </ul>
                      </div>

                      {/* Zero-Discord Passcode Alternative for Non-Tech Students */}
                      <div className="pt-2 border-t border-slate-200">
                        {!showStudentPasscode ? (
                          <button
                            type="button"
                            onClick={() => {
                              playRetroSound('select');
                              setShowStudentPasscode(true);
                            }}
                            className="text-xs font-mono text-slate-600 hover:text-slate-900 underline cursor-pointer"
                          >
                            🔑 Or enter Student Passcode / Role ID (No Discord OAuth)
                          </button>
                        ) : (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const ok = verifyStudentPasscode(studentPasscode, manualTrainerHandle);
                              if (ok) {
                                setStudentPasscodeError(false);
                                setShowStudentPasscode(false);
                              } else {
                                setStudentPasscodeError(true);
                              }
                            }}
                            className="bg-white border-2 border-slate-900 p-4 text-left space-y-3 shadow-[3px_3px_0_0_#0f172a]"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                              <span className="font-pixel text-[11px] text-slate-900">DIRECT STUDENT PASSCODE UNLOCK</span>
                              <button
                                type="button"
                                onClick={() => setShowStudentPasscode(false)}
                                className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                            <div>
                              <label className="block text-[11px] font-mono font-bold text-slate-800 mb-1">
                                Trainer Name or Discord Username:
                              </label>
                              <input
                                type="text"
                                value={manualTrainerHandle}
                                onChange={(e) => setManualTrainerHandle(e.target.value)}
                                placeholder="e.g. Hilbert or @hilbert_trainer"
                                className="w-full bg-white border border-slate-900 p-2 text-xs font-mono shadow-[1px_1px_0_0_#0f172a] outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-mono font-bold text-slate-800 mb-1">
                                Student Role ID or Passcode:
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="password"
                                  value={studentPasscode}
                                  onChange={(e) => setStudentPasscode(e.target.value)}
                                  placeholder="1567172479808700536 or student"
                                  className="flex-1 bg-white border border-slate-900 p-2 text-xs font-mono shadow-[1px_1px_0_0_#0f172a] outline-hidden"
                                />
                                <button
                                  type="submit"
                                  className="px-3.5 py-2 font-pixel text-[11px] pixel-btn-primary cursor-pointer whitespace-nowrap"
                                >
                                  Unlock
                                </button>
                              </div>
                              {studentPasscodeError && (
                                <p className="text-[10px] font-mono text-rose-600 mt-1 font-bold">
                                  Invalid code. Use your Student Role ID (<code>1567172479808700536</code>) or <code>student</code>.
                                </p>
                              )}
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border-2 border-slate-900 p-5 max-w-md mx-auto text-xs font-mono text-slate-800 space-y-3 shadow-[3px_3px_0_0_#0f172a]">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚠️</span>
                        <div className="text-left">
                          <p className="font-bold text-slate-900">
                            Logged in as: @{user.username}
                          </p>
                          <p className="text-amber-800 text-[11px]">
                            Student role (1567172479808700536) not detected in your Discord profile.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-300 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            verifyStudentPasscode('student', user.username);
                          }}
                          className="w-full px-4 py-2 font-pixel text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 border border-slate-900 shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
                        >
                          ⚡ Quick Verify Student Clearance
                        </button>
                      </div>
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
                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            DECLARED MAJOR TRACK(S) ({parseMajorsList(existingPass.majors, existingPass.notes).length})
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {parseMajorsList(existingPass.majors, existingPass.notes).map((m) => {
                              const majorConfig = AVAILABLE_MAJORS.find((opt) => opt.id === m);
                              return (
                                <span
                                  key={m}
                                  className={`px-2 py-0.5 text-[11px] font-mono font-bold border-2 border-slate-900 shadow-[1px_1px_0_0_#0f172a] flex items-center gap-1 ${
                                    majorConfig?.badgeClass || 'bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  <span>{majorConfig?.icon || '📜'}</span>
                                  <span>{m}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        {cleanNotesText(existingPass.notes) && (
                          <div>
                            <span className="text-slate-400 block text-[10px]">STUDENT AMBITION / NOTES</span>
                            <p className="text-slate-700 italic text-[11px]">{cleanNotesText(existingPass.notes)}</p>
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
                        ACADEMIC ENROLLMENT APPLICATION
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">
                        Select Your Major Track(s) & Trainer Profile
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Pick one or many disciplines. Authenticated as: <strong>@{user?.username}</strong> ({user?.id.slice(0, 8)}...)
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

                    {/* Major Selection (Pick 1 or Many) */}
                    <div className="space-y-2.5 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <label className="block text-xs font-mono font-bold text-slate-900">
                            Select Academic Major(s) *
                          </label>
                          <span className="text-[11px] font-mono text-slate-500">
                            Pick one, two, three, or all four major disciplines ({selectedMajors.length} selected):
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          <button
                            type="button"
                            onClick={handleSelectAllMajors}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-900 text-slate-800 font-bold shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
                          >
                            ✓ Select All 4
                          </button>
                          <button
                            type="button"
                            onClick={handleClearMajors}
                            className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-400 text-slate-700 font-medium cursor-pointer"
                          >
                            ✕ Clear Selection
                          </button>
                        </div>
                      </div>

                      {selectedMajors.length === 0 && (
                        <div className="text-[11px] font-mono text-amber-900 bg-amber-50 border-2 border-amber-400 p-2.5 font-bold shadow-[2px_2px_0_0_#0f172a] flex items-center gap-2">
                          <span>⚠️</span>
                          <span>Click any major card below to pick your disciplines (e.g. Breeding & Genetics, Alchemical Brewing).</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {AVAILABLE_MAJORS.map((major) => {
                          const isSelected = selectedMajors.includes(major.id);
                          return (
                            <button
                              key={major.id}
                              type="button"
                              onClick={() => handleToggleMajor(major.id)}
                              className={`p-3 text-left border-2 transition-all cursor-pointer flex items-start gap-3 relative ${
                                isSelected
                                  ? `${major.borderActive} border-slate-900 shadow-[3px_3px_0_0_#0f172a]`
                                  : 'border-slate-300 bg-white hover:border-slate-500 opacity-75 hover:opacity-100'
                              }`}
                            >
                              {/* Custom Checkbox Indicator */}
                              <div
                                className={`w-5 h-5 shrink-0 border-2 border-slate-900 flex items-center justify-center font-bold text-xs mt-0.5 ${
                                  isSelected ? 'bg-slate-900 text-white' : 'bg-white text-transparent'
                                }`}
                              >
                                {isSelected ? '✓' : ''}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 truncate">
                                    <span>{major.icon}</span>
                                    <span>{major.title}</span>
                                  </span>
                                  {isSelected && (
                                    <span
                                      className="text-[9px] font-pixel px-1.5 py-0.2 border border-slate-900 shrink-0"
                                      style={{ backgroundColor: major.color, color: '#fff' }}
                                    >
                                      SELECTED
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono block truncate">
                                  {major.department}
                                </span>
                              </div>
                            </button>
                          );
                        })}
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

                    {/* Live Chosen Majors Preview */}
                    <div className="p-3 bg-white border border-slate-300 text-xs font-mono space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold">
                        <span>Selected Track(s):</span>
                        <span className="text-rose-600 font-bold">{selectedMajors.length} / 4 Majors</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedMajors.map((m) => {
                          const config = AVAILABLE_MAJORS.find((opt) => opt.id === m);
                          return (
                            <span
                              key={m}
                              className={`px-1.5 py-0.5 text-[10px] font-bold border border-slate-900 ${
                                config?.badgeClass || 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {config?.icon} {m}
                            </span>
                          );
                        })}
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
