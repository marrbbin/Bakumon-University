import React from 'react';
import { CURRICULUM_SUBJECTS } from '../data/curriculumData';
import { SubjectType } from '../types';
import { playRetroSound } from '../utils/audio';

interface CurriculumSectionProps {
  onGoToEnrollment: (majorId?: SubjectType) => void;
}

export const CurriculumSection: React.FC<CurriculumSectionProps> = ({
  onGoToEnrollment,
}) => {
  return (
    <section id="curriculum" className="py-20 px-4 sm:px-6 bg-white border-b-2 border-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="mb-12 text-center max-w-3xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs font-mono font-semibold text-rose-600">
            <span>FLEXIBLE MAJOR TRACKS</span>
            <span aria-hidden="true">·</span>
            <span>PICK 1 OR MULTIPLE MAJORS</span>
            <span aria-hidden="true">·</span>
            <span>NAWAWA TERM 2026</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Choose Your Disciplines. Craft Your Degree.
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Bakumon University offers modular major tracks! Students may declare a single concentrated major, double-major, or cross-enroll in multiple disciplines across Competitive Battling, Breeding, Alchemical Brewing, and Berry Farming.
          </p>
        </div>

      {/* Curriculum Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {CURRICULUM_SUBJECTS.map((subject) => (
          <div
            key={subject.id}
            className="group relative bg-white border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:shadow-[6px_6px_0_0_#0f172a] transition-all duration-150 flex flex-col justify-between overflow-hidden"
          >
            {/* Top Image Banner */}
            <div 
              onClick={() => {
                playRetroSound('select');
                onGoToEnrollment(subject.id);
              }}
              className="relative aspect-16/10 w-full overflow-hidden bg-slate-100 border-b-2 border-slate-900 cursor-pointer"
            >
              <img
                src={subject.image}
                alt={subject.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
              />

              {/* Tag overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span 
                  className="px-2.5 py-1 text-[11px] font-pixel text-white border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a]"
                  style={{ backgroundColor: subject.accentColor }}
                >
                  {subject.id}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-900 bg-white border border-slate-900 shadow-[1px_1px_0_0_#0f172a]">
                  Major Track Available
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-semibold text-slate-500 block">
                  {subject.departmentName}
                </span>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-rose-600 transition-colors">
                  {subject.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {subject.summary}
                </p>
              </div>

              {/* Modules snippet */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider block">
                  Key Course Topics:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {subject.modules.slice(0, 2).map((m) => (
                    <div key={m.code} className="text-xs text-slate-700 flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400">{m.code}:</span>
                      <span className="truncate">{m.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card CTA */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-slate-500">
                  Faculty: <strong className="text-slate-800">{subject.instructor}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playRetroSound('confirm');
                    onGoToEnrollment(subject.id);
                  }}
                  className="px-4 py-2 text-xs font-pixel pixel-btn-primary cursor-pointer flex items-center gap-1.5"
                >
                  <span>Select {subject.id} Track</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
};
