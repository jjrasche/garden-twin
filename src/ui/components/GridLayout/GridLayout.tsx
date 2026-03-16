import React, { useEffect } from 'react';
import { useGardenStore } from '../../store/gardenStore';
import { CanvasGarden } from './CanvasGarden';
import { createGardenStateFromPlan } from '@core/data/sampleGarden';
import { PRODUCTION_PLAN } from '@core/calculators/ProductionTimeline';

export function GridLayout() {
  const gardenState = useGardenStore((state) => state.gardenState);
  const setGardenState = useGardenStore((state) => state.setGardenState);

  // Load sample garden on mount
  useEffect(() => {
    const sampleState = createGardenStateFromPlan(PRODUCTION_PLAN);
    setGardenState(sampleState);
  }, [setGardenState]);

  const handleLoadSampleData = () => {
    const sampleState = createGardenStateFromPlan(PRODUCTION_PLAN);
    setGardenState(sampleState);
  };

  return (
    <div className="relative w-full h-full bg-gray-900">
      {!gardenState ? (
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
              Load Sample Garden
            </button>
            <p className="text-xs text-gray-600 mt-3">
              (40×100 ft with lettuce, tomatoes, and Three Sisters mounds)
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full">
          <CanvasGarden />
        </div>
      )}
    </div>
  );
}
