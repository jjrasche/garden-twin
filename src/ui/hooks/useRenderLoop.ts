/**
 * Canvas Render Loop Hook
 *
 * 60fps render loop using requestAnimationFrame.
 * Renders multiple layers: grid → subcells → plants → debug.
 */

import { useEffect, useRef } from 'react';
import type { Subcell, Garden, PlantSpecies } from '@core/types';
import { worldToScreen, PIXELS_PER_INCH, type Viewport } from '../utils/canvasTransforms';
import { drawPlantIcon, getPlantColor } from '../utils/plantIcons';

const SUBCELL_SIZE_IN = 3; // 3×3 inch subcells

interface RenderStats {
  fps: number;
  visibleCount: number;
  scale: number;
}

/**
 * Main render loop hook
 *
 * @param canvasRef - Reference to canvas element
 * @param viewport - Current viewport state
 * @param visibleSubcells - Culled subcells (only visible ones)
 * @param garden - Garden data (for grid bounds)
 * @param speciesMap - Plant species data (for spacing/sizing)
 */
export function useRenderLoop(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  viewport: Viewport,
  visibleSubcells: Subcell[],
  garden: Garden | null,
  speciesMap: Map<string, PlantSpecies>
) {
  const frameRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !garden) return;

    // Get context with performance optimizations
    const ctx = canvas.getContext('2d', {
      alpha: false,           // Disable alpha channel (perf boost)
      desynchronized: true    // Allow GPU compositing without waiting for CPU
    });

    if (!ctx) return;

    const render = () => {
      // FPS calculation
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      frameCountRef.current++;

      // Update FPS every 30 frames
      if (frameCountRef.current >= 30) {
        fpsRef.current = Math.round((frameCountRef.current * 1000) / delta);
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      // Clear canvas
      ctx.fillStyle = '#111827'; // gray-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Layer 1: Grid (scale-dependent)
      drawGridLayer(ctx, viewport, garden);

      // Layer 2: Subcells
      drawSubcellLayer(ctx, viewport, visibleSubcells);

      // Layer 3: Plants
      drawPlantLayer(ctx, viewport, visibleSubcells, speciesMap);

      // Layer 4: Debug info
      drawDebugLayer(ctx, {
        fps: fpsRef.current,
        visibleCount: visibleSubcells.length,
        scale: viewport.scale
      });

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [canvasRef, viewport, visibleSubcells, garden, speciesMap]);
}

/**
 * Draw subcell layer (individual 3×3 inch cells)
 */
function drawSubcellLayer(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  visibleSubcells: Subcell[]
) {
  const subcellSizePx = SUBCELL_SIZE_IN * PIXELS_PER_INCH * viewport.scale;

  visibleSubcells.forEach((subcell) => {
    const screenPos = worldToScreen(subcell.position, viewport);

    // Determine subcell color based on plant status
    if (subcell.plant) {
      // Has plant - green
      ctx.fillStyle = '#22c55e'; // green-500
    } else {
      // Empty - dark gray
      ctx.fillStyle = '#374151'; // gray-700
    }

    // Draw subcell rectangle
    ctx.fillRect(
      screenPos.x,
      screenPos.y,
      subcellSizePx,
      subcellSizePx
    );

    // Draw subcell border (only visible when zoomed in)
    if (viewport.scale >= 1.0) {
      ctx.strokeStyle = '#1f2937'; // gray-800
      ctx.lineWidth = 1;
      ctx.strokeRect(
        screenPos.x,
        screenPos.y,
        subcellSizePx,
        subcellSizePx
      );
    }
  });
}

/**
 * Draw grid layer with level of detail
 *
 * Scale-dependent rendering:
 * - Scale ≥0.5: Show 1×1 ft cell grid
 * - Scale 0.1-0.5: Show 10×10 ft zone grid
 * - Scale <0.1: No grid (just garden boundary)
 */
function drawGridLayer(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  garden: Garden
) {
  const gardenWidth = garden.grid.width_ft * 12; // feet to inches
  const gardenHeight = garden.grid.length_ft * 12;

  // Draw garden boundary
  const topLeft = worldToScreen({ x_in: 0, y_in: 0 }, viewport);
  const bottomRight = worldToScreen(
    { x_in: gardenWidth, y_in: gardenHeight },
    viewport
  );

  ctx.strokeStyle = '#374151'; // gray-700
  ctx.lineWidth = 2;
  ctx.strokeRect(
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y
  );

  // Level of detail: Grid rendering based on scale
  if (viewport.scale >= 0.5) {
    // Show 1×1 ft cell grid (when zoomed in enough)
    drawCellGrid(ctx, viewport, garden);
  } else if (viewport.scale >= 0.1) {
    // Show 10×10 ft zone grid (overview level)
    drawZoneGrid(ctx, viewport, garden);
  }
  // Below 0.1x: no grid, just boundary
}

/**
 * Draw 1×1 ft cell grid
 */
function drawCellGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  garden: Garden
) {
  ctx.strokeStyle = '#1F2937'; // gray-800
  ctx.lineWidth = 1;

  const gardenWidth = garden.grid.width_ft * 12;
  const gardenHeight = garden.grid.length_ft * 12;

  // Vertical lines every 12 inches (1 ft)
  for (let x_in = 0; x_in <= gardenWidth; x_in += 12) {
    const topPos = worldToScreen({ x_in, y_in: 0 }, viewport);
    const bottomPos = worldToScreen({ x_in, y_in: gardenHeight }, viewport);

    ctx.beginPath();
    ctx.moveTo(topPos.x, topPos.y);
    ctx.lineTo(bottomPos.x, bottomPos.y);
    ctx.stroke();
  }

  // Horizontal lines every 12 inches (1 ft)
  for (let y_in = 0; y_in <= gardenHeight; y_in += 12) {
    const leftPos = worldToScreen({ x_in: 0, y_in }, viewport);
    const rightPos = worldToScreen({ x_in: gardenWidth, y_in }, viewport);

    ctx.beginPath();
    ctx.moveTo(leftPos.x, leftPos.y);
    ctx.lineTo(rightPos.x, rightPos.y);
    ctx.stroke();
  }
}

