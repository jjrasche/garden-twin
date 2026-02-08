/**
 * Canvas Render Loop Hook
 *
 * 60fps render loop using requestAnimationFrame.
 * Renders multiple layers: grid → subcells → infrastructure → plants → debug.
 */

import { useEffect, useRef } from 'react';
import type { GardenState, PlantSpecies, SubcellState, InfrastructureFeature, ChannelFeature, MoundFeature } from '@core/types';
import { worldToScreen, PIXELS_PER_INCH, type Viewport } from '../utils/canvasTransforms';
import { drawPlantIcon, getPlantColor } from '../utils/plantIcons';
import type { BrushCursor } from '../store/gardenStore';

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
 * @param gardenState - GardenState data (for grid bounds and plants)
 * @param speciesMap - Plant species data (for spacing/sizing)
 * @param brushCursor - Brush cursor position for paint preview
 * @param paintOverlayRef - Ref to paint overlay (read on every RAF frame, no re-renders)
 */
export function useRenderLoop(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  viewport: Viewport,
  visibleSubcells: SubcellState[],
  gardenState: GardenState | null,
  speciesMap: Map<string, PlantSpecies>,
  brushCursor: BrushCursor | null = null,
  paintOverlayRef: React.RefObject<Map<string, SubcellState>> | null = null
) {
  const frameRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gardenState) return;

    // Get context with performance optimizations
    const ctx = canvas.getContext('2d', {
      alpha: false            // Disable alpha channel (perf boost)
    });

    if (!ctx) return;

    // Build subcell → species lookup ONCE per gardenState change (not per frame)
    // This map only needs rebuilding when gardenState.plants changes
    const subcellSpecies = new Map<string, string>();
    for (const plant of gardenState.plants) {
      for (const sid of plant.occupied_subcells) {
        subcellSpecies.set(sid, plant.species_id);
      }
    }

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
      drawGridLayer(ctx, viewport, gardenState);

      // Layer 2: Subcells (with overlay applied from ref)
      const overlayMap = paintOverlayRef?.current || new Map();
      drawSubcellLayer(ctx, viewport, visibleSubcells, overlayMap, subcellSpecies);

      // Layer 3: Infrastructure (trellis wire/posts, mound outlines)
      if (gardenState.infrastructure) {
        drawInfrastructureLayer(ctx, viewport, gardenState.infrastructure);
      }

      // Layer 4: Plants
      drawPlantLayer(ctx, viewport, gardenState, speciesMap);

      // Layer 5: Brush cursor preview
      if (brushCursor) {
        drawBrushCursor(ctx, viewport, brushCursor);
      }

      // Layer 6: Debug info
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
  }, [canvasRef, viewport, visibleSubcells, gardenState, speciesMap, brushCursor]);
  // Note: paintOverlayRef NOT in deps - RAF reads from ref every frame without re-renders
}

/**
 * Terrain type colors
 */
const TERRAIN_COLORS: Record<string, string> = {
  planting: '#374151',  // gray-700 (default plantable)
  pathway: '#78716c',   // stone-500
  water: '#3b82f6',     // blue-500
  tree: '#166534',      // green-800
  path: '#78716c',      // stone-500 (alias for pathway)
};

/**
 * Draw subcell layer (individual 3×3 inch cells)
 *
 * Subcells occupied by plants render in species-specific colors.
 * Moisture bonus zones show a subtle blue wash.
 */
