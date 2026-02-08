/**
 * Paint Brush Hook
 *
 * Handles click/drag painting on canvas for terrain and shade painting.
 * Converts screen coordinates to world coordinates, finds affected subcells,
 * and updates them via the store.
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { screenToWorld, PIXELS_PER_INCH, type Viewport } from '../utils/canvasTransforms';
import { useGardenStore } from '../store/gardenStore';
import type { SubcellState } from '@core/types';

import type { BrushSize } from '../store/gardenStore';

const SUBCELL_SIZE_IN = 3; // 3x3 inch subcells
const PIXELS_PER_INCH_BASE = 10; // Base pixels per inch

/**
 * Calculate brush radius based on pixels per cell
 *
 * Logic: When cells are small on screen, use bigger brush for efficiency.
 * When cells are large on screen, use precision mode.
 *
 * @param scale - Current viewport scale
 * @param manualSize - User-selected size (used when autoSize is false)
 * @param autoSize - Whether to auto-adjust based on cell pixel size
 */
function getBrushRadius(scale: number, manualSize: BrushSize, autoSize: boolean): number {
  if (!autoSize) {
    return manualSize;
  }

  // Calculate how many pixels a single cell occupies on screen
  const cellPixels = SUBCELL_SIZE_IN * PIXELS_PER_INCH_BASE * scale;

  // Auto-size based on cell visibility:
  // - Large cells (>30px): precision mode, easy to see individual cells
  // - Medium cells (15-30px): small brush
  // - Small cells (8-15px): medium brush
  // - Tiny cells (<8px): large brush for efficiency
  if (cellPixels > 30) return 0;      // 1×1 cell (precision)
  if (cellPixels > 15) return 1;      // 3×3 cells
  if (cellPixels > 8) return 2;       // 5×5 cells
  return 3;                            // 7×7 cells (zone painting)
}

interface BrushState {
  isPainting: boolean;
  lastPaintedSubcells: Set<string>;
  lastMouseX: number | null;
  lastMouseY: number | null;
  paintOverlay: Map<string, SubcellState>; // Local ref, not in Zustand
}

/**
 * Paint brush hook
 *
 * @param canvasRef - Reference to canvas element
 * @param viewport - Current viewport state
 * @param subcells - All subcells in the garden
 * @param paintOverlayRef - Ref to paint overlay Map (mutated directly, no re-renders)
 */
