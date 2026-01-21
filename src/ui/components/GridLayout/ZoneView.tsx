import React from 'react';
import { useGardenStore } from '../../store/gardenStore';
import { getZoneData } from '@core/aggregators/utils';

export function ZoneView() {
  const garden = useGardenStore((state) => state.garden);

  if (!garden) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
        <p>No garden loaded</p>
      </div>
    );
  }

  const { width_ft, length_ft } = garden.grid;

  // Calculate zone dimensions (10×10 ft zones)
  const zonesX = Math.ceil(width_ft / 10);
  const zonesY = Math.ceil(length_ft / 10);

  const zones = [];
  for (let zoneY = 0; zoneY < zonesY; zoneY++) {
    for (let zoneX = 0; zoneX < zonesX; zoneX++) {
      const zoneData = getZoneData(garden.subcells, zoneX, zoneY);
      zones.push({ zoneX, zoneY, data: zoneData });
    }
  }

  return (
    <div className="w-full h-full bg-gray-900 p-4">
      <svg
        viewBox={`0 0 ${zonesX * 100} ${zonesY * 100}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {zones.map(({ zoneX, zoneY, data }) => {
          const x = zoneX * 100;
          const y = zoneY * 100;

          // Determine zone color based on plant density
          const density = data.plant_density;
          let fillColor = '#1f2937'; // Default dark gray

          if (density > 0.5) {
            fillColor = '#065f46'; // Dark green - high density
          } else if (density > 0) {
            fillColor = '#064e3b'; // Medium green - some plants
          }

          return (
            <g key={`zone-${zoneX}-${zoneY}`}>
              <rect
                x={x}
                y={y}
                width={100}
                height={100}
                fill={fillColor}
                stroke="#374151"
                strokeWidth="1"
              />
              <text
                x={x + 50}
                y={y + 45}
                textAnchor="middle"
                fontSize="14"
                fill="#9ca3af"
                fontWeight="bold"
              >
                Z{zoneX},{zoneY}
              </text>
              <text
                x={x + 50}
                y={y + 65}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {data.total_plants} plants
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
