import React, { useState } from 'react';
import { playRetroSound } from '../../utils/audio';

interface StatEV {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export const EvCalculator: React.FC = () => {
  const [evs, setEvs] = useState<StatEV>({
    hp: 4,
    atk: 252,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 252,
  });

  const totalUsed = Object.values(evs).reduce((a, b) => a + b, 0);
  const remaining = 510 - totalUsed;

  const handleUpdate = (stat: keyof StatEV, val: number) => {
    const clamped = Math.max(0, Math.min(252, val));
    const diff = clamped - evs[stat];
    if (diff > remaining) {
      const allowed = evs[stat] + remaining;
      setEvs((prev) => ({ ...prev, [stat]: allowed }));
    } else {
      setEvs((prev) => ({ ...prev, [stat]: clamped }));
    }
    playRetroSound('select');
  };

  const applyPreset = (presetName: string) => {
    playRetroSound('confirm');
    if (presetName === 'sweeper') {
      setEvs({ hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 });
    } else if (presetName === 'special_sweeper') {
      setEvs({ hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 });
    } else if (presetName === 'wall') {
      setEvs({ hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 });
    } else {
      setEvs({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
    }
  };

  const stats: { key: keyof StatEV; label: string; color: string }[] = [
    { key: 'hp', label: 'HP', color: 'bg-emerald-500' },
    { key: 'atk', label: 'Attack', color: 'bg-rose-500' },
    { key: 'def', label: 'Defense', color: 'bg-amber-500' },
    { key: 'spa', label: 'Sp. Atk', color: 'bg-blue-500' },
    { key: 'spd', label: 'Sp. Def', color: 'bg-cyan-500' },
    { key: 'spe', label: 'Speed', color: 'bg-purple-500' },
  ];

  return (
    <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] p-5 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-slate-200">
        <div>
          <span className="font-pixel text-xs text-rose-600">LAB BENCH 01</span>
          <h4 className="text-base font-bold text-slate-900 mt-0.5">EV Calculus Simulator (Gen 5)</h4>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Total EV Cap: <span className="font-mono tabular-nums text-slate-900 font-bold">510</span></div>
          <div className="text-xs font-semibold">
            Remaining: <span className={`font-mono tabular-nums font-bold ${remaining === 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{remaining} EVs</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {stats.map(({ key, label, color }) => {
          const value = evs[key];
          const statBoost = Math.floor(value / 4);
          const percent = (value / 252) * 100;
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-800 w-16">{label}</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  +{statBoost} Stat Points at Lv.100
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="252"
                    step="4"
                    value={value}
                    onChange={(e) => handleUpdate(key, parseInt(e.target.value, 10))}
                    className="w-28 sm:w-36 accent-rose-600 cursor-pointer"
                  />
                  <span className="font-mono tabular-nums font-bold text-slate-900 w-12 text-right">
                    {value}
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-100 border border-slate-300">
                <div className={`h-full ${color} transition-all duration-150`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500 font-medium">Quick Competitive Spreads:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => applyPreset('sweeper')}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-900 font-mono transition-colors shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
          >
            Phys Sweeper
          </button>
          <button
            onClick={() => applyPreset('special_sweeper')}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-900 font-mono transition-colors shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
          >
            Spec Sweeper
          </button>
          <button
            onClick={() => applyPreset('wall')}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-900 font-mono transition-colors shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
          >
            Phys Wall
          </button>
          <button
            onClick={() => applyPreset('reset')}
            className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-400 font-mono transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