export function usePaintBrush(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  viewport: Viewport,
  subcells: SubcellState[],
  paintOverlayRef: React.RefObject<Map<string, SubcellState>>
) {
  const stateRef = useRef<BrushState>({
    isPainting: false,
    lastPaintedSubcells: new Set(),
    lastMouseX: null,
    lastMouseY: null,
    paintOverlay: new Map(),
  });

  // Build spatial lookup map: "x,y" -> subcell (O(1) lookup instead of O(n) find)
  const subcellPositionMap = useMemo(() => {
    const map = new Map<string, SubcellState>();
    for (const subcell of subcells) {
      // Support both 'X,Y' and 'sub_X_Y' formats
      const x = subcell.position.x_in;
      const y = subcell.position.y_in;
      const key = `${x},${y}`;
      map.set(key, subcell);
    }
    return map;
  }, [subcells]);

  // Get paint state from store
  const paintMode = useGardenStore((state) => state.paintMode);
  const brushSettings = useGardenStore((state) => state.brushSettings);
  const shadeSettings = useGardenStore((state) => state.shadeSettings);
  const gardenState = useGardenStore((state) => state.gardenState);
  const setIsPainting = useGardenStore((state) => state.setIsPainting);
  const setBrushCursor = useGardenStore((state) => state.setBrushCursor);
  const commitPaintOverlay = useGardenStore((state) => state.commitPaintOverlay);

  /**
   * Find subcells at a given screen position (with brush radius)
   */
  const getSubcellsAtPosition = useCallback(
    (screenX: number, screenY: number): string[] => {
      const canvas = canvasRef.current;
      if (!canvas) return [];

      const rect = canvas.getBoundingClientRect();
      const x = screenX - rect.left;
      const y = screenY - rect.top;

      // Convert screen to world coordinates
      const worldPos = screenToWorld({ x, y }, viewport);

      // Find center subcell position (snap to subcell grid)
      const centerSubcellX = Math.floor(worldPos.x_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN;
      const centerSubcellY = Math.floor(worldPos.y_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN;

      // Get brush radius (auto or manual based on settings)
      const brushRadius = getBrushRadius(viewport.scale, brushSettings.size, brushSettings.autoSize);

      // Collect subcells within brush radius
      const affectedIds: string[] = [];

      for (let dx = -brushRadius; dx <= brushRadius; dx++) {
        for (let dy = -brushRadius; dy <= brushRadius; dy++) {
          const subcellX = centerSubcellX + dx * SUBCELL_SIZE_IN;
          const subcellY = centerSubcellY + dy * SUBCELL_SIZE_IN;

          // Skip negative positions
          if (subcellX < 0 || subcellY < 0) continue;

          // O(1) lookup in spatial map
          const posKey = `${subcellX},${subcellY}`;
          const found = subcellPositionMap.get(posKey);
          if (found) {
            affectedIds.push(found.subcell_id);
          }
        }
      }

      return affectedIds;
    },
    [canvasRef, viewport, subcellPositionMap, brushSettings]
  );

  /**
   * Interpolate points between two positions for continuous painting
   *
   * Returns array of {x, y} screen positions along the line from (x1, y1) to (x2, y2).
   * Step size is chosen to ensure no gaps in painting (based on brush size).
   */
  const interpolatePoints = useCallback(
    (x1: number, y1: number, x2: number, y2: number): Array<{ x: number; y: number }> => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If distance is small, just return the end point
      if (distance < 2) {
        return [{ x: x2, y: y2 }];
      }

      // Calculate step size based on brush size (in pixels)
      // We want to sample frequently enough that brush circles overlap
      const brushRadius = getBrushRadius(viewport.scale, brushSettings.size, brushSettings.autoSize);
      const subcellSizePx = SUBCELL_SIZE_IN * PIXELS_PER_INCH_BASE * viewport.scale;
      const brushSizePx = (2 * brushRadius + 1) * subcellSizePx;
      const stepSize = Math.max(1, brushSizePx * 0.5); // Sample at half brush width for overlap

      const steps = Math.ceil(distance / stepSize);
      const points: Array<{ x: number; y: number }> = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        points.push({
          x: x1 + dx * t,
          y: y1 + dy * t,
        });
      }

      return points;
    },
    [viewport.scale, brushSettings]
  );

  /**
   * Mouse down - start painting
   */
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      if (paintMode === 'none') return;

      stateRef.current.isPainting = true;
      stateRef.current.lastPaintedSubcells.clear();
      stateRef.current.lastMouseX = e.clientX;
      stateRef.current.lastMouseY = e.clientY;
      setIsPainting(true);

      // Initial paint will happen on first mousemove
    },
    [paintMode, setIsPainting]
  );

  /**
   * Update brush cursor position (for preview)
   */
  const updateBrushCursor = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = screenX - rect.left;
      const y = screenY - rect.top;

      const worldPos = screenToWorld({ x, y }, viewport);
      const brushRadius = getBrushRadius(viewport.scale, brushSettings.size, brushSettings.autoSize);

      // Snap to subcell grid
      const snappedX = Math.floor(worldPos.x_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN;
      const snappedY = Math.floor(worldPos.y_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN;

      setBrushCursor({
        x_in: snappedX + SUBCELL_SIZE_IN / 2, // Center of subcell
        y_in: snappedY + SUBCELL_SIZE_IN / 2,
        radiusCells: brushRadius,
      });
    },
    [canvasRef, viewport, setBrushCursor, brushSettings]
  );

  /**
   * Mouse move - continue painting and update cursor
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const startTime = performance.now();

      // Always update brush cursor position when in paint mode
      if (paintMode !== 'none') {
        updateBrushCursor(e.clientX, e.clientY);
      }

      // Only paint if actively painting
      if (!stateRef.current.isPainting) return;
      if (paintMode === 'none' || !gardenState || !paintOverlayRef.current) return;

      // Interpolate between previous and current position for continuous painting
      const prevX = stateRef.current.lastMouseX;
      const prevY = stateRef.current.lastMouseY;

      if (prevX !== null && prevY !== null) {
        const t1 = performance.now();
        // Collect ALL affected subcells from ALL interpolated points
        const points = interpolatePoints(prevX, prevY, e.clientX, e.clientY);
        const t2 = performance.now();

        points.forEach((point) => {
          const ids = getSubcellsAtPosition(point.x, point.y);
          ids.forEach((id) => {
            // Only add if not already painted in this stroke
            if (!stateRef.current.lastPaintedSubcells.has(id)) {
              stateRef.current.lastPaintedSubcells.add(id);

              // Find subcell by ID (use position map we already have)
              const subcell = gardenState.subcells.find(s => s.subcell_id === id);
              if (subcell) {

                // Apply paint based on mode
                if (paintOverlayRef.current) {
                  if (paintMode === 'water' || paintMode === 'path' || paintMode === 'tree') {
                    const terrainType = paintMode === 'path' ? 'pathway' : paintMode;
                    paintOverlayRef.current.set(id, {
                      ...subcell,
                      type: terrainType as 'water' | 'pathway' | 'tree',
                    });
                  } else if (paintMode === 'shade') {
                    const existingShadeMap = subcell.shade_map || {};
                    const existingSeasonShade = existingShadeMap[shadeSettings.season] || {};
                    const updatedSeasonShade = { ...existingSeasonShade };
                    for (const slot of shadeSettings.timeSlots) {
                      updatedSeasonShade[slot] = true;
                    }
                    paintOverlayRef.current.set(id, {
                      ...subcell,
                      shade_map: {
                        ...existingShadeMap,
                        [shadeSettings.season]: updatedSeasonShade,
                      },
                    });
                  }
                }
              }
            }
          });
        });

        const elapsed = performance.now() - startTime;
        if (elapsed > 5) {
          console.log(`[handleMouseMove] ${elapsed.toFixed(2)}ms for ${points.length} points → ${paintOverlayRef.current.size} cells in overlay`);
        }
      }

      // Update last position
      stateRef.current.lastMouseX = e.clientX;
      stateRef.current.lastMouseY = e.clientY;
    },
    [paintMode, gardenState, shadeSettings, getSubcellsAtPosition, updateBrushCursor, interpolatePoints, paintOverlayRef]
  );

  /**
   * Mouse up - stop painting
   */
  const handleMouseUp = useCallback(() => {
    if (stateRef.current.isPainting && paintOverlayRef.current) {
      // Commit all overlay changes to garden (ONE re-render for entire stroke)
      if (paintOverlayRef.current.size > 0) {
        commitPaintOverlay(paintOverlayRef.current);

        // Clear overlay for next stroke
        paintOverlayRef.current.clear();
      }

      stateRef.current.isPainting = false;
      stateRef.current.lastPaintedSubcells.clear();
      stateRef.current.lastMouseX = null;
      stateRef.current.lastMouseY = null;
      setIsPainting(false);
    }
  }, [setIsPainting, commitPaintOverlay, paintOverlayRef]);

  /**
   * Touch start - start painting
   */
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (paintMode === 'none') return;

      const touch = e.touches[0]!;
      stateRef.current.isPainting = true;
      stateRef.current.lastPaintedSubcells.clear();
      stateRef.current.lastMouseX = touch.clientX;
      stateRef.current.lastMouseY = touch.clientY;
      setIsPainting(true);

      // Initial paint will happen on first touchmove

      e.preventDefault();
    },
    [paintMode, setIsPainting]
  );

  /**
   * Touch move - continue painting
   */
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!stateRef.current.isPainting) return;
      if (e.touches.length !== 1) return;
      if (paintMode === 'none' || !gardenState || !paintOverlayRef.current) return;

      const touch = e.touches[0]!;

      // Interpolate between previous and current position for continuous painting
      const prevX = stateRef.current.lastMouseX;
      const prevY = stateRef.current.lastMouseY;

      if (prevX !== null && prevY !== null) {
        const points = interpolatePoints(prevX, prevY, touch.clientX, touch.clientY);

        points.forEach((point) => {
          const ids = getSubcellsAtPosition(point.x, point.y);
          ids.forEach((id) => {
            if (!stateRef.current.lastPaintedSubcells.has(id)) {
              stateRef.current.lastPaintedSubcells.add(id);

              const subcell = gardenState.subcells.find(s => s.subcell_id === id);
              if (subcell && paintOverlayRef.current) {

                if (paintMode === 'water' || paintMode === 'path' || paintMode === 'tree') {
                  const terrainType = paintMode === 'path' ? 'pathway' : paintMode;
                  paintOverlayRef.current.set(id, {
                    ...subcell,
                    type: terrainType as 'water' | 'pathway' | 'tree',
                  });
                } else if (paintMode === 'shade') {
                  const existingShadeMap = subcell.shade_map || {};
                  const existingSeasonShade = existingShadeMap[shadeSettings.season] || {};
                  const updatedSeasonShade = { ...existingSeasonShade };
                  for (const slot of shadeSettings.timeSlots) {
                    updatedSeasonShade[slot] = true;
                  }
                  paintOverlayRef.current.set(id, {
                    ...subcell,
                    shade_map: {
                      ...existingShadeMap,
                      [shadeSettings.season]: updatedSeasonShade,
                    },
                  });
                }
              }
            }
          });
        });
      }

      stateRef.current.lastMouseX = touch.clientX;
      stateRef.current.lastMouseY = touch.clientY;

      e.preventDefault();
    },
    [paintMode, gardenState, shadeSettings, getSubcellsAtPosition, interpolatePoints, paintOverlayRef]
  );

  /**
   * Touch end - stop painting
   */
  const handleTouchEnd = useCallback(() => {
    if (stateRef.current.isPainting && paintOverlayRef.current) {
      if (paintOverlayRef.current.size > 0) {
        commitPaintOverlay(paintOverlayRef.current);
        paintOverlayRef.current.clear();
      }

      stateRef.current.isPainting = false;
      stateRef.current.lastPaintedSubcells.clear();
      stateRef.current.lastMouseX = null;
      stateRef.current.lastMouseY = null;
      setIsPainting(false);
    }
  }, [setIsPainting, commitPaintOverlay, paintOverlayRef]);

  /**
   * Mouse leave - hide brush cursor
   */
  const handleMouseLeave = useCallback(() => {
    setBrushCursor(null);
  }, [setBrushCursor]);

  /**
   * Attach event listeners
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Only attach listeners when paint mode is active
    if (paintMode === 'none') {
      // Clear brush cursor when exiting paint mode
      setBrushCursor(null);
      return;
    }

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove); // Canvas-only for cursor preview
    canvas.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousemove', handleMouseMove); // Window for drag painting
    window.addEventListener('mouseup', handleMouseUp);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    canvasRef,
    paintMode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setBrushCursor,
  ]);
}
