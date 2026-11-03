import React, { useState } from 'react';
import { playRetroSound } from '../../utils/audio';

interface PokemonParent {
  name: string;
  species: string;
  eggGroups: string[];
  gender: 'Male' | 'Female' | 'Genderless';
  defaultNature: string;
  defaultIvs: string;
}

const CANDIDATES: PokemonParent[] = [
  { name: 'Lucario', species: 'Lucario', eggGroups: ['Field', 'Human-Like'], gender: 'Male', defaultNature: 'Jolly', defaultIvs: '31/31/31/15/28/31' },
  { name: 'Zoroark', species: 'Zoroark', eggGroups: ['Field'], gender: 'Female', defaultNature: 'Timid', defaultIvs: '28/12/30/31/31/31' },
  { name: 'Ditto (Foreign 6IV)', species: 'Ditto', eggGroups: ['Ditto'], gender: 'Genderless', defaultNature: 'Modest', defaultIvs: '31/31/31/31/31/31' },
  { name: 'Charizard', species: 'Charizard', eggGroups: ['Monster', 'Dragon'], gender: 'Male', defaultNature: 'Adamant', defaultIvs: '31/31/25/10/24/31' },
  { name: 'Haxorus', species: 'Haxorus', eggGroups: ['Monster', 'Dragon'], gender: 'Female', defaultNature: 'Jolly', defaultIvs: '31/31/31/20/30/31' },
  { name: 'Gengar', species: 'Gengar', eggGroups: ['Amorphous'], gender: 'Male', defaultNature: 'Timid', defaultIvs: '25/14/28/31/30/31' },
  { name: 'Reuniclus', species: 'Reuniclus', eggGroups: ['Amorphous'], gender: 'Female', defaultNature: 'Quiet', defaultIvs: '31/0/31/31/31/0' },
];

