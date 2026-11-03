import React, { useState, useEffect } from 'react';
import { Enrollee } from '../types';
import { CAMPUS_ASSETS } from '../data/curriculumData';
import { fetchEnrollees } from '../services/sheetService';
import { MCPlayerHead } from './MCPlayerHead';
import { playRetroSound } from '../utils/audio';

interface LiveRosterProps {
  onOpenSettings: () => void;
  onOpenDatabaseViewer: () => void;
  refreshTrigger?: number;
}

export const LiveRoster: React.FC<LiveRosterProps> = ({
  onOpenSettings,
  onOpenDatabaseViewer,
  refreshTrigger,
}) => {
  const [students, setStudents] = useState<Enrollee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'google_sheets' | 'local_storage'>('local_storage');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentModal, setSelectedStudentModal] = useState<Enrollee | null>(null);

  const loadStudents = async () => {
    setLoading(true);
    playRetroSound('select');
    try {
      const result = await fetchEnrollees();
      setStudents(result.data);
      setDataSource(result.source);
    } catch (err) {
      console.error('Failed to load enrollees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [refreshTrigger]);

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.handle.toLowerCase().includes(term) ||
      s.id.toLowerCase().includes(term) ||
      (s.mcUsername && s.mcUsername.toLowerCase().includes(term))
    );
  });

  return (
    <section id="roster" className="py-20 px-4 sm:px-6 bg-white border-b-2 border-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Pokédex Registry Header Box */}
        <div className="bg-white border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] overflow-hidden mb-6">
          <div className="bg-slate-100 px-5 py-4 border-b-2 border-slate-900 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-rose-600 border-2 border-slate-900" />
              <div>
                <span className="font-pixel text-xs text-slate-900 tracking-wide block">
                  NAWAWA STUDENT REGISTRY · ENROLLEE ROSTER
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Live Database:{' '}
                  <strong className={dataSource === 'google_sheets' ? 'text-emerald-700 font-bold' : 'text-slate-800 font-bold'}>
                    {dataSource === 'google_sheets' ? 'Google Sheets API Connected' : 'Campus Persistent Mode'}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  playRetroSound('select');
                  onOpenDatabaseViewer();
                }}
                className="text-xs px-3 py-1.5 font-mono font-bold bg-amber-100 hover:bg-amber-200 text-slate-900 border-2 border-slate-900 shadow-[1px_1px_0_0_#0f172a] cursor-pointer flex items-center gap-1.5"
              >
                <span>📊 View Spreadsheet</span>
              </button>
              <button
                onClick={() => {
                  playRetroSound('select');
                  onOpenSettings();
                }}
                className="text-xs px-3 py-1.5 font-mono font-semibold pixel-btn-secondary cursor-pointer"
              >
                ⚙️ Sheet Endpoint
              </button>
              <button
                onClick={loadStudents}
                disabled={loading}
                className="text-xs px-3.5 py-1.5 font-pixel pixel-btn-primary cursor-pointer disabled:opacity-50"
              >
                {loading ? 'SYNCING...' : '🔄 REFRESH GET'}
              </button>
            </div>
          </div>

          {/* Filter / Search Toolbar */}
          <div className="p-4 sm:p-5 bg-white flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex-1 min-w-[260px]">
              <input
                type="text"
                placeholder="Search enrolled students by Name, Minecraft IGN, or Discord Handle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-2 border-slate-900 focus:border-rose-600 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 outline-hidden font-sans shadow-[2px_2px_0_0_#0f172a]"
              />
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600 font-mono">
              <span>
                Total Students: <strong className="text-slate-900 font-bold tabular-nums">{filteredStudents.length}</strong> / {students.length}
              </span>
            </div>
          </div>
        </div>

        {/* Roster Cards Grid */}
        {loading ? (
          <div className="p-12 text-center bg-white border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] text-slate-600 space-y-3">
            <div className="inline-block animate-spin text-3xl">⚙️</div>
            <p className="font-pixel text-xs text-slate-900">EXECUTING GET REQUEST TO GOOGLE SHEETS...</p>
            <p className="text-xs text-slate-500 font-mono">Retrieving student records from database</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center bg-white border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] text-slate-600 space-y-3">
            <span className="text-3xl">🔍</span>
            <p className="font-pixel text-xs text-slate-900">NO STUDENT RECORDS MATCHED SEARCH</p>
            <p className="text-xs text-slate-500 font-mono">Clear the search box to view all registered students.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => {
                  playRetroSound('select');
                  setSelectedStudentModal(student);
                }}
                className="group bg-white border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:shadow-[6px_6px_0_0_#0f172a] p-4 transition-all duration-150 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Top Bar: ID & Enrolled Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-xs text-slate-500 font-bold">{student.id}</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-500">
                      Enrolled
                    </span>
                  </div>

                  {/* Student Avatar (Minecraft Head) + Name & Handle */}
                  <div className="flex items-center gap-3.5 mb-3">
                    <MCPlayerHead username={student.mcUsername || student.name} size={48} />
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-slate-900 text-base group-hover:text-rose-600 transition-colors truncate">
                        {student.name}
                      </h4>
                      <div className="text-xs text-slate-600 font-mono font-semibold truncate">
                        {student.handle}
                      </div>
                      {student.mcUsername && student.mcUsername !== student.name && (
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          Skin: {student.mcUsername}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes (if any) */}
                  {student.notes && (
                    <p className="text-[11px] text-slate-600 italic line-clamp-2 bg-slate-50 p-2 border border-slate-200">
                      "{student.notes}"
                    </p>
                  )}
                </div>

                {/* Timestamp footer */}
                <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Enrolled: {student.timestamp.slice(0, 10)}</span>
                  <span className="text-rose-600 font-bold group-hover:translate-x-0.5 transition-transform">
                    View Passport →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Student Passport Modal */}
        {selectedStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-white border-4 border-slate-900 p-6 shadow-[8px_8px_0_0_#0f172a] text-slate-900 space-y-4">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={CAMPUS_ASSETS.logo}
                    alt="Bakumon Logo"
                    className="w-8 h-8 object-contain"
                  />
                  <div>
                    <span className="font-mono text-xs text-rose-600 font-bold block">STUDENT RECORD</span>
                    <h3 className="text-xl font-bold text-slate-900">{selectedStudentModal.name}</h3>
                  </div>
                </div>
                <button
                  onClick={() => {
                    playRetroSound('select');
                    setSelectedStudentModal(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-white hover:bg-rose-600 hover:text-white border-2 border-slate-900 text-slate-900 font-bold cursor-pointer shadow-[2px_2px_0_0_#0f172a]"
                >
                  ✕
                </button>
              </div>

              {/* Head & Info Box */}
              <div className="bg-slate-50 p-4 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] flex items-center gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <MCPlayerHead username={selectedStudentModal.mcUsername || selectedStudentModal.name} size={64} />
                  <span className="text-[10px] font-mono text-slate-500 font-semibold mt-1">
                    {selectedStudentModal.mcUsername || 'Skin'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs flex-1 overflow-hidden">
                  <div>
                    <span className="text-slate-500 font-medium">Student ID:</span>
                    <span className="font-mono font-bold text-slate-900 ml-1">{selectedStudentModal.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Discord:</span>
                    <span className="font-mono font-bold text-slate-900 ml-1 truncate">{selectedStudentModal.handle}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Status:</span>
                    <span className="text-emerald-700 font-bold ml-1">Confirmed Student</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Date:</span>
                    <span className="font-mono text-slate-700 ml-1">{selectedStudentModal.timestamp}</span>
                  </div>
                </div>
              </div>

              {selectedStudentModal.notes && (
                <div className="bg-slate-50 p-3 border border-slate-200 text-xs text-slate-700 italic">
                  "{selectedStudentModal.notes}"
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    playRetroSound('select');
                    setSelectedStudentModal(null);
                  }}
                  className="px-4 py-2 font-mono text-xs pixel-btn-secondary cursor-pointer"
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
