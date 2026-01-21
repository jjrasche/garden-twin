import React, { useState, useRef, useCallback } from 'react';
import { useGardenStore } from '../../store/gardenStore';
import {
  useViewportCulling,
  calculateViewportBounds,
  type ViewportBounds,
} from '../../hooks/useViewportCulling';

const PIXELS_PER_INCH = 10; // Scale: 10 pixels = 1 inch
const SUBCELL_SIZE_IN = 3; // 3 inches per subcell

export function SubcellView() {
  const garden = useGardenStore((state) => state.garden);
  const speciesMap = useGardenStore((state) => state.speciesMap);

  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportBounds>({
    minX: 0,
    maxX: 120, // Default 10 ft visible
    minY: 0,
    maxY: 120,
  });

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const bounds = calculateViewportBounds(
      container.scrollLeft,
      container.scrollTop,
      container.clientWidth,
      container.clientHeight,
      PIXELS_PER_INCH
    );

    setViewport(bounds);
  }, []);

  if (!garden) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
        <p>No garden loaded</p>
      </div>
    );
  }

  const { width_ft, length_ft, subcell_size_in } = garden.grid;

  // Apply viewport culling
  const { visibleSubcells, totalSubcells, culledCount } = useViewportCulling(
    garden.subcells,
    viewport,
    24 // 2 ft margin
  );

  const widthInches = width_ft * 12;
  const heightInches = length_ft * 12;

  return (
    <div className="w-full h-full bg-gray-900 relative">
      {/* Performance stats */}
      <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs z-10">
        <div>Rendering: {visibleSubcells.length} / {totalSubcells}</div>
        <div>Culled: {culledCount}</div>
      </div>

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-auto"
        onScroll={handleScroll}
      >
        <svg
          width={widthInches * PIXELS_PER_INCH}
          height={heightInches * PIXELS_PER_INCH}
          className="bg-gray-950"
        >
          {/* Grid lines every foot */}
          {Array.from({ length: width_ft + 1 }).map((_, i) => (
            <line
              key={`vline-${i}`}
              x1={i * 12 * PIXELS_PER_INCH}
              y1={0}
              x2={i * 12 * PIXELS_PER_INCH}
              y2={heightInches * PIXELS_PER_INCH}
              stroke="#374151"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: length_ft + 1 }).map((_, i) => (
            <line
              key={`hline-${i}`}
              x1={0}
              y1={i * 12 * PIXELS_PER_INCH}
              x2={widthInches * PIXELS_PER_INCH}
              y2={i * 12 * PIXELS_PER_INCH}
              stroke="#374151"
              strokeWidth="1"
            />
          ))}

          {/* Render only visible subcells */}
          {visibleSubcells.map((subcell) => {
            const { x_in, y_in } = subcell.position;
            const x = x_in * PIXELS_PER_INCH;
            const y = y_in * PIXELS_PER_INCH;
            const size = subcell_size_in * PIXELS_PER_INCH;

            // Determine subcell color
            let fillColor = '#1f2937'; // Default dark gray
            let opacity = 0.3;

            if (subcell.conditions.type === 'pathway') {
              fillColor = '#6b7280'; // Gray for pathways
            } else if (subcell.plant) {
              const species = speciesMap.get(subcell.plant.species_id);

              // Species-specific colors
              if (subcell.plant.species_id.includes('corn')) {
                fillColor = '#fbbf24'; // Amber
              } else if (subcell.plant.species_id.includes('tomato')) {
                fillColor = '#ef4444'; // Red
              } else if (subcell.plant.species_id.includes('potato')) {
                fillColor = '#a78bfa'; // Purple
              } else {
                fillColor = '#10b981'; // Green
              }

              opacity = 0.8;
            }

            return (
              <rect
                key={subcell.id}
                x={x}
                y={y}
                width={size}
                height={size}
                fill={fillColor}
                stroke="#4b5563"
                strokeWidth="0.5"
                opacity={opacity}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
