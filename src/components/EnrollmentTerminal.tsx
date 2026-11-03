import React, { useState } from 'react';
import { Enrollee } from '../types';
import { CAMPUS_ASSETS } from '../data/curriculumData';
import { submitEnrollee, getSheetEndpointUrl } from '../services/sheetService';
import { MCPlayerHead } from './MCPlayerHead';
import { playRetroSound } from '../utils/audio';

interface EnrollmentTerminalProps {
  onEnrollmentComplete: (newEnrollee: Enrollee) => void;
  onOpenSettings: () => void;
  onOpenDatabaseViewer: () => void;
}

export const EnrollmentTerminal: React.FC<EnrollmentTerminalProps> = ({
  onEnrollmentComplete,
  onOpenSettings,
  onOpenDatabaseViewer,
}) => {
  const [name, setName] = useState('');
  const [mcUsername, setMcUsername] = useState('');
  const [handle, setHandle] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [recentIdCard, setRecentIdCard] = useState<Enrollee | null>(null);
  const [terminalPower, setTerminalPower] = useState(true);

  // Active skin name for the head preview
  const activeSkin = mcUsername.trim() || name.trim() || 'Steve';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      playRetroSound('error');
      setStatusMessage('Error: Player name / IGN cannot be blank.');
      return;
    }
    if (!handle.trim()) {
      playRetroSound('error');
      setStatusMessage('Error: Discord handle is required for enrollment.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('UPLINKING TO PC TERMINAL... TRANSMITTING TO GOOGLE SHEETS...');
    playRetroSound('boot');

    try {
      const formattedHandle = handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`;
      const result = await submitEnrollee({
        name: name.trim(),
        mcUsername: activeSkin,
        handle: formattedHandle,
        notes: notes.trim(),
      });

      playRetroSound('fanfare');
      setIsSubmitting(false);
      setRecentIdCard(result.enrollee);
      setStatusMessage(result.message);
      onEnrollmentComplete(result.enrollee);

      // Reset fields
      setName('');
      setMcUsername('');
      setHandle('');
      setNotes('');
    } catch (err) {
      playRetroSound('error');
      setIsSubmitting(false);
      setStatusMessage(`Submission failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleResetCard = () => {
    playRetroSound('select');
    setRecentIdCard(null);
    setStatusMessage(null);
  };

  const endpointConfigured = Boolean(getSheetEndpointUrl());

  return (
    <section id="enrollment" className="py-20 px-4 sm:px-6 bg-[#f8fafc] border-b-2 border-slate-900">
      <div className="max-w-4xl mx-auto">
        {/* Terminal Exterior Box */}
        <div className="relative bg-white border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] overflow-hidden">
          {/* Terminal Header Bar */}
          <div className="bg-slate-100 px-4 py-3 border-b-2 border-slate-900 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-rose-600 rounded-full border border-slate-900" />
              <span className="w-3 h-3 bg-amber-400 rounded-full border border-slate-900" />
              <span className="w-3 h-3 bg-emerald-500 rounded-full border border-slate-900" />
              <span className="font-pixel text-xs text-slate-900 tracking-wide ml-1">
                BILL'S PC · NAWAWA NETWORK TERMINAL v5.2
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playRetroSound('select');
                  onOpenDatabaseViewer();
                }}
                className="text-xs px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-slate-900 border-2 border-slate-900 font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-[1px_1px_0_0_#0f172a]"
              >
                <span>📊 Database Table</span>
              </button>
              <button
                onClick={() => {
                  playRetroSound('select');
                  onOpenSettings();
                }}
                className="text-xs px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-900 font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-[1px_1px_0_0_#0f172a]"
              >
                <span>⚙️ Sheets API: {endpointConfigured ? 'Custom' : 'Local'}</span>
              </button>
              <button
                onClick={() => {
                  playRetroSound('select');
                  setTerminalPower(!terminalPower);
                }}
                className={`text-xs px-2.5 py-1 font-mono font-bold border-2 border-slate-900 cursor-pointer shadow-[1px_1px_0_0_#0f172a] ${
                  terminalPower
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-rose-100 text-rose-900'
                }`}
                title="Toggle PC Monitor"
              >
                PWR: {terminalPower ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Screen Area */}
          <div
            className={`p-5 sm:p-8 bg-white transition-opacity duration-300 ${
              terminalPower ? 'opacity-100' : 'opacity-20 pointer-events-none'
            }`}
          >
            {recentIdCard ? (
              /* Issued Student ID Card view with MC Player Head */
              <div className="max-w-xl mx-auto space-y-6">
                <div className="p-4 bg-emerald-50 border-2 border-slate-900 text-emerald-900 text-xs font-mono font-semibold shadow-[2px_2px_0_0_#0f172a]">
                  🎉 ENROLLMENT CONFIRMED! Player record synchronized to the university database.
                </div>

                {/* Physical Trainer ID Passport with Minecraft Player Head */}
                <div className="relative bg-white border-4 border-slate-900 p-6 shadow-[6px_6px_0_0_#0f172a] text-slate-900">
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={CAMPUS_ASSETS.logo}
                        alt="Bakumon Official Logo"
                        className="w-10 h-10 object-contain filter drop-shadow-xs"
                      />
                      <div>
                        <span className="font-pixel text-[10px] text-rose-600 block tracking-widest">
                          BAKUMON UNIVERSITY
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 tracking-wide">
                          STUDENT PASSPORT
                        </h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs text-slate-500 block">STUDENT ID</span>
                      <span className="font-mono text-sm font-bold text-rose-600">{recentIdCard.id}</span>
                    </div>
                  </div>

                  {/* Student Details & Head Avatar */}
                  <div className="flex items-start gap-4">
                    {/* Minecraft Player Head Avatar */}
                    <div className="flex flex-col items-center shrink-0">
                      <MCPlayerHead username={recentIdCard.mcUsername || recentIdCard.name} size={64} />
                      <span className="text-[10px] font-mono font-semibold text-slate-500 mt-1">
                        MC AVATAR
                      </span>
                    </div>

                    <div className="flex-1 space-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-mono font-semibold">Player IGN / Name</span>
                        <span className="font-bold text-slate-900 text-base">{recentIdCard.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-mono font-semibold">Discord Handle</span>
                          <span className="font-mono text-slate-900 font-bold text-xs">{recentIdCard.handle}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-mono font-semibold">Skin / IGN</span>
                          <span className="font-mono text-slate-700 text-xs truncate block">{recentIdCard.mcUsername || recentIdCard.name}</span>
                        </div>
                      </div>
                      {recentIdCard.notes && (
                        <div className="text-xs text-slate-700 italic bg-slate-50 p-2 border border-slate-300">
                          "{recentIdCard.notes}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barcode strip */}
                  <div className="mt-5 pt-3 border-t-2 border-slate-900 flex justify-between items-center text-[10px] font-mono text-slate-500">
                    <span className="font-semibold">NAWAWA REGISTRY CERTIFIED</span>
                    <span className="tracking-widest hidden sm:inline font-mono">||| | || |||| | ||| |||| |</span>
                    <span>{recentIdCard.timestamp}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleResetCard}
                    className="px-4 py-2 font-mono text-xs pixel-btn-secondary cursor-pointer"
                  >
                    ← Enroll Another Student
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        playRetroSound('select');
                        onOpenDatabaseViewer();
                      }}
                      className="px-3.5 py-2 font-mono text-xs font-bold bg-amber-100 hover:bg-amber-200 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] cursor-pointer"
                    >
                      📊 View Database Table
                    </button>
                    <a
                      href="#roster"
                      onClick={() => playRetroSound('select')}
                      className="px-5 py-2 font-pixel text-xs pixel-btn-accent cursor-pointer"
                    >
                      View in Live Roster ↓
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              /* Streamlined Enrollment Form */
              <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
                {/* Dialogue Box Intro */}
                <div className="bg-slate-50 border-2 border-slate-900 p-4 text-xs space-y-1 font-mono shadow-[3px_3px_0_0_#0f172a]">
                  <div className="text-rose-600 font-pixel text-[11px] flex items-center gap-2">
                    <span>PROFESSOR DK'S ENROLLMENT TERMINAL:</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    "Enter your player credentials below to enroll! Your Minecraft player head and SkinRestorer skin will sync automatically to the campus registry."
                  </p>
                </div>

                {/* Input Fields */}
                <div className="space-y-4">
                  {/* Name / IGN */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1 font-mono">
                      <span>Trainer Name / IGN</span>
                      <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Red, Hilbert, Touya, Ash"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white border-2 border-slate-900 focus:border-rose-600 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-hidden font-sans transition-colors shadow-[2px_2px_0_0_#0f172a]"
                    />
                  </div>

                  {/* Minecraft Skin / SkinRestorer Input with Live Head Preview */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between font-mono">
                      <span className="flex items-center gap-1">
                        <span>Minecraft IGN or SkinRestorer Skin</span>
                        <span className="text-slate-400 font-normal text-[11px]">(Cracked / SkinRestorer supported)</span>
                      </span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Leave blank to use Trainer Name, or enter SkinRestorer skin"
                        value={mcUsername}
                        onChange={(e) => setMcUsername(e.target.value)}
                        className="flex-1 bg-white border-2 border-slate-900 focus:border-rose-600 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-hidden font-mono transition-colors shadow-[2px_2px_0_0_#0f172a]"
                      />
                      {/* Live Head Avatar Preview */}
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] shrink-0">
                        <MCPlayerHead username={activeSkin} size={36} />
                        <span className="text-[10px] font-mono text-slate-600 font-semibold hidden sm:inline">Preview</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono block">
                      💡 If you are a cracked player using SkinRestorer, type the skin name you set in-game (e.g. from <code className="text-rose-600 font-bold">/skin &lt;name&gt;</code>).
                    </span>
                  </div>

                  {/* Discord / Contact Handle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1 font-mono">
                      <span>Discord / Contact Handle</span>
                      <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. @trainer_ash or discord_tag#1234"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      className="w-full bg-white border-2 border-slate-900 focus:border-rose-600 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-hidden font-mono transition-colors shadow-[2px_2px_0_0_#0f172a]"
                    />
                  </div>

                  {/* Optional Note */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 font-mono">
                      Note or Ambition (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={140}
                      placeholder="e.g. Ready for the Nawawa Gym Challenge!"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-white border-2 border-slate-900 focus:border-rose-600 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 outline-hidden font-sans transition-colors shadow-[2px_2px_0_0_#0f172a]"
                    />
                  </div>
                </div>

                {/* Status Message */}
                {statusMessage && (
                  <div className="p-3 bg-slate-100 border-2 border-slate-900 text-xs font-mono font-semibold text-rose-700 shadow-[2px_2px_0_0_#0f172a]">
                    {statusMessage}
                  </div>
                )}

                {/* Submit CTA */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-[11px] text-slate-500 font-mono">
                    Database: <span className="text-slate-900 font-bold">{endpointConfigured ? 'Remote Google Sheet API (POST)' : 'Local Persistent Simulation'}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3 font-pixel text-xs pixel-btn-accent cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'TRANSMITTING REGISTRATION...' : 'ENROLL IN BAKUMON UNIVERSITY'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
