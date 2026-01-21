import React from 'react';
import { useGardenStore } from '../../store/gardenStore';
import { getZoneData } from '@core/aggregators/utils';

export function ZoneCountView() {
  const garden = useGardenStore((state) => state.garden);
  const speciesMap = useGardenStore((state) => state.speciesMap);

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
        viewBox={`0 0 ${zonesX * 120} ${zonesY * 120}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {zones.map(({ zoneX, zoneY, data }) => {
          const x = zoneX * 120;
          const y = zoneY * 120;

          // Determine zone color
          const density = data.plant_density;
          let fillColor = '#1f2937';

          if (density > 0.5) {
            fillColor = '#065f46';
          } else if (density > 0) {
            fillColor = '#064e3b';
          }

          // Get plant counts by species
          const plantCounts = Object.entries(data.plant_counts)
            .filter(([, count]) => count > 0)
            .sort(([, a], [, b]) => b - a); // Sort by count descending

          return (
            <g key={`zone-${zoneX}-${zoneY}`}>
              <rect
                x={x}
                y={y}
                width={120}
                height={120}
                fill={fillColor}
                stroke="#374151"
                strokeWidth="1"
              />
              <text
                x={x + 60}
                y={y + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#9ca3af"
                fontWeight="bold"
              >
                Zone {zoneX},{zoneY}
              </text>

              {/* Display plant counts with icons */}
              {plantCounts.slice(0, 3).map(([speciesId, count], index) => {
                const species = speciesMap.get(speciesId);
                const icon = species?.icon.emoji || '🌱';

                return (
                  <text
                    key={speciesId}
                    x={x + 60}
                    y={y + 45 + index * 20}
                    textAnchor="middle"
                    fontSize="14"
                    fill="#d1d5db"
                  >
                    {icon}×{count}
                  </text>
                );
              })}

              {plantCounts.length > 3 && (
                <text
                  x={x + 60}
                  y={y + 105}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                >
                  +{plantCounts.length - 3} more
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
