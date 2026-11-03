import React from 'react';
import { CAMPUS_ASSETS } from '../data/curriculumData';
import { playRetroSound } from '../utils/audio';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t-2 border-slate-900 bg-slate-50 text-slate-600 text-xs py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img
            src={CAMPUS_ASSETS.logo}
            alt="Bakumon Official Logo"
            className="w-8 h-8 object-contain"
          />
          <div>
            <span className="font-pixel text-xs text-slate-900 block">Bakumon University</span>
            <span className="text-[11px] text-slate-500 font-mono">
              Unova Pokémon Mechanics Roleplay & Research Academy
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-700">
          <a
            href="#curriculum"
            onClick={() => playRetroSound('select')}
            className="hover:text-rose-600 transition-colors"
          >
            The 4 Core Subjects
          </a>
          <a
            href="#enrollment"
            onClick={() => playRetroSound('select')}
            className="hover:text-rose-600 transition-colors"
          >
            PC Terminal
          </a>
          <a
            href="#roster"
            onClick={() => playRetroSound('select')}
            className="hover:text-rose-600 transition-colors"
          >
            Live Registry
          </a>
          <a
            href="#about"
            onClick={() => playRetroSound('select')}
            className="hover:text-rose-600 transition-colors"
          >
            Campus Code
          </a>
        </div>

        <div className="text-right font-mono text-[11px] text-slate-500">
          <div>Powered by Google Sheets REST API & Unova C-Gear</div>
          <div className="mt-0.5">Non-commercial roleplay project. Pokémon © Nintendo / Game Freak.</div>
        </div>
      </div>
    </footer>
  );
};
