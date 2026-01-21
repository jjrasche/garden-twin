import React from 'react';
import { useGardenStore } from '../../store/gardenStore';
import { getCellData } from '@core/aggregators/utils';

export function CellView() {
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

  // Create cell grid (1×1 ft cells)
  const cells = [];
  for (let cellY = 0; cellY < length_ft; cellY++) {
    for (let cellX = 0; cellX < width_ft; cellX++) {
      const cellData = getCellData(garden.subcells, cellX, cellY);
      cells.push({ cellX, cellY, data: cellData });
    }
  }

  const cellSize = 10; // SVG units per cell

  return (
    <div className="w-full h-full bg-gray-900 p-4 overflow-auto">
      <svg
        viewBox={`0 0 ${width_ft * cellSize} ${length_ft * cellSize}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {cells.map(({ cellX, cellY, data }) => {
          const x = cellX * cellSize;
          const y = cellY * cellSize;

          // Determine cell color based on plant density
          let fillColor = '#1f2937'; // Default dark gray

          const totalPlants = Object.values(data.plant_counts).reduce((sum, count) => sum + count, 0);

          if (totalPlants > 0) {
            // Get dominant species
            const dominantSpecies = Object.entries(data.plant_counts)
              .sort(([, a], [, b]) => b - a)[0];

            if (dominantSpecies) {
              const [speciesId] = dominantSpecies;
              const species = speciesMap.get(speciesId);

              // Use species-specific colors
              if (speciesId.includes('corn')) {
                fillColor = '#fbbf24'; // Amber
              } else if (speciesId.includes('tomato')) {
                fillColor = '#ef4444'; // Red
              } else if (speciesId.includes('potato')) {
                fillColor = '#a78bfa'; // Purple
              } else {
                fillColor = '#10b981'; // Green
              }
            }
          }

          return (
            <rect
              key={`cell-${cellX}-${cellY}`}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              fill={fillColor}
              stroke="#374151"
              strokeWidth="0.2"
              opacity={totalPlants > 0 ? 0.7 : 0.3}
            />
          );
        })}
      </svg>
    </div>
  );
}
