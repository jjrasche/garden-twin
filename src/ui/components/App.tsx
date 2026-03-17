import React, { useState } from 'react';
import { SeasonView } from './SeasonView/SeasonView';
import { HarvestTimeline } from './Timelines/HarvestTimeline';
import { LaborTimeline } from './Timelines/LaborTimeline';
import { ConditionTimeline } from './Timelines/ConditionTimeline';
import { GridLayout } from './GridLayout/GridLayout';

type Tab = 'season' | 'map' | 'yield' | 'conditions' | 'labor';

const TABS: { id: Tab; label: string }[] = [
  { id: 'season', label: 'Season' },
  { id: 'map', label: 'Map' },
  { id: 'yield', label: 'Production' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'labor', label: 'Labor' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('season');

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
        {activeTab === 'season' && <SeasonView />}
        {activeTab === 'map' && <GridLayout />}
        {activeTab === 'yield' && <HarvestTimeline />}
        {activeTab === 'conditions' && <ConditionTimeline />}
        {activeTab === 'labor' && <LaborTimeline />}
      </div>
    </div>
  );
}
