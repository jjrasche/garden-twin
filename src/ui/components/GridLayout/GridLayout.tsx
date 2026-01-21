import React, { useEffect } from 'react';
import { useGardenStore } from '../../store/gardenStore';
import { ZoomControls } from './ZoomControls';
import { ZoneView as GardenView } from './ZoneView';
import { CellView } from './CellView';
import { SubcellView } from './SubcellView';
import type { Garden, Plan } from '@core/types';
import simpleGardenData from '@core/data/sampleGardens/simple-garden.json';

export function GridLayout() {
  const zoomLevel = useGardenStore((state) => state.zoomLevel);
  const garden = useGardenStore((state) => state.garden);
  const setGarden = useGardenStore((state) => state.setGarden);
  const setPlan = useGardenStore((state) => state.setPlan);

  // Load simple garden on mount
  useEffect(() => {
    setGarden(simpleGardenData.garden as Garden);
    setPlan(simpleGardenData.plan as Plan);
  }, [setGarden, setPlan]);

  const handleLoadSampleData = () => {
    setGarden(simpleGardenData.garden as Garden);
    setPlan(simpleGardenData.plan as Plan);
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
              Load Simple Garden
            </button>
            <p className="text-xs text-gray-600 mt-3">
              (10×10 ft with 1 corn plant in center)
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full">
          {zoomLevel === 'garden' && <GardenView />}
          {zoomLevel === 'cell' && <CellView />}
          {zoomLevel === 'subcell' && <SubcellView />}
        </div>
      )}
    </div>
  );
}
