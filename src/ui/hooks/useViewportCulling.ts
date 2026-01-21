import { useMemo } from 'react';
import type { Subcell } from '@core/types';

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CullingResult {
  visibleSubcells: Subcell[];
  totalSubcells: number;
  culledCount: number;
}

/**
 * Calculates which subcells are visible in the current viewport.
 * Only renders subcells within the visible bounds + a small margin for smooth scrolling.
 *
 * @param subcells - All garden subcells
 * @param viewport - Current viewport bounds in inches
 * @param margin - Extra margin to render beyond viewport (default: 12 inches = 1 ft)
 * @returns Filtered subcells that are visible
 */
export function useViewportCulling(
  subcells: Subcell[],
  viewport: ViewportBounds,
  margin: number = 12
): CullingResult {
  return useMemo(() => {
    const { minX, maxX, minY, maxY } = viewport;

    // Add margin to viewport bounds
    const expandedMinX = Math.max(0, minX - margin);
    const expandedMaxX = maxX + margin;
    const expandedMinY = Math.max(0, minY - margin);
    const expandedMaxY = maxY + margin;

    // Filter subcells within expanded viewport
    const visibleSubcells = subcells.filter((subcell) => {
      const { x_in, y_in } = subcell.position;

      return (
        x_in >= expandedMinX &&
        x_in <= expandedMaxX &&
        y_in >= expandedMinY &&
        y_in <= expandedMaxY
      );
    });

    return {
      visibleSubcells,
      totalSubcells: subcells.length,
      culledCount: subcells.length - visibleSubcells.length,
    };
  }, [subcells, viewport, margin]);
}

/**
 * Calculates viewport bounds from scroll position and container dimensions.
 *
 * @param scrollX - Horizontal scroll position in pixels
 * @param scrollY - Vertical scroll position in pixels
 * @param containerWidth - Container width in pixels
 * @param containerHeight - Container height in pixels
 * @param pixelsPerInch - Scale factor (pixels per inch)
 * @returns Viewport bounds in inches
 */
export function calculateViewportBounds(
  scrollX: number,
  scrollY: number,
  containerWidth: number,
  containerHeight: number,
  pixelsPerInch: number
): ViewportBounds {
  return {
    minX: scrollX / pixelsPerInch,
    maxX: (scrollX + containerWidth) / pixelsPerInch,
    minY: scrollY / pixelsPerInch,
    maxY: (scrollY + containerHeight) / pixelsPerInch,
  };
}
