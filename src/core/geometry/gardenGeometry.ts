/**
 * Garden spatial operations — single source of truth for coordinate transforms
 * and polyline geometry.
 *
 * Physical coordinate system:
 *   physX: 0 (west) → width_in (east)
 *   physY: 0 (south) → length_in (north)
 *
 * Screen coordinate system (for rendering):
 *   x_in: 0 (north/left) → length_in (south/right)
 *   y_in: 0 (east/top) → width_in (west/bottom)
 */

// ── Constants ────────────────────────────────────────────────────────────────

export const PHYS_WIDTH_IN = 360;    // 30 ft east-west
export const PHYS_LENGTH_IN = 1200;  // 100 ft north-south
export const SUBCELL_SIZE_IN = 3;

// ── Coordinate Transforms ────────────────────────────────────────────────────

export function toScreen(physX: number, physY: number): { x_in: number; y_in: number } {
  return {
    x_in: PHYS_LENGTH_IN - physY,
    y_in: PHYS_WIDTH_IN - physX,
  };
}

export function toScreenSnapped(physX: number, physY: number): { x_in: number; y_in: number } {
  const s = toScreen(physX, physY);
  return {
    x_in: Math.floor(s.x_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN,
    y_in: Math.floor(s.y_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN,
  };
}

export function createSubcellIdFromPhys(physX: number, physY: number): string {
  const s = toScreenSnapped(physX, physY);
  return `sub_${s.x_in}_${s.y_in}`;
}

// ── Polyline Geometry (generic — works for any polyline obstruction) ──────────

export type Polyline = Array<{ x: number; y: number }>;

/** Interpolate X position along a polyline at a given Y. */
export function interpolatePolylineX(physY: number, polyline: Polyline): number {
  if (polyline.length < 2) return polyline[0]?.x ?? 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]!;
    const b = polyline[i + 1]!;
    if (physY >= a.y && physY <= b.y) {
      const t = (b.y - a.y) === 0 ? 0 : (physY - a.y) / (b.y - a.y);
      return a.x + t * (b.x - a.x);
    }
  }
  return polyline[polyline.length - 1]!.x;
}

/** Minimum distance from a point to a polyline (physical coords). */
export function distanceToPolyline(
  px: number, py: number, polyline: Polyline,
): number {
  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const ax = polyline[i]!.x, ay = polyline[i]!.y;
    const bx = polyline[i + 1]!.x, by = polyline[i + 1]!.y;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    const cx = ax + t * dx, cy = ay + t * dy;
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

/** Usable width (inches) west of a polyline at a given physY, minus buffer. */
export function widthWestOfPolyline(
  physY: number, polyline: Polyline, bufferIn: number,
): number {
  return Math.max(0, interpolatePolylineX(physY, polyline) - bufferIn);
}

/** Average width west of polyline across a physY range. */
export function avgWidthWestOfPolyline(
  physYRange: [number, number], polyline: Polyline, bufferIn: number, samples = 5,
): number {
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const t = (i + 0.5) / samples;
    const y = physYRange[0] + t * (physYRange[1] - physYRange[0]);
    sum += widthWestOfPolyline(y, polyline, bufferIn);
  }
  return sum / samples;
}
