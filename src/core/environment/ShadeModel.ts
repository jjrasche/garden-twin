/**
 * Solar geometry shade model for a deciduous tree obstruction.
 *
 * Computes effective direct sun hours at a given physY distance from the tree,
 * accounting for solar elevation (latitude + date) and leaf-on/off phenology.
 *
 * Simplifications:
 * - 1D shadow model (physY distance only, ignores E-W spread)
 * - Noon shadow length as reference; morning/evening shadows approximated
 * - Leaf emergence/drop modeled as binary (May 1 / Oct 15 for GR Zone 6a)
 */

const DEG_TO_RAD = Math.PI / 180;

// Grand Rapids, MI
const LATITUDE = 42.96;

// Deciduous tree phenology (Zone 6a)
const LEAF_ON_DOY = 121;   // ~May 1
const LEAF_OFF_DOY = 288;  // ~Oct 15

const BASE_DIRECT_SUN_HOURS = 8;

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/** Solar declination in degrees for a given day of year. */
function solarDeclination(doy: number): number {
  return 23.44 * Math.sin(2 * Math.PI * (284 + doy) / 365);
}

/** Solar elevation at noon for Grand Rapids. */
function noonSolarElevation(doy: number): number {
  return 90 - LATITUDE + solarDeclination(doy);
}

/** Northward shadow length (ft) cast by a tree of given height at noon. */
function noonShadowLength(tree_height_ft: number, doy: number): number {
  const elevation = noonSolarElevation(doy);
  if (elevation <= 0) return Infinity;
  return tree_height_ft / Math.tan(elevation * DEG_TO_RAD);
}

/**
 * Shade fraction at a garden position (0 = full shade, 1 = no shade).
 *
 * Based on solar geometry: noon shadow length of deciduous tree at physY=0,
 * with leaf-on/off phenology for Zone 6a.
 */
export function computeShadeFraction(
  physY: number,
  date: Date,
  tree_height_ft: number,
): number {
  const doy = dayOfYear(date);
  const distance_ft = physY / 12; // inches → feet

  // No leaves: bare branches block ~10% of light for nearby plants
  const has_leaves = doy >= LEAF_ON_DOY && doy <= LEAF_OFF_DOY;
  if (!has_leaves) {
    return distance_ft < tree_height_ft * 0.3 ? 0.9 : 1.0;
  }

  const shadow_ft = noonShadowLength(tree_height_ft, doy);

  // Beyond 1.5× noon shadow: no meaningful shade
  if (distance_ft > shadow_ft * 1.5) return 1.0;

  // Within half of noon shadow: deep shade (shaded most of midday)
  if (distance_ft <= shadow_ft * 0.5) return 0.35;

  // Between 0.5× and 1.0× noon shadow: moderate shade
  if (distance_ft <= shadow_ft) {
    const fraction = (distance_ft - shadow_ft * 0.5) / (shadow_ft * 0.5);
    return 0.35 + 0.35 * fraction;
  }

  // Between 1.0× and 1.5× noon shadow: light shade (morning/evening only)
  const fraction = (distance_ft - shadow_ft) / (shadow_ft * 0.5);
  return 0.7 + 0.3 * fraction;
}

/**
 * Compute effective direct sun hours at a garden position.
 *
 * @param physY - North-south position in garden (inches from south edge)
 * @param date - Date to compute for
 * @param tree_height_ft - Height of shade tree at south edge (physY=0)
 * @param observed_sunshine_hours - Actual sunshine from weather data (replaces BASE when available)
 * @returns Effective direct sun hours
 */
export function computeEffectiveSunHours(
  physY: number,
  date: Date,
  tree_height_ft: number,
  observed_sunshine_hours?: number,
): number {
  const base = observed_sunshine_hours ?? BASE_DIRECT_SUN_HOURS;
  return base * computeShadeFraction(physY, date, tree_height_ft);
}
