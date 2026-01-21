/**
 * Canvas Transform Utilities
 *
 * Foundation for coordinate conversion between world space (inches) and screen space (pixels).
 * All garden data is stored in world coordinates (inches from origin).
 * Canvas rendering requires screen coordinates (pixels from top-left).
 */

export const PIXELS_PER_INCH = 10; // Standard: 10 pixels = 1 inch at scale 1.0

export interface Viewport {
  offsetX: number;  // World X position at top-left of screen (inches)
  offsetY: number;  // World Y position at top-left of screen (inches)
  scale: number;    // Zoom scale (0.1 = zoomed out, 10 = zoomed in)
}

export interface WorldPosition {
  x_in: number;
  y_in: number;
}

export interface ScreenPosition {
  x: number;
  y: number;
}

export interface ViewportBounds {
  minX: number;  // Minimum world X visible (inches)
  maxX: number;  // Maximum world X visible (inches)
  minY: number;  // Minimum world Y visible (inches)
  maxY: number;  // Maximum world Y visible (inches)
}

/**
 * Convert world coordinates (inches) to screen coordinates (pixels)
 *
 * Formula: screenX = (worldX - viewport.offsetX) * PIXELS_PER_INCH * viewport.scale
 *
 * @param worldPos - Position in world space (inches)
 * @param viewport - Current viewport state
 * @returns Position in screen space (pixels)
 */
export function worldToScreen(worldPos: WorldPosition, viewport: Viewport): ScreenPosition {
  return {
    x: (worldPos.x_in - viewport.offsetX) * PIXELS_PER_INCH * viewport.scale,
    y: (worldPos.y_in - viewport.offsetY) * PIXELS_PER_INCH * viewport.scale
  };
}

/**
 * Convert screen coordinates (pixels) to world coordinates (inches)
 *
 * Formula: worldX = screenX / (PIXELS_PER_INCH * viewport.scale) + viewport.offsetX
 *
 * @param screenPos - Position in screen space (pixels)
 * @param viewport - Current viewport state
 * @returns Position in world space (inches)
 */
export function screenToWorld(screenPos: ScreenPosition, viewport: Viewport): WorldPosition {
  return {
    x_in: screenPos.x / (PIXELS_PER_INCH * viewport.scale) + viewport.offsetX,
    y_in: screenPos.y / (PIXELS_PER_INCH * viewport.scale) + viewport.offsetY
  };
}

/**
 * Calculate viewport bounds in world coordinates
 *
 * This determines which portion of the garden is currently visible on screen.
 * Used for culling (only render what's visible).
 *
 * @param viewport - Current viewport state
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @returns Viewport bounds in world coordinates (inches)
 */
export function getViewportBounds(
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number
): ViewportBounds {
  // Calculate how many inches fit on screen at current scale
  const widthInches = canvasWidth / (PIXELS_PER_INCH * viewport.scale);
  const heightInches = canvasHeight / (PIXELS_PER_INCH * viewport.scale);

  return {
    minX: viewport.offsetX,
    maxX: viewport.offsetX + widthInches,
    minY: viewport.offsetY,
    maxY: viewport.offsetY + heightInches
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate initial scale to fit garden in viewport
 *
 * @param gardenWidth - Garden width in inches
 * @param gardenHeight - Garden height in inches
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @returns Scale that fits entire garden with 10% margin
 */
export function calculateInitialScale(
  gardenWidth: number,
  gardenHeight: number,
  canvasWidth: number = window.innerWidth,
  canvasHeight: number = window.innerHeight
): number {
  const scaleX = (canvasWidth * 0.9) / (gardenWidth * PIXELS_PER_INCH);
  const scaleY = (canvasHeight * 0.9) / (gardenHeight * PIXELS_PER_INCH);

  // Use the smaller scale to ensure both dimensions fit
  const fitScale = Math.min(scaleX, scaleY);

  // Clamp to valid range
  return clamp(fitScale, 0.1, 10);
}