function drawSubcellLayer(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  visibleSubcells: SubcellState[],
  paintOverlay: Map<string, SubcellState>,
  subcellSpecies: Map<string, string>
) {
  // Precompute scale factor for pixel-snapping math
  const pxPerWorldInch = PIXELS_PER_INCH * viewport.scale;

  visibleSubcells.forEach((subcell) => {
    // Check overlay first (O(1) Map lookup) - if painted, use overlay version
    const actualSubcell = paintOverlay.get(subcell.subcell_id) || subcell;

    const screenPos = worldToScreen(actualSubcell.position, viewport);

    // Snap to integer pixel boundaries to eliminate subpixel shimmer.
    // floor() both corners so adjacent cells share the exact same pixel edge.
    const x0 = Math.floor(screenPos.x);
    const y0 = Math.floor(screenPos.y);
    const x1 = Math.floor(screenPos.x + SUBCELL_SIZE_IN * pxPerWorldInch);
    const y1 = Math.floor(screenPos.y + SUBCELL_SIZE_IN * pxPerWorldInch);
    const w = Math.max(1, x1 - x0);
    const h = Math.max(1, y1 - y0);

    // Determine subcell color based on terrain type and plant occupancy
    const terrainType = actualSubcell.type || 'planting';

    // Check if any plant occupies this subcell (via occupied_subcells lookup)
    const speciesId = subcellSpecies.get(actualSubcell.subcell_id);

    if (speciesId) {
      // Occupied by a plant — color by species
      ctx.fillStyle = getPlantColor(speciesId);
    } else if (terrainType !== 'planting') {
      // Non-plantable terrain - use terrain color
      ctx.fillStyle = TERRAIN_COLORS[terrainType] || TERRAIN_COLORS.planting || '#374151';
    } else {
      // Empty plantable - dark gray
      ctx.fillStyle = '#374151'; // gray-700
    }

    // Draw subcell rectangle (pixel-snapped)
    ctx.fillRect(x0, y0, w, h);

    // Moisture bonus zone: subtle blue wash for high-moisture planting soil near channel
    if ((actualSubcell.soil?.moisture_pct ?? 0) >= 70 && terrainType === 'planting' && !speciesId) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; // blue-500 at 15%
      ctx.fillRect(x0, y0, w, h);
    }

    // Draw shade overlay if subcell has shade data
    const shadeMap = actualSubcell.shade_map;
    if (shadeMap) {
      // Check if any shade is defined (either season)
      const hasSummerShade = shadeMap.summer && Object.values(shadeMap.summer).some(v => v);
      const hasWinterShade = shadeMap.winter && Object.values(shadeMap.winter).some(v => v);

      if (hasSummerShade || hasWinterShade) {
        // Draw semi-transparent dark overlay for shaded areas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x0, y0, w, h);
      }
    }

    // Draw subcell border (only visible when zoomed in)
    if (viewport.scale >= 1.0) {
      ctx.strokeStyle = '#1f2937'; // gray-800
      ctx.lineWidth = 1;
      // +0.5 offset for crisp 1px stroke (canvas strokes center on coordinate)
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    }
  });
}

/**
 * Draw grid layer with level of detail
 *
 * Scale-dependent rendering:
 * - Scale ≥0.5: Show 1×1 ft cell grid
 * - Scale 0.05-0.5: Show 10×10 ft zone grid
 * - Scale <0.05: No grid (just garden boundary)
 */
function drawGridLayer(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  gardenState: GardenState
) {
  const gardenWidth = gardenState.grid.width_ft * 12; // feet to inches
  const gardenHeight = gardenState.grid.length_ft * 12;

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
    drawCellGrid(ctx, viewport, gardenState);
  } else if (viewport.scale >= 0.05) {
    // Show 10×10 ft zone grid (visible at more zoom levels)
    drawZoneGrid(ctx, viewport, gardenState);
  }
  // Below 0.05x: no grid, just boundary
}

/**
 * Draw 1×1 ft cell grid
 */
function drawCellGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  gardenState: GardenState
) {
  ctx.strokeStyle = '#1F2937'; // gray-800
  ctx.lineWidth = 1;

  const gardenWidth = gardenState.grid.width_ft * 12;
  const gardenHeight = gardenState.grid.length_ft * 12;

  // Vertical lines every 12 inches (1 ft)
  for (let x_in = 0; x_in <= gardenWidth; x_in += 12) {
    const topPos = worldToScreen({ x_in, y_in: 0 }, viewport);
    const bottomPos = worldToScreen({ x_in, y_in: gardenHeight }, viewport);

    // Snap to half-pixel for crisp 1px lines
    const x = Math.floor(topPos.x) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, Math.floor(topPos.y));
    ctx.lineTo(x, Math.floor(bottomPos.y));
    ctx.stroke();
  }

  // Horizontal lines every 12 inches (1 ft)
  for (let y_in = 0; y_in <= gardenHeight; y_in += 12) {
    const leftPos = worldToScreen({ x_in: 0, y_in }, viewport);
    const rightPos = worldToScreen({ x_in: gardenWidth, y_in }, viewport);

    const y = Math.floor(leftPos.y) + 0.5;
    ctx.beginPath();
    ctx.moveTo(Math.floor(leftPos.x), y);
    ctx.lineTo(Math.floor(rightPos.x), y);
    ctx.stroke();
  }
}

