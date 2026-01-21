import { LookupTable } from '../types';

/**
 * Linear interpolation between breakpoints
 *
 * Given a lookup table mapping input values to output multipliers,
 * interpolates linearly between breakpoints.
 *
 * Example:
 *   interpolate({4: 0.3, 8: 1.0}, 6) = 0.65
 *   (halfway between 4 and 8, so halfway between 0.3 and 1.0)
 *
 * Edge cases:
 * - Values below minimum breakpoint: clamp to minimum value
 * - Values above maximum breakpoint: clamp to maximum value
 * - Exact match: return exact value
 * - Single breakpoint: return that value for all inputs
 *
 * @param table - Lookup table {input → output}
 * @param value - Input value to interpolate
 * @returns Interpolated output value
 */
export function interpolate(table: LookupTable, value: number): number {
  // Get breakpoints and sort them
  const breakpoints = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);

  // Edge case: empty table (shouldn't happen, but handle gracefully)
  if (breakpoints.length === 0) {
    return 0;
  }

  // Edge case: single breakpoint (constant function)
  if (breakpoints.length === 1) {
    return table[breakpoints[0]!]!;
  }

  const minBreakpoint = breakpoints[0]!;
  const maxBreakpoint = breakpoints[breakpoints.length - 1]!;

  // Clamp below minimum
  if (value <= minBreakpoint) {
    return table[minBreakpoint]!;
  }

  // Clamp above maximum
  if (value >= maxBreakpoint) {
    return table[maxBreakpoint]!;
  }

  // Find the two surrounding breakpoints
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const x0 = breakpoints[i]!;
    const x1 = breakpoints[i + 1]!;

    if (value >= x0 && value <= x1) {
      const y0 = table[x0]!;
      const y1 = table[x1]!;

      // Linear interpolation formula: y = y0 + (y1 - y0) * ((x - x0) / (x1 - x0))
      const fraction = (value - x0) / (x1 - x0);
      return y0 + (y1 - y0) * fraction;
    }
  }

  // Should never reach here, but return max value as fallback
  return table[maxBreakpoint]!;
}
