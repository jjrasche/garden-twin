/**
 * Canvas Viewport Culling Hook
 *
 * Adapts the existing useViewportCulling logic for Canvas coordinate system.
 * Filters subcells to only those visible within the current viewport bounds.
 *
 * Performance: Reduces 480k subcells (10 acres) to ~1000-2000 visible items (99.6% culled).
 */

import { useMemo } from 'react';
import type { SubcellState } from '@core/types';
import { getViewportBounds, type Viewport } from '../utils/canvasTransforms';

export interface CullingResult {
  visibleSubcells: SubcellState[];
  totalSubcells: number;
  culledCount: number;
  visiblePercent: number;
}

/**
 * Filter subcells to only those visible within viewport bounds
 *
 * @param subcells - All subcells in the garden
 * @param viewport - Current viewport state (offsetX/Y, scale)
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param margin - Extra buffer around viewport in inches (default: 24 = 2 ft)
 * @returns Culling result with visible subcells and statistics
 */
export function useCanvasCulling(
  subcells: SubcellState[],
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  margin: number = 24  // 2 ft buffer for smooth panning
): CullingResult {
  return useMemo(() => {
    if (!subcells || subcells.length === 0) {
      return {
        visibleSubcells: [],
        totalSubcells: 0,
        culledCount: 0,
        visiblePercent: 0
      };
    }

    // Get viewport bounds in world coordinates (inches)
    const bounds = getViewportBounds(viewport, canvasWidth, canvasHeight);

    // Filter subcells within viewport bounds (with margin)
    const visibleSubcells = subcells.filter((subcell) => {
      const { x_in, y_in } = subcell.position;

      // Check if subcell is within visible bounds
      return (
        x_in >= bounds.minX - margin &&
        x_in <= bounds.maxX + margin &&
        y_in >= bounds.minY - margin &&
        y_in <= bounds.maxY + margin
      );
    });

    const totalSubcells = subcells.length;
    const culledCount = totalSubcells - visibleSubcells.length;
    const visiblePercent = (visibleSubcells.length / totalSubcells) * 100;

    return {
      visibleSubcells,
      totalSubcells,
      culledCount,
      visiblePercent
    };
  }, [subcells, viewport, canvasWidth, canvasHeight, margin]);
}
