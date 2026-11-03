import React, { useState } from 'react';
import { playRetroSound } from '../../utils/audio';

interface Ingredient {
  id: string;
  name: string;
  type: string;
  icon: string;
  flavor: string;
}

const INGREDIENTS: Ingredient[] = [
  { id: 'stardust', name: 'Stardust', type: 'Catalyst', icon: '✨', flavor: 'Extracted from Meteor Falls rocks.' },
  { id: 'revival_herb', name: 'Revival Herb', type: 'Herbal Bitter', icon: '🌿', flavor: 'Pungent herb with miraculous healing power.' },
  { id: 'protein_base', name: 'Nutrient Powder', type: 'Vitamin Base', icon: '🧪', flavor: 'Protein peptides for combat muscle growth.' },
  { id: 'moomoo_milk', name: 'Moomoo Milk', type: 'Solvent Base', icon: '🥛', flavor: 'Farm-fresh milk that balances bitter potions.' },
  { id: 'sitrus_rind', name: 'Sitrus Berry Rind', type: 'Botanical', icon: '🍊', flavor: 'Natural pectin rich in restoration vitamins.' },
];

export const BrewingCauldron: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>(['stardust', 'revival_herb']);
  const [brewing, setBrewing] = useState(false);
  const [craftedItem, setCraftedItem] = useState<{
    title: string;
    description: string;
    potency: string;
    icon: string;
  } | null>({
    title: 'Concentrated Max Revive Tincture',
    description: 'Fully restores a fainted Pokémon to 100% max HP on the spot. Mild friendship reduction due to herbal bitterness.',
    potency: '+100% Max HP Recovery',
    icon: '⚗️',
  });

  const toggleIngredient = (id: string) => {
    playRetroSound('select');
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((item) => item !== id));
      }
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleBrew = () => {
    setBrewing(true);
    playRetroSound('boot');
    setTimeout(() => {
      setBrewing(false);
      playRetroSound('confirm');

      const hasRevival = selectedIds.includes('revival_herb');
      const hasProtein = selectedIds.includes('protein_base');
      const hasMilk = selectedIds.includes('moomoo_milk');
      const hasBerry = selectedIds.includes('sitrus_rind');

      if (hasProtein && selectedIds.includes('stardust')) {
        setCraftedItem({
          title: 'Castelia Super-Protein Elixir',
          description: 'Infuses +10 Attack EVs instantly without gym training. Pure distilled combat vitality.',
          potency: '+10 Attack EVs',
          icon: '💪',
        });
      } else if (hasRevival && hasMilk) {
        setCraftedItem({
          title: 'Sweetened Herbal Panacea',
          description: 'Heals all status conditions (burn, sleep, toxic) while Moomoo milk nullifies the bitter taste penalty.',
          potency: 'Cures All Status & Grants +5 Friendship',
          icon: '🍵',
        });
      } else if (hasBerry) {
        setCraftedItem({
          title: 'Citrus Emergency Concoction',
          description: 'A concentrated tactical potion that can be applied in double battles for emergency sustain.',
          potency: '+120 HP Restored',
          icon: '🧪',
        });
      } else {
        setCraftedItem({
          title: 'Dire Hit Tactical Extract',
          description: 'Elevates critical hit stage by +2 for the active battle turn. Great for Sniper ability users.',
          potency: '+2 Critical Hit Ratio',
          icon: '⚡',
        });
      }
    }, 600);
  };

  return (
    <div className="bg-white border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] p-5 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-slate-200">
        <div>
          <span className="font-pixel text-xs text-purple-700">LAB BENCH 03</span>
          <h4 className="text-base font-bold text-slate-900 mt-0.5">Apothecary Synthesis Cauldron</h4>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Selected: <span className="font-bold text-purple-700">{selectedIds.length}/3 Reagents</span>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-slate-700 block mb-2 font-mono">
          Select 2 or 3 Reagents to Compound:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {INGREDIENTS.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleIngredient(item.id)}
                className={`p-3 text-left border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-50 border-purple-600 shadow-[2px_2px_0_0_#9333ea]'
                    : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500 shadow-[1px_1px_0_0_#cbd5e1]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[10px] uppercase font-mono px-1 bg-slate-100 text-slate-600 border border-slate-300">
                    {item.type}
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900">{item.name}</div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.flavor}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <button
          onClick={handleBrew}
          disabled={brewing || selectedIds.length < 2}
          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white font-pixel text-xs border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] cursor-pointer disabled:opacity-50"
        >
          {brewing ? 'COMPOUNDING IN CAULDRON...' : 'SYNTHESIZE FORMULA'}
        </button>
      </div>

      {craftedItem && (
        <div className="p-4 bg-purple-50 border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white border-2 border-slate-900 text-xl shrink-0 shadow-[1px_1px_0_0_#0f172a]">
              {craftedItem.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[11px] text-purple-900 font-bold">{craftedItem.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-purple-200 text-purple-900 font-bold">
                  {craftedItem.potency}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">{craftedItem.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