export const BreedingLab: React.FC = () => {
  const [parentAIdx, setParentAIdx] = useState(0);
  const [parentBIdx, setParentBIdx] = useState(1);
  const [parentAHeld, setParentAHeld] = useState<'None' | 'Everstone' | 'Power Bracer (Atk)' | 'Destiny Knot'>('Everstone');
  const [parentBHeld, setParentBHeld] = useState<'None' | 'Everstone' | 'Power Anklet (Spe)' | 'Destiny Knot'>('Power Anklet (Spe)');

  const parentA = CANDIDATES[parentAIdx];
  const parentB = CANDIDATES[parentBIdx];

  const checkCompatibility = () => {
    if (parentA.name === parentB.name && parentA.species === 'Ditto') {
      return { compatible: false, rate: '0%', reason: 'Two Ditto cannot breed with each other.' };
    }
    const isDittoPair = parentA.eggGroups.includes('Ditto') || parentB.eggGroups.includes('Ditto');
    const sharedGroup = parentA.eggGroups.some((g) => parentB.eggGroups.includes(g));

    if (isDittoPair || sharedGroup) {
      if (parentA.gender === parentB.gender && !isDittoPair) {
        return { compatible: false, rate: '0%', reason: 'Same gender without a Ditto surrogate.' };
      }
      return {
        compatible: true,
        rate: '70% Egg Chance per 256 Steps',
        reason: 'Compatible Egg Group kinship detected! Daycare man notes: "The two seem to get along very well!"',
      };
    }

    return {
      compatible: false,
      rate: '0%',
      reason: 'Incompatible Egg Groups. They prefer to play with other Pokémon.',
    };
  };

  const result = checkCompatibility();

  const getOffspringSpecies = () => {
    if (!result.compatible) return 'No Egg Produced';
    if (parentA.species === 'Ditto') return `${parentB.species} Egg`;
    if (parentB.species === 'Ditto') return `${parentA.species} Egg`;
    return parentA.gender === 'Female' ? `${parentA.species} Egg` : `${parentB.species} Egg`;
  };

  const getNatureInherited = () => {
    if (parentAHeld === 'Everstone' && parentBHeld === 'Everstone') {
      return `50% ${parentA.defaultNature} / 50% ${parentB.defaultNature} (Both hold Everstone)`;
    }
    if (parentAHeld === 'Everstone') return `100% Guaranteed: ${parentA.defaultNature} (Everstone passed)`;
    if (parentBHeld === 'Everstone') return `100% Guaranteed: ${parentB.defaultNature} (Everstone passed)`;
    return 'Random Unlocked Nature (1 of 25)';
  };

  return (
    <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] p-5 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-slate-200">
        <div>
          <span className="font-pixel text-xs text-sky-600">LAB BENCH 02</span>
          <h4 className="text-base font-bold text-slate-900 mt-0.5">Daycare Genetics & Compatibility Analyzer</h4>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Gen 5 Unova Daycare Standards
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Parent A */}
        <div className="bg-slate-50 p-4 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a]">
          <div className="text-xs font-bold text-sky-700 mb-2 font-mono">PARENT A (Specimen 1)</div>
          <select
            value={parentAIdx}
            onChange={(e) => {
              setParentAIdx(parseInt(e.target.value, 10));
              playRetroSound('select');
            }}
            className="w-full bg-white border-2 border-slate-900 p-2 text-xs text-slate-900 mb-2.5 font-medium cursor-pointer"
          >
            {CANDIDATES.map((c, i) => (
              <option key={c.name} value={i} disabled={i === parentBIdx}>
                {c.name} ({c.gender}) · {c.eggGroups.join('/')}
              </option>
            ))}
          </select>
          <div className="text-xs space-y-1 text-slate-700">
            <div>Nature: <span className="font-mono font-bold text-slate-900">{parentA.defaultNature}</span></div>
            <div>Egg Groups: <span className="text-sky-700 font-semibold">{parentA.eggGroups.join(', ')}</span></div>
            <div>IV Profile: <span className="font-mono text-slate-500 text-[11px]">{parentA.defaultIvs}</span></div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200">
            <label className="text-[11px] text-slate-500 block mb-1 font-semibold">Held Item:</label>
            <select
              value={parentAHeld}
              onChange={(e) => {
                setParentAHeld(e.target.value as any);
                playRetroSound('select');
              }}
              className="w-full bg-white border border-slate-900 p-1.5 text-xs text-slate-900 cursor-pointer"
            >
              <option value="None">None</option>
              <option value="Everstone">Everstone (Nature Lock)</option>
              <option value="Power Bracer (Atk)">Power Bracer (Passes Atk IV)</option>
              <option value="Destiny Knot">Destiny Knot (Passes 5 IVs)</option>
            </select>
          </div>
        </div>

        {/* Parent B */}
        <div className="bg-slate-50 p-4 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a]">
          <div className="text-xs font-bold text-sky-700 mb-2 font-mono">PARENT B (Specimen 2)</div>
          <select
            value={parentBIdx}
            onChange={(e) => {
              setParentBIdx(parseInt(e.target.value, 10));
              playRetroSound('select');
            }}
            className="w-full bg-white border-2 border-slate-900 p-2 text-xs text-slate-900 mb-2.5 font-medium cursor-pointer"
          >
            {CANDIDATES.map((c, i) => (
              <option key={c.name} value={i} disabled={i === parentAIdx}>
                {c.name} ({c.gender}) · {c.eggGroups.join('/')}
              </option>
            ))}
          </select>
          <div className="text-xs space-y-1 text-slate-700">
            <div>Nature: <span className="font-mono font-bold text-slate-900">{parentB.defaultNature}</span></div>
            <div>Egg Groups: <span className="text-sky-700 font-semibold">{parentB.eggGroups.join(', ')}</span></div>
            <div>IV Profile: <span className="font-mono text-slate-500 text-[11px]">{parentB.defaultIvs}</span></div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200">
            <label className="text-[11px] text-slate-500 block mb-1 font-semibold">Held Item:</label>
            <select
              value={parentBHeld}
              onChange={(e) => {
                setParentBHeld(e.target.value as any);
                playRetroSound('select');
              }}
              className="w-full bg-white border border-slate-900 p-1.5 text-xs text-slate-900 cursor-pointer"
            >
              <option value="None">None</option>
              <option value="Everstone">Everstone (Nature Lock)</option>
              <option value="Power Anklet (Spe)">Power Anklet (Passes Spe IV)</option>
              <option value="Destiny Knot">Destiny Knot (Passes 5 IVs)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Result Card */}
      <div className={`p-4 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] ${result.compatible ? 'bg-sky-50' : 'bg-rose-50'}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{result.compatible ? '🥚' : '❌'}</span>
            <span className="font-pixel text-xs text-slate-900">
              {result.compatible ? 'COMPATIBLE PAIR FOUND' : 'INCOMPATIBLE PAIRING'}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-sky-700">{result.rate}</span>
        </div>
        <p className="text-xs text-slate-700 mb-3">{result.reason}</p>

        {result.compatible && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-300 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Offspring Species: </span>
              <span className="font-bold text-slate-900">{getOffspringSpecies()}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Inherited Nature: </span>
              <span className="font-bold text-emerald-700">{getNatureInherited()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
