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
import { usePaintBrush } from '../../hooks/usePaintBrush';
import { Minimap } from './Minimap';
import { PaintToolbar } from './PaintToolbar';

export function CanvasGarden() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintOverlayRef = useRef<Map<string, import('@core/types').SubcellState>>(new Map());
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Store state
  const gardenState = useGardenStore((state) => state.gardenState);
  const viewport = useGardenStore((state) => state.viewport);
  const setViewport = useGardenStore((state) => state.setViewport);
  const speciesMap = useGardenStore((state) => state.speciesMap);
  const paintMode = useGardenStore((state) => state.paintMode);
  const brushCursor = useGardenStore((state) => state.brushCursor);

  // Culling - filter to visible subcells only
  const { visibleSubcells, culledCount } = useCanvasCulling(
    gardenState?.subcells || [],
    viewport,
    canvasSize.width,
    canvasSize.height
  );

  // Controls - mouse wheel zoom + click-drag pan + touch gestures (disabled when painting)
  useCanvasControls(canvasRef, viewport, setViewport, paintMode !== 'none');

  // Paint brush - click/drag painting on canvas (uses paintOverlayRef for zero-overhead updates)
  usePaintBrush(canvasRef, viewport, gardenState?.subcells || [], paintOverlayRef);

  // Render loop - 60fps Canvas rendering (reads from paintOverlayRef directly, no re-renders)
  useRenderLoop(canvasRef, viewport, visibleSubcells, gardenState, speciesMap, brushCursor, paintOverlayRef);

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

  if (!gardenState) {
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
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="block"
        style={{ cursor: paintMode !== 'none' ? 'crosshair' : 'grab' }}
      />
      <Minimap viewport={viewport} garden={gardenState} onViewportChange={setViewport} />
      <PaintToolbar />
    </div>
  );
}
