import React from 'react';
import { useGardenStore } from '../../store/gardenStore';
import { ZoomControls } from './ZoomControls';
import { ZoneView } from './ZoneView';
import { ZoneCountView } from './ZoneCountView';
import { CellView } from './CellView';
import { SubcellView } from './SubcellView';
import { createTestPlan } from '@core/data/sampleGardens/testGarden';

export function GridLayout() {
  const zoomLevel = useGardenStore((state) => state.zoomLevel);
  const garden = useGardenStore((state) => state.garden);
  const setGarden = useGardenStore((state) => state.setGarden);
  const setPlan = useGardenStore((state) => state.setPlan);

  const handleLoadSampleData = () => {
    const { garden: testGarden, plan: testPlan } = createTestPlan();

    // Set garden and plan - projection will be automatically calculated
    setGarden(testGarden);
    setPlan(testPlan);
  };

  return (
    <div className="relative w-full h-full bg-gray-900">
      <ZoomControls />

      {!garden ? (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <p className="text-lg mb-4">No Garden Loaded</p>
            <p className="text-sm text-gray-500 mb-6">
              Use the config bar above to create a garden plan
            </p>
            <button
				id="jim"
              onClick={handleLoadSampleData}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Load Test Garden
            </button>
            <p className="text-xs text-gray-600 mt-3">
              (4000 sq ft with 150 plants: 3 corn + 3 potato varieties)
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full">
          {zoomLevel === 'zone' && <ZoneView />}
          {zoomLevel === 'zone-count' && <ZoneCountView />}
          {zoomLevel === 'cell' && <CellView />}
          {zoomLevel === 'subcell' && <SubcellView />}
        </div>
      )}
    </div>
  );
}
