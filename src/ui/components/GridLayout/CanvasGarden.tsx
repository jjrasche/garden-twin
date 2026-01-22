/**
 * Canvas Garden Component
 *
 * Main Canvas component replacing the three discrete SVG zoom views (ZoneView, CellView, SubcellView).
 * Provides continuous zoom (0.1x to 10x) with high-performance rendering via viewport culling.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useGardenStore } from '../../store/gardenStore';
import { useCanvasCulling } from '../../hooks/useCanvasCulling';
import { useRenderLoop } from '../../hooks/useRenderLoop';
import { useCanvasControls } from '../../hooks/useCanvasControls';
import { Minimap } from './Minimap';

export function CanvasGarden() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Store state
  const garden = useGardenStore((state) => state.garden);
  const viewport = useGardenStore((state) => state.viewport);
  const setViewport = useGardenStore((state) => state.setViewport);
  const speciesMap = useGardenStore((state) => state.speciesMap);

  // Culling - filter to visible subcells only
  const { visibleSubcells, culledCount } = useCanvasCulling(
    garden?.subcells || [],
    viewport,
    canvasSize.width,
    canvasSize.height
  );

  // Controls - mouse wheel zoom + click-drag pan + touch gestures
  useCanvasControls(canvasRef, viewport, setViewport);

  // Render loop - 60fps Canvas rendering
  useRenderLoop(canvasRef, viewport, visibleSubcells, garden, speciesMap);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!garden) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="text-lg">No Garden Loaded</p>
          <p className="text-sm text-gray-500 mt-2">
            Load a garden to see Canvas rendering
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="block"
        style={{ cursor: 'grab' }}
      />
      <Minimap viewport={viewport} garden={garden} onViewportChange={setViewport} />
    </>
  );
}
