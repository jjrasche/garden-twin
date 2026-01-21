import React from 'react';
import { useGardenStore, type ZoomLevel } from '../../store/gardenStore';

const ZOOM_LEVELS: { value: ZoomLevel; label: string }[] = [
  { value: 'zone', label: 'Zones' },
  { value: 'zone-count', label: 'Zone Details' },
  { value: 'cell', label: 'Cells' },
  { value: 'subcell', label: 'Subcells' },
];

export function ZoomControls() {
  const zoomLevel = useGardenStore((state) => state.zoomLevel);
  const setZoom = useGardenStore((state) => state.setZoom);

  return (
    <div className="absolute top-4 left-4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
      <div className="flex flex-col p-2 space-y-1">
        <div className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1">
          Zoom Level
        </div>
        {ZOOM_LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => setZoom(level.value)}
            className={`px-3 py-2 text-sm rounded transition-colors ${
              zoomLevel === level.value
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
}