/**
 * Draw 10×10 ft zone grid
 */
function drawZoneGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  gardenState: GardenState
) {
  ctx.strokeStyle = '#374151'; // gray-700
  ctx.lineWidth = 2;

  const gardenWidth = gardenState.grid.width_ft * 12;
  const gardenHeight = gardenState.grid.length_ft * 12;

  // Vertical lines every 120 inches (10 ft)
  for (let x_in = 0; x_in <= gardenWidth; x_in += 120) {
    const topPos = worldToScreen({ x_in, y_in: 0 }, viewport);
    const bottomPos = worldToScreen({ x_in, y_in: gardenHeight }, viewport);

    // Snap to half-pixel for crisp lines
    const x = Math.floor(topPos.x) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, Math.floor(topPos.y));
    ctx.lineTo(x, Math.floor(bottomPos.y));
    ctx.stroke();
  }

  // Horizontal lines every 120 inches (10 ft)
  for (let y_in = 0; y_in <= gardenHeight; y_in += 120) {
    const leftPos = worldToScreen({ x_in: 0, y_in }, viewport);
    const rightPos = worldToScreen({ x_in: gardenWidth, y_in }, viewport);

    const y = Math.floor(leftPos.y) + 0.5;
    ctx.beginPath();
    ctx.moveTo(Math.floor(leftPos.x), y);
    ctx.lineTo(Math.floor(rightPos.x), y);
    ctx.stroke();
  }
}

/**
 * Draw infrastructure layer (trellis wire/posts, mound outlines)
 *
 * Renders physical garden features between subcell and plant layers.
 * Uses channel path waypoints for trellis wire routing.
 */
function drawInfrastructureLayer(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  infrastructure: InfrastructureFeature[]
) {
  const { scale } = viewport;

  // Find channel path for trellis wire routing (trellis follows channel)
  const channel = infrastructure.find(f => f.type === 'channel') as ChannelFeature | undefined;

  for (const feature of infrastructure) {
    if (feature.type === 'trellis' && channel) {
      drawTrellis(ctx, viewport, channel.path);
    } else if (feature.type === 'mound' && scale >= 0.1) {
      drawMound(ctx, viewport, feature as MoundFeature);
    }
  }
}

/**
 * Draw trellis wire and posts along channel path.
 * Uses glow + wire two-pass rendering for visibility at all zoom levels,
 * and cross-shaped post markers for T-post recognition.
 */
function drawTrellis(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  path: Array<{ x_in: number; y_in: number }>
) {
  if (path.length < 2) return;
  const { scale } = viewport;

  // Helper: trace the wire path
  const tracePath = () => {
    ctx.beginPath();
    const p = worldToScreen(path[0]!, viewport);
    ctx.moveTo(p.x, p.y);
    for (let i = 1; i < path.length; i++) {
      const pt = worldToScreen(path[i]!, viewport);
      ctx.lineTo(pt.x, pt.y);
    }
  };

  // --- Pass 1: Glow halo (warm amber aura for visibility at overview zoom) ---
  ctx.save();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)'; // amber-400 at 25%
  ctx.lineWidth = Math.max(5, 8 * scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);
  tracePath();
  ctx.stroke();
  ctx.restore();

  // --- Pass 2: Main wire (bright amber, crisp) ---
  ctx.save();
  ctx.strokeStyle = '#D97706'; // amber-600
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);
  tracePath();
  ctx.stroke();
  ctx.restore();

  // --- Pass 3: Cross-shaped T-post markers every 10ft ---
  const POST_SPACING = 120; // inches
  const postSize = Math.max(5, 10 * scale);
  const postThickness = Math.max(2, 3 * scale);
  const half = postSize / 2;
  const halfT = postThickness / 2;

  for (let i = 0; i < path.length - 1; i++) {
    const p0 = path[i]!;
    const p1 = path[i + 1]!;
    const segDx = p1.x_in - p0.x_in;
    const segDy = p1.y_in - p0.y_in;
    const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
    if (segLen === 0) continue;

    for (let dist = 0; dist <= segLen; dist += POST_SPACING) {
      const t = dist / segLen;
      const postPos = worldToScreen(
        { x_in: p0.x_in + segDx * t, y_in: p0.y_in + segDy * t },
        viewport
      );
      // Snap to integer pixels to prevent anti-aliasing blur
      const cx = Math.round(postPos.x);
      const cy = Math.round(postPos.y);

      // Cross shape: horizontal + vertical bars
      ctx.fillStyle = '#A8A29E'; // stone-400
      ctx.fillRect(cx - half, cy - halfT, postSize, postThickness);
      ctx.fillRect(cx - halfT, cy - half, postThickness, postSize);

      // Dark outline for definition
      ctx.strokeStyle = '#292524'; // stone-800
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(cx - half, cy - halfT, postSize, postThickness);
      ctx.strokeRect(cx - halfT, cy - half, postThickness, postSize);
    }
  }
}

