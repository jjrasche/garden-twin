import React, { useEffect } from 'react';
import { ConfigBar } from './ConfigBar/ConfigBar';
import { LaborHeatmap } from './Timelines/LaborHeatmap';
import { WorkLog } from './Timelines/WorkLog';
import { HarvestTimeline } from './Timelines/HarvestTimeline';
import { GridLayout } from './GridLayout/GridLayout';
import { StatsPanel } from './Stats/StatsPanel';
import { useGardenStore } from '../store/gardenStore';
import { CORN_WAPSIE_VALLEY } from '@core/data/plantSpecies';
import { CORN_GOLDEN_BANTAM } from '../../../research/golden-bantam-corn/config';
import { CORN_STOWELLS_EVERGREEN } from '../../../research/stowells-evergreen-corn/config';
import { POTATO_RUSSET_BURBANK } from '../../../research/russet-burbank-potato/config';
import { POTATO_RED_NORLAND } from '../../../research/red-norland-potato/config';
import { POTATO_YUKON_GOLD } from '../../../research/yukon-gold-potato/config';

export function App() {
  const setSpecies = useGardenStore((state) => state.setSpecies);

  // Load plant species data on mount - all varieties used in testGarden
  useEffect(() => {
    setSpecies([
      CORN_GOLDEN_BANTAM,
      CORN_STOWELLS_EVERGREEN,
      CORN_WAPSIE_VALLEY,
      POTATO_RED_NORLAND,
      POTATO_YUKON_GOLD,
      POTATO_RUSSET_BURBANK,
    ]);
  }, [setSpecies]);

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-900 text-white">
      {/* Stats Panel - Top summary */}
      {/* <div className="h-[80px] shrink-0">
        <StatsPanel />
      </div> */}

      {/* Labor Heatmap - Calendar-style intensity view */}
      {/* <div className="h-[180px] shrink-0">
        <LaborHeatmap />
      </div> */}

      {/* Work Log - Detailed task table */}
      {/* <div className="h-[200px] shrink-0">
        <WorkLog />
      </div> */}

      {/* Main Grid View - Flexible, takes remaining space */}
      <div className="flex-1 min-h-0">
        <GridLayout />
      </div>

      {/* Harvest Timeline - Area chart */}
      {/* <div className="h-[240px] shrink-0">
        <HarvestTimeline />
      </div> */}

      {/* AI Config Chat - Collapsible, good height when expanded */}
      {/* <div className="h-[300px] shrink-0">
        <ConfigBar />
      </div> */}
    </div>
  );
}
