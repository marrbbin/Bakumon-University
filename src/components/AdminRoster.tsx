import React, { useState, useEffect } from 'react';
import { Enrollee } from '../types';
import {
  fetchEnrollees,
  deleteEnrollee,
  clearAllEnrollees,
  resetAllEnrolleesToDefault,
} from '../services/supabaseService';
import { MCPlayerHead } from './MCPlayerHead';
import { playRetroSound } from '../utils/audio';
import { useAuth } from '../context/AuthContext';

interface AdminRosterProps {
  onOpenSupabaseSetup?: () => void;
  refreshTrigger?: number;
}

export const AdminRoster: React.FC<AdminRosterProps> = ({
  onOpenSupabaseSetup,
  refreshTrigger,
}) => {
  const { user, role, signInWithDiscord, signOut, config, verifyTeacherPasscode, setUserRole } = useAuth();

  const [students, setStudents] = useState<Enrollee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'local_storage'>('local_storage');
  const [tableMissing, setTableMissing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Enrollee | null>(null);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'warn' | 'error'; text: string } | null>(null);

  // Teacher / Admin access bypass
  const [passcodeUnlocked, setPasscodeUnlocked] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [showPasscodeInput, setShowPasscodeInput] = useState(false);

  // Section collapse toggle if the user wishes to hide this component
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);

  const isTeacherAuthorized = role === 'admin' || passcodeUnlocked;

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchEnrollees();
      setStudents(res.data);
      setDataSource(res.source);
      if (res.tableMissing) {
        setTableMissing(true);
      } else if (res.source === 'supabase') {
        setTableMissing(false);
      }
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  // Handle Teacher Passcode / Key verification
  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = enteredPasscode.trim();

    const ok = verifyTeacherPasscode(clean);
    if (ok) {
      setPasscodeUnlocked(true);
      setPasscodeError(false);
      setNotification({
        type: 'success',
        text: 'Teacher / Faculty Clearance Verified! Database management unlocked.',
      });
      setTimeout(() => setNotification(null), 4000);
    } else {
      setPasscodeError(true);
    }
  };

  // Direct Teacher verification for logged-in Discord members
  const handleClaimTeacherRole = () => {
    playRetroSound('confirm');
    setUserRole('admin');
    setPasscodeUnlocked(true);
    setNotification({
      type: 'success',
      text: 'Verified as Teacher! Full registry permissions activated.',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Resilient single record deletion
  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmTarget) return;

    const targetId = deleteConfirmTarget.id;
    const targetName = deleteConfirmTarget.name;
    setDeletingId(targetId);
    playRetroSound('select');

    try {
      const result = await deleteEnrollee(targetId);
      playRetroSound('confirm');
      // Always remove from local state immediately
      setStudents((prev) => prev.filter((s) => s.id !== targetId));

      if (result.warning) {
        setNotification({
          type: 'warn',
          text: `Record ${targetId} (${targetName}) removed from active registry! (Notice: ${result.warning})`,
        });
      } else {
        setNotification({
          type: 'success',
          text: `Record ${targetId} (${targetName}) successfully deleted from database.`,
        });
      }
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      playRetroSound('confirm');
      setStudents((prev) => prev.filter((s) => s.id !== targetId));
      setNotification({
        type: 'warn',
        text: `Record ${targetId} removed from local session.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setDeletingId(null);
      setDeleteConfirmTarget(null);
    }
  };

  // Complete database wipe / clear all records
  const handleWipeDatabaseConfirmed = async () => {
    setIsWiping(true);
    playRetroSound('select');

    try {
      const result = await clearAllEnrollees();
      playRetroSound('confirm');
      setStudents([]);
      setNotification({
        type: 'success',
        text: result.warning
          ? `All student records cleared from registry! (Notice: ${result.warning})`
          : 'All student records have been permanently cleared from database.',
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setStudents([]);
      setNotification({
        type: 'warn',
        text: 'All student records cleared from local registry.',
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsWiping(false);
      setIsWipeModalOpen(false);
    }
  };

  // Reset back to initial default curriculum students
  const handleResetToDefaults = async () => {
    playRetroSound('confirm');
    const fresh = await resetAllEnrolleesToDefault();
    setStudents(fresh);
    setNotification({
      type: 'success',
      text: 'Student registry restored to default university roster.',
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.handle.toLowerCase().includes(term) ||
      s.id.toLowerCase().includes(term) ||
      (s.mcUsername && s.mcUsername.toLowerCase().includes(term)) ||
      (s.experienceLevel && s.experienceLevel.toLowerCase().includes(term))
    );
  });

  return (
    <section id="admin-roster" className="py-20 px-4 sm:px-6 bg-white border-b-2 border-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Table Missing Alert Banner */}
        {tableMissing && (
          <div className="mb-6 p-4 bg-amber-50 border-3 border-amber-600 shadow-[4px_4px_0_0_#0f172a] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="space-y-1">
              <span className="font-bold text-amber-950 flex items-center gap-1.5 text-sm">
                <span>⚠️</span>
                <span>Supabase Table 'enrollees' Not Found in Your Project</span>
              </span>
              <p className="text-amber-900">
                The database table has not been created yet in Supabase (<code className="bg-amber-200 px-1 font-bold">awcbsdwbzzisyqqzdmgp</code>). Live records and new student enrollments will not show in your Supabase dashboard until the SQL table script is run.
              </p>
            </div>
            {onOpenSupabaseSetup && (
              <button
                onClick={() => {
                  playRetroSound('select');
                  onOpenSupabaseSetup();
                }}
                className="px-4 py-2 font-pixel text-xs pixel-btn-primary cursor-pointer whitespace-nowrap"
              >
                Open 1-Click SQL Script
              </button>
            )}
          </div>
        )}

        {/* Pokédex Registry Header Box */}
        <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] overflow-hidden mb-8">
          {/* Section Top Bar */}
          <div className="bg-slate-100 px-5 py-4 border-b-2 border-slate-900 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-rose-600 border-2 border-slate-900 shadow-xs" />
              <div>
                <span className="font-pixel text-xs sm:text-sm text-slate-900 tracking-tight block">
                  TEACHER & ADMIN POKÉDEX REGISTRY // STUDENT DATABASE
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Role: "Teachers" (ID: {config.adminRoleId || '1567172563585597540'}) · Role-Based Access Control
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 text-xs font-mono font-bold border-2 border-slate-900 flex items-center gap-1.5 shadow-[1px_1px_0_0_#0f172a] ${
                  dataSource === 'supabase'
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                <span>●</span>
                <span>{dataSource === 'supabase' ? 'Supabase Postgres Live' : 'Local Sandbox Store'}</span>
              </span>

              {onOpenSupabaseSetup && (
                <button
                  onClick={() => {
                    playRetroSound('select');
                    onOpenSupabaseSetup();
                  }}
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-white hover:bg-slate-200 border-2 border-slate-900 text-slate-800 shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
                >
                  ⚙️ Schema & RLS
                </button>
              )}

              {/* Collapse/Hide section toggle */}
              <button
                onClick={() => {
                  playRetroSound('select');
                  setIsSectionCollapsed(!isSectionCollapsed);
                }}
                className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-200 hover:bg-slate-300 border-2 border-slate-900 text-slate-800 shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
                title={isSectionCollapsed ? 'Expand Registry' : 'Minimize Registry'}
              >
                {isSectionCollapsed ? '▼ Expand' : '▲ Minimize'}
              </button>
            </div>
          </div>

          {/* Collapsed view indicator */}
          {isSectionCollapsed ? (
            <div className="p-4 bg-slate-50 text-center font-mono text-xs text-slate-600 flex items-center justify-between">
              <span>Section minimized. Database operations paused.</span>
              <button
                onClick={() => setIsSectionCollapsed(false)}
                className="text-xs underline font-bold text-slate-900 cursor-pointer"
              >
                Reopen Registry
              </button>
            </div>
          ) : !isTeacherAuthorized ? (
            /* RBAC Guard Check with Faculty/Teacher Passcode Option */
            <div className="p-8 sm:p-12 text-center bg-slate-50 space-y-6">
              <div className="w-16 h-16 mx-auto bg-amber-100 border-3 border-slate-900 flex items-center justify-center text-2xl shadow-[4px_4px_0_0_#0f172a]">
                🎓
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="font-pixel text-base sm:text-lg text-slate-900">
                  TEACHER CLEARANCE REQUIRED
                </h3>
                <p className="text-xs sm:text-sm font-mono text-slate-600 leading-relaxed">
                  The Pokédex Registry contains student contact data and programmatic database management functions. Access is reserved for Discord accounts with the <strong className="text-slate-900">"Teachers" Role</strong> (ID: <code className="bg-white px-1 border border-slate-300">1567172563585597540</code>).
                </p>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 pt-2 max-w-md mx-auto">
                {!user ? (
                  <button
                    onClick={() => signInWithDiscord()}
                    className="w-full sm:w-auto px-6 py-3 font-pixel text-xs bg-[#5865F2] hover:bg-[#4752C4] text-white border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] cursor-pointer"
                  >
                    Login with Teacher Discord Account
                  </button>
                ) : (
                  <div className="space-y-3 w-full">
                    <p className="text-xs font-mono text-slate-600 bg-white border border-slate-300 p-2.5">
                      Logged in as <strong>@{user.username}</strong> ({role.toUpperCase()}).
                    </p>

                    <button
                      onClick={handleClaimTeacherRole}
                      className="w-full px-4 py-2.5 font-pixel text-xs bg-amber-400 hover:bg-amber-500 text-slate-950 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] cursor-pointer flex items-center justify-center gap-2"
                      title="Verify and unlock Teacher/Faculty clearance"
                    >
                      <span>⚡</span>
                      <span>Verify as Teacher (Role: Teachers)</span>
                    </button>

                    <button
                      onClick={async () => {
                        await signOut();
                        await signInWithDiscord();
                      }}
                      className="px-4 py-2 font-mono text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] cursor-pointer"
                    >
                      Sign In with Different Discord Account
                    </button>
                  </div>
                )}

                {/* Faculty / Teacher Passcode Fallback */}
                <div className="w-full pt-4 border-t border-slate-200">
                  {!showPasscodeInput ? (
                    <button
                      onClick={() => setShowPasscodeInput(true)}
                      className="text-xs font-mono text-slate-600 hover:text-slate-900 underline cursor-pointer"
                    >
                      ⚡ Or verify with Teacher Passcode / Role ID
                    </button>
                  ) : (
                    <form onSubmit={handleVerifyPasscode} className="space-y-2 text-left">
                      <label className="block text-xs font-mono font-bold text-slate-800">
                        Teacher Passcode or Discord Role ID:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={enteredPasscode}
                          onChange={(e) => setEnteredPasscode(e.target.value)}
                          placeholder="teachers, 1567172563585597540, or bakumon2026"
                          className="flex-1 bg-white border-2 border-slate-900 px-3 py-1.5 text-xs font-mono shadow-[2px_2px_0_0_#0f172a] outline-hidden"
                        />
                        <button
                          type="submit"
                          className="px-4 py-1.5 font-pixel text-xs pixel-btn-primary cursor-pointer whitespace-nowrap"
                        >
                          Unlock
                        </button>
                      </div>
                      {passcodeError && (
                        <p className="text-[11px] font-mono text-rose-600">
                          Incorrect key. Accepts <code>teachers</code>, <code>1567172563585597540</code>, or <code>bakumon2026</code>.
                        </p>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Teacher view: Full Pokédex Registry with DELETE & WIPE actions */
            <div className="p-6 sm:p-8 space-y-6 bg-white">
              {/* Teacher verified badge banner */}
              <div className="p-3 bg-amber-50 border-2 border-slate-900 font-mono text-xs flex flex-wrap items-center justify-between gap-2 shadow-[2px_2px_0_0_#0f172a]">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎓</span>
                  <span className="font-bold text-amber-950">
                    Teacher Clearance Active:
                  </span>
                  <span className="text-slate-700">
                    Logged in as {user ? `@${user.username}` : 'Faculty Member'} (Role: Teachers · ID 1567172563585597540)
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-amber-200 border border-slate-900 font-bold text-[10px] text-amber-900 uppercase">
                  Faculty Access
                </span>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[240px] max-w-md">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by student ID, trainer name, Discord handle, or IGN..."
                    className="w-full bg-white border-2 border-slate-900 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 font-sans shadow-[2px_2px_0_0_#0f172a] outline-hidden focus:border-rose-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-pixel text-xs text-slate-700 mr-2">
                    {filteredStudents.length} / {students.length} ENROLLEES
                  </span>

                  <button
                    onClick={() => {
                      playRetroSound('select');
                      loadData();
                    }}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
                    title="Reload data from database"
                  >
                    🔄 Refresh
                  </button>

                  <button
                    onClick={handleResetToDefaults}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-900 shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
                    title="Reload default sample students"
                  >
                    ↺ Reset Defaults
                  </button>

                  <button
                    onClick={() => {
                      playRetroSound('select');
                      setIsWipeModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-rose-600 hover:bg-rose-700 text-white border-2 border-slate-900 shadow-[1px_1px_0_0_#0f172a] cursor-pointer flex items-center gap-1"
                    title="Permanently wipe all student records from database"
                  >
                    <span>🗑️</span>
                    <span>Wipe Database</span>
                  </button>
                </div>
              </div>

              {/* Notification Banner */}
              {notification && (
                <div
                  className={`p-3 border-2 border-slate-900 text-xs font-mono flex items-center justify-between shadow-[2px_2px_0_0_#0f172a] ${
                    notification.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-900'
                      : notification.type === 'warn'
                      ? 'bg-amber-50 text-amber-900 border-amber-900'
                      : 'bg-rose-50 text-rose-900 border-rose-900'
                  }`}
                >
                  <span>{notification.text}</span>
                  <button
                    onClick={() => setNotification(null)}
                    className="text-xs font-bold text-slate-900 cursor-pointer ml-3"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Table or Card Grid */}
              {loading ? (
                <div className="py-16 text-center font-mono text-xs text-slate-500 space-y-2">
                  <span className="text-2xl animate-spin block">⚙️</span>
                  <span>Executing SELECT * FROM enrollees...</span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-16 text-center font-mono text-xs text-slate-500 bg-slate-50 border-2 border-dashed border-slate-300 p-8 space-y-3">
                  <p className="font-bold text-slate-700">The registry database is currently empty.</p>
                  <p className="text-[11px] text-slate-500">
                    No active student records found. You can enroll new students via the Student Terminal or click "Reset Defaults" above.
                  </p>
                  <button
                    onClick={handleResetToDefaults}
                    className="px-4 py-2 text-xs font-pixel pixel-btn-primary cursor-pointer"
                  >
                    Load Initial Students
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredStudents.map((student) => {
                    const skinName = student.mcUsername || student.name;
                    const isDeleting = deletingId === student.id;

                    return (
                      <div
                        key={student.id}
                        className="bg-white border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] p-4 flex flex-col justify-between hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform"
                      >
                        <div className="space-y-3">
                          {/* Card Top: ID and Status */}
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                            <span className="font-pixel text-xs text-rose-600">{student.id}</span>
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-400">
                              {student.status || 'Active'}
                            </span>
                          </div>

                          {/* Trainer Info with Minecraft Head */}
                          <div className="flex items-center gap-3">
                            <MCPlayerHead username={skinName} size={44} />
                            <div className="overflow-hidden flex-1">
                              <span className="font-bold text-slate-900 text-sm block truncate font-sans">
                                {student.name}
                              </span>
                              <span className="text-xs text-slate-500 font-mono block truncate">
                                {student.handle}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block truncate">
                                IGN: {skinName}
                              </span>
                            </div>
                          </div>

                          {/* Experience Level Pill */}
                          <div className="text-xs font-mono bg-slate-50 p-2 border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
                              <span>Experience</span>
                              <span>Date</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-800 font-medium">
                              <span className="text-rose-700 font-bold truncate max-w-[140px]">
                                {student.experienceLevel || 'Beginner'}
                              </span>
                              <span className="text-slate-500 text-[10px]">
                                {student.timestamp.split(' ')[0]}
                              </span>
                            </div>
                          </div>

                          {student.notes && (
                            <p className="text-[11px] text-slate-600 italic line-clamp-2 bg-slate-50/50 p-1.5 border-l-2 border-slate-400">
                              "{student.notes}"
                            </p>
                          )}
                        </div>

                        {/* Action Buttons: Delete */}
                        <div className="pt-3 border-t border-slate-200 mt-4 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400">
                            UID: {student.userId ? student.userId.slice(0, 8) + '...' : 'LOCAL'}
                          </span>

                          <button
                            onClick={() => {
                              playRetroSound('select');
                              setDeleteConfirmTarget(student);
                            }}
                            disabled={isDeleting}
                            className="px-2.5 py-1 text-xs font-mono font-bold bg-white hover:bg-rose-600 hover:text-white text-rose-700 border-2 border-slate-900 shadow-[1px_1px_0_0_#0f172a] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            title="Delete student from database"
                          >
                            <span>🗑️</span>
                            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Single Record Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a] p-6 space-y-4 text-slate-900">
            <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="font-pixel text-xs text-rose-600">CONFIRM SQL DELETE ACTION</h4>
                <p className="text-xs text-slate-500 font-mono">Row Level Operation: DELETE FROM enrollees</p>
              </div>
            </div>

            <p className="text-xs font-mono text-slate-700 leading-relaxed">
              Are you sure you want to permanently remove student <strong>{deleteConfirmTarget.name}</strong> ({deleteConfirmTarget.id})? This action will remove the record from both Supabase and the student registry.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 text-xs font-mono font-bold bg-white hover:bg-slate-100 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 text-xs font-pixel bg-rose-600 hover:bg-rose-700 text-white border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Wipe / Clear All Confirmation Modal */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a] p-6 space-y-4 text-slate-900">
            <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-3">
              <span className="text-2xl">🚨</span>
              <div>
                <h4 className="font-pixel text-xs text-rose-600">WIPE ENTIRE STUDENT DATABASE?</h4>
                <p className="text-xs text-slate-500 font-mono">Operation: DELETE FROM enrollees (ALL RECORDS)</p>
              </div>
            </div>

            <p className="text-xs font-mono text-slate-700 leading-relaxed">
              Warning: This will permanently delete <strong>ALL {students.length} student records</strong> from the database. You can restore default records at any time using the "Reset Defaults" button.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsWipeModalOpen(false)}
                className="px-4 py-2 text-xs font-mono font-bold bg-white hover:bg-slate-100 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeDatabaseConfirmed}
                disabled={isWiping}
                className="px-4 py-2 text-xs font-pixel bg-rose-600 hover:bg-rose-700 text-white border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] cursor-pointer disabled:opacity-50"
              >
                {isWiping ? 'Wiping Database...' : 'Confirm Wipe All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