/**
 * Draw mound outline circle
 */
function drawMound(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  mound: MoundFeature
) {
  const center = worldToScreen(mound.center, viewport);
  const radiusPx = (mound.diameter_in / 2) * PIXELS_PER_INCH * viewport.scale;

  // Skip if too small to see
  if (radiusPx < 3) return;

  ctx.strokeStyle = '#A8A29E'; // stone-400 (subtle earth tone)
  ctx.lineWidth = Math.max(1, 1.5 * viewport.scale);
  ctx.setLineDash([4, 4]); // Dashed line
  ctx.beginPath();
  ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash
}

/**
 * Draw plant layer (emoji icons at high zoom, dots at low zoom)
 *
 * Plant spatial footprint is rendered via species-colored occupied_subcells
 * in the subcell layer. This layer only draws identification markers:
 * - Scale ≥0.5: Emoji icons at plant root positions
 * - Scale <0.5: Colored dots at plant root positions
 */
function drawPlantLayer(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  gardenState: GardenState,
  _speciesMap: Map<string, PlantSpecies>
) {
  // Build a map of subcell_id -> position for efficient lookup
  const subcellPositions = new Map<string, { x_in: number; y_in: number }>();
  for (const subcell of gardenState.subcells) {
    subcellPositions.set(subcell.subcell_id, subcell.position);
  }

  // Render each plant in the garden
  gardenState.plants.forEach((plant) => {
    // Get plant position from root subcell
    const position = subcellPositions.get(plant.root_subcell_id);
    if (!position) return; // Skip if root subcell not found

    // Calculate center of subcell (icon stays centered in its subcell)
    const centerPos = worldToScreen(
      {
        x_in: position.x_in + SUBCELL_SIZE_IN / 2,
        y_in: position.y_in + SUBCELL_SIZE_IN / 2
      },
      viewport
    );

    if (viewport.scale >= 0.5) {
      // Draw emoji icon at fixed readable size
      const iconSize = 20; // Fixed size for readability
      drawPlantIcon(ctx, plant.species_id, centerPos, iconSize);
    } else {
      // Show colored dot (icon too small to see)
      const dotRadius = Math.max(2, SUBCELL_SIZE_IN * PIXELS_PER_INCH * viewport.scale * 0.3);
      ctx.fillStyle = getPlantColor(plant.species_id);
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

/**
 * Draw brush cursor preview
 *
 * Shows a semi-transparent square indicating the area that will be painted.
 * Size adapts to brush radius (which changes based on zoom level).
 */
function drawBrushCursor(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  cursor: BrushCursor
) {
  // Calculate brush size in world units
  // Brush paints (2*radius+1) subcells in each direction
  const brushSizeSubcells = cursor.radiusCells * 2 + 1;
  const brushSizeInches = brushSizeSubcells * SUBCELL_SIZE_IN;

  // Calculate screen position (center of brush)
  const centerScreen = worldToScreen(
    { x_in: cursor.x_in, y_in: cursor.y_in },
    viewport
  );

  // Calculate brush size in pixels
  const brushSizePx = brushSizeInches * PIXELS_PER_INCH * viewport.scale;
  const halfSize = brushSizePx / 2;

  // Draw brush preview rectangle
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]); // Dashed line
  ctx.globalAlpha = 0.8;

  ctx.strokeRect(
    centerScreen.x - halfSize,
    centerScreen.y - halfSize,
    brushSizePx,
    brushSizePx
  );

  // Fill with semi-transparent color
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(
    centerScreen.x - halfSize,
    centerScreen.y - halfSize,
    brushSizePx,
    brushSizePx
  );

  // Reset line dash and alpha
  ctx.setLineDash([]);
  ctx.globalAlpha = 1.0;
}
