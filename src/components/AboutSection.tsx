import React from 'react';
import { playRetroSound } from '../utils/audio';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-20 px-4 sm:px-6 bg-white border-b-2 border-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Information */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-rose-600">
            <span>CAMPUS LORE & INSTITUTIONAL HERITAGE</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Why Bakumon University?
          </h2>

          <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
            Founded during the golden era of the Unova Pokémon League, Bakumon University was established on a single principle: <strong>advanced battle and monster mechanics should not be gatekept by veteran tournament pros</strong>.
          </p>

          <p className="text-sm text-slate-600 leading-relaxed">
            Whether you've never hatched an egg or are trying to understand why your monster's speed doesn't match the Battle Subway benchmark, our collaborative roleplay community and hands-on simulation labs provide clear, step-by-step mentorship without elitism.
          </p>

          {/* Pillars List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 border-2 border-slate-900 space-y-1.5 shadow-[2px_2px_0_0_#0f172a]">
              <span className="font-pixel text-xs text-rose-600 block">01. ZERO SNOBBERY</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Beginners start from square one. No question about typing charts, EV yields, or nature mints is too basic.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-2 border-slate-900 space-y-1.5 shadow-[2px_2px_0_0_#0f172a]">
              <span className="font-pixel text-xs text-sky-600 block">02. ROLEPLAY COMMUNITY</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Engage in friendly dorm rivalries, share breeding hatchlings, and battle in sanctioned low-tier sparring leagues.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-2 border-slate-900 space-y-1.5 shadow-[2px_2px_0_0_#0f172a]">
              <span className="font-pixel text-xs text-purple-600 block">03. HANDS-ON SIMULATORS</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Interactive web labs simulate real Gen 5 battle maths, daycare mechanics, and medicine compounding.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-2 border-slate-900 space-y-1.5 shadow-[2px_2px_0_0_#0f172a]">
              <span className="font-pixel text-xs text-emerald-600 block">04. OPEN DATA ROSTER</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                All student registrations are persisted into Google Sheets so student councils can coordinate dorm squads anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Right Campus Rules / Dialogue Card */}
        <div className="lg:col-span-5 bg-white border-4 border-slate-900 p-6 space-y-4 shadow-[6px_6px_0_0_#0f172a]">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
            <span className="font-pixel text-xs text-slate-900">STUDENT CODE OF CONDUCT</span>
            <span className="text-[10px] font-mono font-bold text-rose-600">UNOVA BY-LAWS</span>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <span className="text-rose-600 font-bold shrink-0">I.</span>
              <p>Treat all Pokémon with respect. Friendship levels impact Return damage and apothecary medicine tolerance.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-rose-600 font-bold shrink-0">II.</span>
              <p>Always release breedject hatchlings responsibly or gift them to incoming first-year trainees at Castelia Square.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-rose-600 font-bold shrink-0">III.</span>
              <p>Water the berry farm loam after harvesting so the next student cultivator enjoys high moisture multiplier yields.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-rose-600 font-bold shrink-0">IV.</span>
              <p>Never forfeit in the middle of a Wi-Fi or Battle Subway link match. Learn from each defeat with tactical rigor.</p>
            </div>
          </div>

          <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-center text-[11px] font-mono text-slate-600">
            <span>Dormitory Head: Prof. DK</span>
            <a
              href="#enrollment"
              onClick={() => playRetroSound('select')}
              className="text-rose-600 font-bold hover:underline"
            >
              Apply for Term 2026 →
            </a>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
};
