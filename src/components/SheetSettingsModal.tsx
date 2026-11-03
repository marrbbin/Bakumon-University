import React, { useState, useEffect } from 'react';
import { getSheetEndpointUrl, setSheetEndpointUrl, testSheetConnection } from '../services/sheetService';
import { playRetroSound } from '../utils/audio';

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEndpointUpdated: () => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  isOpen,
  onClose,
  onEndpointUpdated,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrlInput(getSheetEndpointUrl());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    playRetroSound('confirm');
    setSheetEndpointUrl(urlInput);
    onEndpointUpdated();
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    playRetroSound('boot');
    setTestResult(null);
    const result = await testSheetConnection(urlInput);
    setTesting(false);
    setTestResult(result);
    if (result.ok) {
      playRetroSound('fanfare');
    } else {
      playRetroSound('error');
    }
  };

  const handleClear = () => {
    playRetroSound('select');
    setUrlInput('');
    setSheetEndpointUrl('');
    setTestResult({ ok: true, message: 'Switched to Campus Persistent Local Mode. Data will save in browser memory.' });
    onEndpointUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a] p-6 text-slate-900 space-y-5">
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
          <div>
            <span className="font-pixel text-[11px] text-rose-600 block">CONFIGURATION TERMINAL</span>
            <h3 className="text-xl font-bold text-slate-900">Google Sheets Serverless Database Setup</h3>
          </div>
          <button
            onClick={() => {
              playRetroSound('select');
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center bg-white hover:bg-rose-600 hover:text-white border-2 border-slate-900 text-slate-900 font-bold cursor-pointer shadow-[2px_2px_0_0_#0f172a]"
          >
            ✕
          </button>
        </div>

        {/* Informational guide */}
        <div className="bg-slate-50 border-2 border-slate-900 p-4 text-xs space-y-2 leading-relaxed text-slate-700 shadow-[2px_2px_0_0_#0f172a]">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <span>📊 How Google Sheets Database Integration Works:</span>
          </div>
          <p>
            Bakumon University connects to Google Sheets via standard RESTful wrappers like <strong>SheetDB.io</strong> or <strong>SteinHQ.com</strong>.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 font-mono">
            <li>Create a Google Sheet with headers: <code className="text-rose-600 font-bold">id, name, mcUsername, handle, timestamp, status, notes</code>.</li>
            <li>Connect the sheet at <a href="https://sheetdb.io" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">SheetDB.io</a> to obtain a free REST API endpoint.</li>
            <li>Paste your endpoint URL below (or configure <code className="text-rose-600 font-bold">VITE_GOOGLE_SHEETS_API_URL</code> in <code className="text-slate-800">.env</code>).</li>
          </ol>
        </div>

        {/* Input box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 block font-mono">
            Google Sheets API Endpoint URL:
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://sheetdb.io/api/v1/YOUR_SHEET_ID"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-white border-2 border-slate-900 focus:border-rose-600 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 font-mono outline-hidden shadow-[2px_2px_0_0_#0f172a]"
            />
            <button
              onClick={handleTest}
              disabled={testing || !urlInput.trim()}
              className="px-4 py-2 font-mono font-semibold text-xs pixel-btn-secondary disabled:opacity-40 transition-colors cursor-pointer"
            >
              {testing ? 'Testing...' : 'Test GET'}
            </button>
          </div>
        </div>

        {/* Test result status */}
        {testResult && (
          <div
            className={`p-3 border-2 border-slate-900 text-xs font-mono font-semibold shadow-[2px_2px_0_0_#0f172a] ${
              testResult.ok
                ? 'bg-emerald-50 text-emerald-900'
                : 'bg-rose-50 text-rose-900'
            }`}
          >
            {testResult.message}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-slate-900">
          <button
            onClick={handleClear}
            className="text-xs text-rose-600 hover:text-rose-800 font-mono font-bold transition-colors cursor-pointer"
          >
            Reset to Local Simulated Mode
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                playRetroSound('select');
                onClose();
              }}
              className="px-4 py-2 text-xs font-mono font-semibold pixel-btn-secondary cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 font-pixel text-xs pixel-btn-primary cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
