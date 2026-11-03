import React, { useState, useEffect } from 'react';
import { Enrollee } from '../types';
import { CAMPUS_ASSETS } from '../data/curriculumData';
import { fetchEnrollees, deleteEnrollee } from '../services/supabaseService';
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
  const { user, role, signInWithDiscord, switchSimulatedRole } = useAuth();

  const [students, setStudents] = useState<Enrollee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'local_storage'>('local_storage');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Enrollee | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchEnrollees();
      setStudents(res.data);
      setDataSource(res.source);
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmTarget) return;

    const targetId = deleteConfirmTarget.id;
    setDeletingId(targetId);
    playRetroSound('select');

    try {
      const result = await deleteEnrollee(targetId);
      if (result.success) {
        playRetroSound('confirm');
        setStudents((prev) => prev.filter((s) => s.id !== targetId));
        setNotification(`Record ${targetId} (${deleteConfirmTarget.name}) successfully removed.`);
        setTimeout(() => setNotification(null), 3000);
      } else {
        playRetroSound('error');
        setNotification(`Failed to delete record: ${result.error}`);
      }
    } catch (err) {
      playRetroSound('error');
      setNotification('Network error while deleting record.');
    } finally {
      setDeletingId(null);
      setDeleteConfirmTarget(null);
    }
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
        {/* Pokédex Registry Header Box */}
        <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] overflow-hidden mb-8">
          <div className="bg-slate-100 px-5 py-4 border-b-2 border-slate-900 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-rose-600 border-2 border-slate-900 shadow-xs" />
              <div>
                <span className="font-pixel text-xs sm:text-sm text-slate-900 tracking-tight block">
                  ADMIN POKÉDEX REGISTRY // STUDENT DATABASE
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Role-Based Access Control · Admin Clearance Required
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
            </div>
          </div>

          {/* RBAC Guard Check */}
          {role !== 'admin' ? (
            <div className="p-8 sm:p-12 text-center bg-slate-50 space-y-6">
              <div className="w-16 h-16 mx-auto bg-rose-100 border-3 border-slate-900 flex items-center justify-center text-2xl shadow-[4px_4px_0_0_#0f172a]">
                ⛔
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="font-pixel text-base sm:text-lg text-slate-900">
                  ADMIN CLEARANCE REQUIRED
                </h3>
                <p className="text-xs sm:text-sm font-mono text-slate-600 leading-relaxed">
                  The Pokédex Registry contains student contact data and programmatic database management functions (such as SQL record deletion). Only Discord accounts with the <strong>Admin Role</strong> can query or mutate this registry.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {!user ? (
                  <button
                    onClick={() => signInWithDiscord()}
                    className="px-6 py-3 font-pixel text-xs bg-[#5865F2] hover:bg-[#4752C4] text-white border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] cursor-pointer"
                  >
                    Login with Admin Discord Account
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-mono text-slate-500">
                      Current role: <span className="font-bold text-slate-900">{role.toUpperCase()}</span>
                    </p>
                    <button
                      onClick={() => switchSimulatedRole('admin')}
                      className="px-5 py-2.5 font-pixel text-xs bg-amber-400 hover:bg-amber-500 text-slate-900 border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] cursor-pointer"
                    >
                      ⚡ Switch to Admin Mode (Dev Preview)
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Admin view: Full Pokédex Registry with DELETE actions */
            <div className="p-6 sm:p-8 space-y-6 bg-white">
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

                <div className="flex items-center gap-3">
                  <span className="font-pixel text-xs text-slate-700">
                    {filteredStudents.length} / {students.length} ENROLLEES
                  </span>
                  <button
                    onClick={() => {
                      playRetroSound('select');
                      loadData();
                    }}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
                  >
                    🔄 Refresh Query
                  </button>
                </div>
              </div>

              {/* Notification Banner */}
              {notification && (
                <div className="p-3 bg-rose-50 border-2 border-slate-900 text-xs font-mono text-rose-900 flex items-center justify-between shadow-[2px_2px_0_0_#0f172a]">
                  <span>{notification}</span>
                  <button
                    onClick={() => setNotification(null)}
                    className="text-xs font-bold text-slate-900 cursor-pointer"
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
                <div className="py-16 text-center font-mono text-xs text-slate-500 bg-slate-50 border-2 border-dashed border-slate-300 p-8">
                  <span>No student records matching your query.</span>
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
                              <span className="text-slate-500 text-[10px]">{student.timestamp.split(' ')[0]}</span>
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

      {/* Delete Confirmation Modal */}
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
              Are you sure you want to permanently remove student <strong>{deleteConfirmTarget.name}</strong> ({deleteConfirmTarget.id})? This action cannot be undone.
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
    </section>
  );
};
