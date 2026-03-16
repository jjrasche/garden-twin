import React, { useState, useEffect } from 'react';
import { HarvestTimeline } from './Timelines/HarvestTimeline';
import { LaborTimeline } from './Timelines/LaborTimeline';
import { ConditionTimeline } from './Timelines/ConditionTimeline';
import { GridLayout } from './GridLayout/GridLayout';
import { useGardenStore } from '../store/gardenStore';
import { CORN_WAPSIE_VALLEY, TOMATO_BETTER_BOY } from '@core/data/plantSpecies';
import { CORN_GOLDEN_BANTAM } from '../../../research/golden-bantam-corn/config';
import { CORN_STOWELLS_EVERGREEN } from '../../../research/stowells-evergreen-corn/config';
import { POTATO_RUSSET_BURBANK } from '../../../research/russet-burbank-potato/config';
import { POTATO_RED_NORLAND } from '../../../research/red-norland-potato/config';
import { POTATO_YUKON_GOLD } from '../../../research/yukon-gold-potato/config';

type Tab = 'map' | 'yield' | 'conditions' | 'labor';

const TABS: { id: Tab; label: string }[] = [
  { id: 'map', label: 'Garden Map' },
  { id: 'yield', label: 'Production Timeline' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'labor', label: 'Labor' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const setSpecies = useGardenStore((state) => state.setSpecies);

  useEffect(() => {
    setSpecies([
      CORN_GOLDEN_BANTAM,
      CORN_STOWELLS_EVERGREEN,
      CORN_WAPSIE_VALLEY,
      TOMATO_BETTER_BOY,
      POTATO_RED_NORLAND,
      POTATO_YUKON_GOLD,
      POTATO_RUSSET_BURBANK,
    ]);
  }, [setSpecies]);

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-900 text-white">
      <header className="h-10 shrink-0 flex items-center border-b border-gray-700 px-4 gap-1">
        <span className="text-sm font-semibold text-gray-300 mr-4">Garden Twin</span>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 text-xs rounded-t transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-800 text-white border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </header>

      <div className="flex-1 min-h-0">
        {activeTab === 'map' && <GridLayout />}
        {activeTab === 'yield' && <HarvestTimeline />}
        {activeTab === 'conditions' && <ConditionTimeline />}
        {activeTab === 'labor' && <LaborTimeline />}
      </div>
    </div>
  );
}
