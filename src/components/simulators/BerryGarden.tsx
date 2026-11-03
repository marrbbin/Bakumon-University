import React, { useState } from 'react';
import { playRetroSound } from '../../utils/audio';

type GrowthStage = 'Seed' | 'Sprout' | 'Bloom' | 'Ripe';

interface BerryPlot {
  id: number;
  berryName: string;
  stage: GrowthStage;
  moisture: number;
  mulch: 'None' | 'Growth Mulch' | 'Damp Mulch';
  yieldCount: number;
}

export const BerryGarden: React.FC = () => {
  const [plots, setPlots] = useState<BerryPlot[]>([
    { id: 1, berryName: 'Sitrus Berry', stage: 'Ripe', moisture: 80, mulch: 'Damp Mulch', yieldCount: 5 },
    { id: 2, berryName: 'Lum Berry', stage: 'Bloom', moisture: 60, mulch: 'Growth Mulch', yieldCount: 3 },
    { id: 3, berryName: 'Oran Berry', stage: 'Sprout', moisture: 45, mulch: 'None', yieldCount: 4 },
    { id: 4, berryName: 'Leppa Berry', stage: 'Seed', moisture: 30, mulch: 'Damp Mulch', yieldCount: 2 },
  ]);

  const [totalHarvested, setTotalHarvested] = useState(18);

  const waterPlot = (id: number) => {
    playRetroSound('select');
    setPlots((prev) =>
      prev.map((p) => (p.id === id ? { ...p, moisture: Math.min(100, p.moisture + 35) } : p))
    );
  };

  const advanceGrowthCycle = () => {
    playRetroSound('confirm');
    setPlots((prev) =>
      prev.map((p) => {
        let nextStage = p.stage;
        let newMoisture = Math.max(0, p.moisture - (p.mulch === 'Damp Mulch' ? 12 : 25));
        let newYield = p.yieldCount;

        if (p.stage === 'Seed') nextStage = 'Sprout';
        else if (p.stage === 'Sprout') nextStage = 'Bloom';
        else if (p.stage === 'Bloom') {
          nextStage = 'Ripe';
          if (p.moisture >= 50) newYield += 2;
        }

        return {
          ...p,
          stage: nextStage,
          moisture: newMoisture,
          yieldCount: newYield,
        };
      })
    );
  };

  const harvestPlot = (id: number) => {
    const plot = plots.find((p) => p.id === id);
    if (!plot || plot.stage !== 'Ripe') return;

    playRetroSound('fanfare');
    setTotalHarvested((prev) => prev + plot.yieldCount);
    setPlots((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stage: 'Seed', moisture: 50, yieldCount: 3 } : p))
    );
  };

  const getStageIcon = (stage: GrowthStage, name: string) => {
    if (stage === 'Seed') return '🌰';
    if (stage === 'Sprout') return '🌱';
    if (stage === 'Bloom') return '🌸';
    if (name.includes('Sitrus')) return '🍊';
    if (name.includes('Lum')) return '🫐';
    if (name.includes('Oran')) return '🍒';
    return '🍇';
  };

  return (
    <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] p-5 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-slate-200">
        <div>
          <span className="font-pixel text-xs text-emerald-700">LAB BENCH 04</span>
          <h4 className="text-base font-bold text-slate-900 mt-0.5">Abundant Loam Horticultural Bed</h4>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Total Harvested: <span className="text-emerald-700 font-bold">{totalHarvested} Berries</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {plots.map((plot) => (
          <div key={plot.id} className="bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] p-3 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-[11px] text-slate-500 font-bold">Plot #{plot.id}</span>
                <span className="text-[10px] bg-white border border-slate-300 px-1 text-slate-700 font-mono font-medium">{plot.mulch}</span>
              </div>
              <div className="text-center py-3 bg-white border border-slate-200 my-2">
                <div className="text-3xl mb-1">{getStageIcon(plot.stage, plot.berryName)}</div>
                <div className="text-xs font-bold text-slate-900">{plot.berryName}</div>
                <div className="text-[11px] text-emerald-700 font-mono font-semibold">Stage: {plot.stage}</div>
              </div>
              <div className="space-y-1 mb-2">
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Soil Moisture</span>
                  <span className="font-mono font-bold">{plot.moisture}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 border border-slate-300">
                  <div
                    className={`h-full ${plot.moisture > 40 ? 'bg-sky-500' : 'bg-amber-500'}`}
                    style={{ width: `${plot.moisture}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 pt-2 border-t border-slate-200">
              <button
                onClick={() => waterPlot(plot.id)}
                className="flex-1 py-1.5 text-xs bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-600 font-medium transition-colors cursor-pointer"
              >
                💧 Water
              </button>
              {plot.stage === 'Ripe' ? (
                <button
                  onClick={() => harvestPlot(plot.id)}
                  className="flex-1 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold border border-emerald-800 shadow-[1px_1px_0_0_#0f172a] cursor-pointer"
                >
                  🧺 Harvest ({plot.yieldCount})
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 py-1.5 text-xs bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                >
                  Growing...
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
        <span className="text-xs text-slate-500 font-medium">
          Pro-tip: Keep soil above 50% moisture before advancing to bloom to double harvest count.
        </span>
        <button
          onClick={advanceGrowthCycle}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-semibold text-xs border border-slate-900 shadow-[2px_2px_0_0_#0f172a] transition-colors cursor-pointer"
        >
          ⏩ Advance Growth Hour
        </button>
      </div>
    </div>
  );
};
