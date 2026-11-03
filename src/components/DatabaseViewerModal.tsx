import React, { useState } from 'react';
import { Enrollee } from '../types';
import { MCPlayerHead } from './MCPlayerHead';
import { exportEnrolleesToCsv, getSheetEndpointUrl, getSheetWebUrl, setSheetWebUrl } from '../services/sheetService';
import { playRetroSound } from '../utils/audio';

interface DatabaseViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Enrollee[];
  onOpenSettings: () => void;
}

export const DatabaseViewerModal: React.FC<DatabaseViewerModalProps> = ({
  isOpen,
  onClose,
  students,
  onOpenSettings,
}) => {
  const [tab, setTab] = useState<'table' | 'connect'>('table');
  const [search, setSearch] = useState('');
  const [webUrlInput, setWebUrlInput] = useState(getSheetWebUrl());
  const [savedLinkMsg, setSavedLinkMsg] = useState(false);

  if (!isOpen) return null;

  const endpointUrl = getSheetEndpointUrl();
  const directWebUrl = getSheetWebUrl();

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.handle.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      (s.mcUsername && s.mcUsername.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDownloadCsv = () => {
    playRetroSound('confirm');
    const csvContent = exportEnrolleesToCsv(students);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bakumon_university_roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveWebUrl = () => {
    playRetroSound('confirm');
    setSheetWebUrl(webUrlInput);
    setSavedLinkMsg(true);
    setTimeout(() => setSavedLinkMsg(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a] my-auto text-slate-900 max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b-2 border-slate-900 bg-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <div>
              <span className="font-pixel text-xs text-slate-900 tracking-tight block">
                BAKUMON UNIVERSITY · SPREADSHEET DATABASE VIEWER
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {endpointUrl ? 'Remote Google Sheets Connected' : 'Campus Local Database (Simulation Mode)'} · {students.length} Total Records
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {directWebUrl && (
              <a
                href={directWebUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-mono font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-2 border-slate-900 flex items-center gap-1 shadow-[1px_1px_0_0_#0f172a]"
              >
                <span>Open Google Sheet</span>
                <span>↗</span>
              </a>
            )}
            <button
              onClick={() => {
                playRetroSound('select');
                onClose();
              }}
              className="w-8 h-8 flex items-center justify-center bg-white hover:bg-rose-600 hover:text-white border-2 border-slate-900 text-slate-900 font-bold transition-colors cursor-pointer shadow-[2px_2px_0_0_#0f172a]"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b-2 border-slate-900 bg-slate-50 px-5 pt-2 gap-2 text-xs font-mono">
          <button
            onClick={() => {
              playRetroSound('select');
              setTab('table');
            }}
            className={`px-4 py-2 border-t-2 border-x-2 font-bold cursor-pointer transition-colors ${
              tab === 'table'
                ? 'bg-white border-slate-900 text-slate-900 -mb-[2px] pb-[10px]'
                : 'bg-slate-100 border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Spreadsheet Table ({filtered.length})
          </button>
          <button
            onClick={() => {
              playRetroSound('select');
              setTab('connect');
            }}
            className={`px-4 py-2 border-t-2 border-x-2 font-bold cursor-pointer transition-colors ${
              tab === 'connect'
                ? 'bg-white border-slate-900 text-slate-900 -mb-[2px] pb-[10px]'
                : 'bg-slate-100 border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            🔗 Connect Your Live Google Sheet
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {tab === 'table' ? (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Filter table rows by name, handle, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-72 bg-white border-2 border-slate-900 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 font-sans shadow-[2px_2px_0_0_#0f172a] outline-hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadCsv}
                    className="px-3.5 py-1.5 text-xs font-mono font-semibold pixel-btn-secondary flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⬇ Export .CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      playRetroSound('select');
                      onClose();
                      onOpenSettings();
                    }}
                    className="px-3.5 py-1.5 text-xs font-mono font-semibold pixel-btn-primary flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⚙️ API Endpoint Setup</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {!endpointUrl && (
                <div className="p-3 bg-amber-50 border-2 border-slate-900 text-xs font-mono text-slate-800 flex flex-wrap items-center justify-between gap-2 shadow-[2px_2px_0_0_#0f172a]">
                  <span>
                    ℹ️ <strong>Current Mode:</strong> Enrollees are currently stored in browser local memory. To see submissions populate directly into your Google Sheets file, connect your sheet API endpoint in the "Connect Your Live Google Sheet" tab!
                  </span>
                  <button
                    onClick={() => setTab('connect')}
                    className="underline text-rose-700 font-bold hover:text-rose-900 cursor-pointer"
                  >
                    Connect Sheet →
                  </button>
                </div>
              )}

              {/* Table View (styled like Google Sheets) */}
              <div className="overflow-x-auto border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 font-mono text-[11px] border-b-2 border-slate-900 select-none">
                      <th className="p-2 border-r border-slate-300 w-10 text-center font-bold">#</th>
                      <th className="p-2 border-r border-slate-300 font-bold">id</th>
                      <th className="p-2 border-r border-slate-300 font-bold">name</th>
                      <th className="p-2 border-r border-slate-300 font-bold">mcUsername</th>
                      <th className="p-2 border-r border-slate-300 font-bold">handle</th>
                      <th className="p-2 border-r border-slate-300 font-bold">timestamp</th>
                      <th className="p-2 border-r border-slate-300 font-bold">status</th>
                      <th className="p-2 font-bold">notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {filtered.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 border-r border-slate-200 text-center text-slate-400 bg-slate-100/50">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-bold text-rose-600">{s.id}</td>
                        <td className="p-2 border-r border-slate-200 font-sans font-semibold text-slate-900">
                          {s.name}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="flex items-center gap-2">
                            <MCPlayerHead username={s.mcUsername || s.name} size={20} />
                            <span>{s.mcUsername || s.name}</span>
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-700">{s.handle}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-500 text-[11px]">{s.timestamp}</td>
                        <td className="p-2 border-r border-slate-200">
                          <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-400">
                            {s.status || 'Enrolled'}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600 text-[11px] truncate max-w-xs">{s.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Connect Tab */
            <div className="space-y-5 text-xs text-slate-700">
              <div className="bg-slate-50 border-2 border-slate-900 p-4 space-y-2 shadow-[2px_2px_0_0_#0f172a]">
                <h4 className="font-bold text-slate-900 text-sm">
                  Why don't I see rows in my Google Sheet yet?
                </h4>
                <p className="leading-relaxed">
                  Google Sheets is a cloud document, not an open public database. To allow a website to write rows to your Google Sheet without requiring every student to log into your personal Google account, your Google Sheet must be connected via an <strong>API Endpoint wrapper</strong> (such as <strong>SheetDB.io</strong>) or a free <strong>Google Apps Script Web App</strong>.
                </p>
              </div>

              {/* Option 1: SheetDB */}
              <div className="bg-white border-2 border-slate-900 p-4 space-y-3 shadow-[3px_3px_0_0_#0f172a]">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-xs text-rose-600">OPTION 1 (EASIEST · 1 MINUTE)</span>
                  <span className="text-[11px] font-mono font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 border border-emerald-400">
                    Recommended
                  </span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                  <li>
                    Open or create your Google Sheet with column headers on Row 1: <br />
                    <code className="text-rose-700 font-mono font-bold bg-slate-100 px-1 py-0.5 border border-slate-300">
                      id, name, mcUsername, handle, timestamp, status, notes
                    </code>
                  </li>
                  <li>
                    Go to <a href="https://sheetdb.io" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">SheetDB.io</a> (free) and click <strong>"Create API"</strong>.
                  </li>
                  <li>
                    Paste your Google Sheet's URL. SheetDB will generate a REST API endpoint like: <br />
                    <code className="text-slate-800 font-mono bg-slate-100 px-1 py-0.5 border border-slate-300">
                      https://sheetdb.io/api/v1/YOUR_SHEET_ID
                    </code>
                  </li>
                  <li>
                    Click the <strong>"⚙️ Sheet Endpoint"</strong> button in the navbar or terminal, paste that URL, and save! All new enrollments will immediately appear as rows in your Google Sheet!
                  </li>
                </ol>
              </div>

              {/* Direct Link to open Google Sheet */}
              <div className="bg-white border-2 border-slate-900 p-4 space-y-2.5 shadow-[3px_3px_0_0_#0f172a]">
                <span className="font-pixel text-xs text-slate-900">
                  SAVE YOUR DIRECT GOOGLE SPREADSHEET LINK
                </span>
                <p className="text-slate-600">
                  Paste your Google Sheet viewing link below so you or your staff can open the spreadsheet directly from the portal:
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                    value={webUrlInput}
                    onChange={(e) => setWebUrlInput(e.target.value)}
                    className="flex-1 bg-white border-2 border-slate-900 px-3 py-1.5 text-xs text-slate-900 font-mono outline-hidden shadow-[2px_2px_0_0_#0f172a]"
                  />
                  <button
                    onClick={handleSaveWebUrl}
                    className="px-4 py-1.5 font-mono font-semibold text-xs pixel-btn-primary cursor-pointer"
                  >
                    Save Link
                  </button>
                </div>
                {savedLinkMsg && (
                  <span className="text-xs text-emerald-700 font-bold font-mono">
                    ✓ Google Sheet link saved! You can now click "Open Google Sheet ↗" anytime.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t-2 border-slate-900 bg-slate-50">
          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-1.5 text-xs font-mono font-semibold pixel-btn-secondary cursor-pointer"
          >
            ⬇ Download Full Database CSV
          </button>
          <button
            onClick={() => {
              playRetroSound('select');
              onClose();
            }}
            className="px-5 py-2 font-mono text-xs pixel-btn-primary cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
