import React from 'react';
import { CurriculumSubject } from '../types';
import { EvCalculator } from './simulators/EvCalculator';
import { BreedingLab } from './simulators/BreedingLab';
import { BrewingCauldron } from './simulators/BrewingCauldron';
import { BerryGarden } from './simulators/BerryGarden';
import { playRetroSound } from '../utils/audio';

interface CurriculumModalProps {
  subject: CurriculumSubject | null;
  onClose: () => void;
  onGoToEnrollment: () => void;
}

export const CurriculumModal: React.FC<CurriculumModalProps> = ({
  subject,
  onClose,
  onGoToEnrollment,
}) => {
  if (!subject) return null;

  const renderSimulator = () => {
    switch (subject.id) {
      case 'Battling':
        return <EvCalculator />;
      case 'Breeding':
        return <BreedingLab />;
      case 'Brewing':
        return <BrewingCauldron />;
      case 'Berry Farming':
        return <BerryGarden />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a] my-auto text-slate-900 max-h-[92vh] flex flex-col">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-slate-900 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <span 
              className="w-3.5 h-3.5 border border-slate-900" 
              style={{ backgroundColor: subject.accentColor }} 
            />
            <span className="font-pixel text-xs tracking-tight text-slate-900 uppercase">
              {subject.departmentName}
            </span>
          </div>
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Banner Hero */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center bg-slate-50 p-4 border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a]">
            <div className="relative aspect-4/3 w-full overflow-hidden border-2 border-slate-900">
              <img
                src={subject.image}
                alt={subject.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-2 left-2 text-[10px] font-pixel text-white bg-slate-950 px-2 py-0.5 border border-white">
                MAJOR TRACK
              </span>
            </div>
            <div className="md:col-span-2 space-y-2">
              <span className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: subject.accentColor }}>
                Bakumon University Curriculum · Selectable Major Track
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{subject.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{subject.summary}</p>
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                <span>Faculty: <strong className="text-slate-800">{subject.instructor}</strong></span>
                <span aria-hidden="true">·</span>
                <span>{subject.instructorTitle}</span>
              </div>
            </div>
          </div>

          {/* Interactive Lab Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-pixel text-xs text-rose-600">
                HANDS-ON LABORATORY BENCH
              </h4>
              <span className="text-xs text-slate-500 font-mono">Interactive Subject Simulator</span>
            </div>
            {renderSimulator()}
          </div>

          {/* Syllabus Modules */}
          <div className="space-y-3">
            <h4 className="font-pixel text-xs text-slate-900">
              SUBJECT MODULES
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {subject.modules.map((m) => (
                <div key={m.code} className="bg-white border-2 border-slate-900 p-3.5 space-y-2 shadow-[2px_2px_0_0_#0f172a]">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-slate-500">{m.code}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 font-mono border border-slate-300">Required</span>
                  </div>
                  <h5 className="font-semibold text-xs text-slate-900 leading-tight">{m.title}</h5>
                  <p className="text-xs text-slate-600 leading-normal">{m.description}</p>
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-rose-700 font-mono font-medium">
                    💡 {m.keyTakeaway}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Outcomes */}
          <div className="bg-slate-50 border-2 border-slate-900 p-4 space-y-2 shadow-[2px_2px_0_0_#0f172a]">
            <h4 className="font-pixel text-xs text-slate-900">STUDENT OUTCOMES</h4>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {subject.learningOutcomes.map((outcome, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold shrink-0">✓</span>
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t-2 border-slate-900 bg-slate-50">
          <button
            onClick={() => {
              playRetroSound('select');
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Back to Campus
          </button>
          <button
            onClick={() => {
              playRetroSound('confirm');
              onGoToEnrollment();
            }}
            className="px-5 py-2.5 font-pixel text-xs pixel-btn-accent cursor-pointer flex items-center gap-1.5"
          >
            <span>Enroll with {subject.id} Track</span>
            <span>↓</span>
          </button>
        </div>
      </div>
    </div>
  );
};