/**
 * Draw 10×10 ft zone grid
 */
function drawZoneGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  garden: Garden
) {
  ctx.strokeStyle = '#374151'; // gray-700
  ctx.lineWidth = 2;

  const gardenWidth = garden.grid.width_ft * 12;
  const gardenHeight = garden.grid.length_ft * 12;

  // Vertical lines every 120 inches (10 ft)
  for (let x_in = 0; x_in <= gardenWidth; x_in += 120) {
    const topPos = worldToScreen({ x_in, y_in: 0 }, viewport);
    const bottomPos = worldToScreen({ x_in, y_in: gardenHeight }, viewport);

    ctx.beginPath();
    ctx.moveTo(topPos.x, topPos.y);
    ctx.lineTo(bottomPos.x, bottomPos.y);
    ctx.stroke();
  }

  // Horizontal lines every 120 inches (10 ft)
  for (let y_in = 0; y_in <= gardenHeight; y_in += 120) {
    const leftPos = worldToScreen({ x_in: 0, y_in }, viewport);
    const rightPos = worldToScreen({ x_in: gardenWidth, y_in }, viewport);

    ctx.beginPath();
    ctx.moveTo(leftPos.x, leftPos.y);
    ctx.lineTo(rightPos.x, rightPos.y);
    ctx.stroke();
  }
}

/**
 * Draw plant layer (emoji icons with spacing circles)
 *
 * Plant footprint is calculated from species spacing requirements (plants_per_sq_ft).
 * Formula: footprint = 12 / sqrt(plants_per_sq_ft) inches
 * Example: Corn at 1 plant/sq ft → 12×12 inch footprint
 *
 * Icon stays at fixed readable size, circle shows actual plant spacing.
 *
 * Level of detail:
 * - Scale ≥0.5: Show emoji icons with footprint circles
 * - Scale <0.5: Show colored dots (icons too small to see)
 */
function drawPlantLayer(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  visibleSubcells: Subcell[],
  speciesMap: Map<string, PlantSpecies>
) {
  visibleSubcells.forEach((subcell) => {
    if (!subcell.plant) return; // Skip empty subcells

    const speciesId = subcell.plant.species_id;
    const species = speciesMap.get(speciesId);

    // Calculate plant footprint from spacing requirements
    // Formula: footprint = 12 / sqrt(plants_per_sq_ft)
    // Example: 1 plant/sq ft → 12 inches, 4 plants/sq ft → 6 inches
    const plantsPerSqFt = species?.plants_per_sq_ft || 1;
    const plantFootprintInches = 12 / Math.sqrt(plantsPerSqFt);

    // Calculate center of subcell (icon stays centered in its subcell)
    const centerPos = worldToScreen(
      {
        x_in: subcell.position.x_in + SUBCELL_SIZE_IN / 2,
        y_in: subcell.position.y_in + SUBCELL_SIZE_IN / 2
      },
      viewport
    );

    if (viewport.scale >= 0.5) {
      // Draw footprint circle (shows actual plant spacing)
      // Circle diameter = plantFootprintInches, so radius = plantFootprintInches / 2
      const footprintRadiusPx = (plantFootprintInches / 2) * PIXELS_PER_INCH * viewport.scale;

      ctx.strokeStyle = getPlantColor(speciesId);
      ctx.lineWidth = Math.max(1, viewport.scale * 0.5); // Scale line width with zoom
      ctx.globalAlpha = 0.5; // Semi-transparent
      ctx.beginPath();
      ctx.arc(centerPos.x, centerPos.y, footprintRadiusPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0; // Reset alpha

      // Draw emoji icon at fixed readable size
      const iconSize = 20; // Fixed size for readability
      drawPlantIcon(ctx, speciesId, centerPos, iconSize);
    } else {
      // Show colored dot (icon too small to see)
      const dotRadius = Math.max(2, SUBCELL_SIZE_IN * PIXELS_PER_INCH * viewport.scale * 0.3);
      ctx.fillStyle = getPlantColor(speciesId);
      ctx.beginPath();
      ctx.arc(centerPos.x, centerPos.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/**
 * Draw debug overlay (FPS, visible count, scale)
 */
function drawDebugLayer(ctx: CanvasRenderingContext2D, stats: RenderStats) {
  const padding = 12;
  const lineHeight = 20;
  const textPadding = 8;

  // Semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(padding, padding, 200, lineHeight * 3 + textPadding * 2);

  // Debug text
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px monospace';
  ctx.textBaseline = 'top'; // Set baseline to top for consistent positioning

  ctx.fillText(
    `FPS: ${stats.fps}`,
    padding + textPadding,
    padding + textPadding
  );

  ctx.fillText(
    `Visible: ${stats.visibleCount.toLocaleString()}`,
    padding + textPadding,
    padding + textPadding + lineHeight
  );

  ctx.fillText(
    `Scale: ${stats.scale.toFixed(2)}x`,
    padding + textPadding,
    padding + textPadding + lineHeight * 2
  );
}
