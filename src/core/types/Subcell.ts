import { z } from 'zod';

/**
 * Time slots for shade/sun tracking
 *
 * Each slot represents a ~3 hour window during typical growing season daylight:
 * - early_morning: 6-9 AM (sunrise to mid-morning)
 * - mid_morning: 9 AM-12 PM (peak morning sun)
 * - early_afternoon: 12-3 PM (peak sun)
 * - late_afternoon: 3-6 PM (declining sun to sunset)
 */
export const TimeSlotSchema = z.enum([
  'early_morning',
  'mid_morning',
  'early_afternoon',
  'late_afternoon',
]);
export type TimeSlot = z.infer<typeof TimeSlotSchema>;

/**
 * Seasons for shade pattern variations
 *
 * - summer: May-Aug (longer days, higher sun angle, ~14 hrs daylight)
 * - winter: Nov-Feb (shorter days, lower sun angle, ~10 hrs daylight)
 *
 * Spring/fall use interpolated values based on month.
 */
export const SeasonSchema = z.enum(['summer', 'winter']);
export type Season = z.infer<typeof SeasonSchema>;

/**
 * Shade slots for a single season
 *
 * Each boolean indicates whether this subcell is shaded during that time slot.
 * true = shaded (obstructed by tree, structure, etc.)
 * false or undefined = sunny
 */
export const SeasonalShadeSchema = z.object({
  early_morning: z.boolean().optional(),
  mid_morning: z.boolean().optional(),
  early_afternoon: z.boolean().optional(),
  late_afternoon: z.boolean().optional(),
});
export type SeasonalShade = z.infer<typeof SeasonalShadeSchema>;

/**
 * Full shade map for a subcell
 *
 * Tracks shade patterns across seasons. Used to calculate effective sun_hours.
 * Users paint shade via brush tool; sun_hours are derived from this map.
 */
export const ShadeMapSchema = z.object({
  summer: SeasonalShadeSchema.optional(),
  winter: SeasonalShadeSchema.optional(),
});
export type ShadeMap = z.infer<typeof ShadeMapSchema>;

/**
 * Hours of sunlight per time slot by season
 *
 * Based on typical mid-latitude daylight patterns:
 * - Summer: ~14 hrs daylight, slots weighted toward longer periods
 * - Winter: ~10 hrs daylight, slots weighted toward midday
 */
export const SUN_HOURS_BY_SLOT: Record<Season, Record<TimeSlot, number>> = {
  summer: {
    early_morning: 2.5,   // 6-9 AM: good light, lower intensity
    mid_morning: 3.0,     // 9-12 PM: strong light
    early_afternoon: 3.0, // 12-3 PM: peak intensity
    late_afternoon: 2.5,  // 3-6 PM: declining but still strong
  },
  winter: {
    early_morning: 1.5,   // 8-10 AM: limited morning light
    mid_morning: 2.5,     // 10-12 PM: best winter light
    early_afternoon: 2.5, // 12-2 PM: still good
    late_afternoon: 1.5,  // 2-4 PM: fading quickly
  },
};

/**
 * Calculate sun hours from shade map for a specific season
 *
 * @param shadeMap - The subcell's shade map
 * @param season - Season to calculate for
 * @returns Effective sun hours (0-12)
 */
export function calculateSunHours(shadeMap: ShadeMap | undefined, season: Season): number {
  const slotHours = SUN_HOURS_BY_SLOT[season];
  const seasonalShade = shadeMap?.[season];

  if (!seasonalShade) {
    // No shade data = full sun for all slots
    return Object.values(slotHours).reduce((sum, hours) => sum + hours, 0);
  }

  let totalHours = 0;
  for (const [slot, hours] of Object.entries(slotHours)) {
    const isShaded = seasonalShade[slot as TimeSlot];
    if (!isShaded) {
      totalHours += hours;
    }
  }

  return totalHours;
}

/**
 * Calculate morning vs afternoon sun scores (0-1 scale)
 *
 * Useful for plant recommendations:
 * - Some plants prefer morning sun (cooler, less intense)
 * - Some plants prefer afternoon sun (warmer, more intense)
 *
 * @param shadeMap - The subcell's shade map
 * @param season - Season to calculate for
 * @returns { morning: 0-1, afternoon: 0-1 }
 */
export function calculateSunScores(
  shadeMap: ShadeMap | undefined,
  season: Season
): { morning: number; afternoon: number } {
  const seasonalShade = shadeMap?.[season];
  const slotHours = SUN_HOURS_BY_SLOT[season];

  // Morning = early_morning + mid_morning
  const maxMorningHours = slotHours.early_morning + slotHours.mid_morning;
  let morningHours = maxMorningHours;
  if (seasonalShade?.early_morning) morningHours -= slotHours.early_morning;
  if (seasonalShade?.mid_morning) morningHours -= slotHours.mid_morning;

  // Afternoon = early_afternoon + late_afternoon
  const maxAfternoonHours = slotHours.early_afternoon + slotHours.late_afternoon;
  let afternoonHours = maxAfternoonHours;
  if (seasonalShade?.early_afternoon) afternoonHours -= slotHours.early_afternoon;
  if (seasonalShade?.late_afternoon) afternoonHours -= slotHours.late_afternoon;

  return {
    morning: morningHours / maxMorningHours,
    afternoon: afternoonHours / maxAfternoonHours,
  };
}

/**
 * Soil conditions at a specific location
 */
export const SoilConditionsSchema = z.object({
  N_ppm: z.number().min(0),        // Nitrogen (parts per million)
  P_ppm: z.number().min(0),        // Phosphorus
  K_ppm: z.number().min(0),        // Potassium
  pH: z.number().min(0).max(14),   // Soil pH
  compaction_psi: z.number().min(0), // Soil compaction (pounds per square inch)
  organic_matter_pct: z.number().min(0).max(100), // Organic matter percentage
});

export type SoilConditions = z.infer<typeof SoilConditionsSchema>;

// PlantInstance and Observation have been moved to:
// - PlantInstance: src/core/types/GardenState.ts (top-level in GardenState)
// - Observation: src/core/types/Observation.ts (separate file with source tracking)

/**
 * Conditions specific to a subcell
 */
export const SubcellConditionsSchema = z.object({
  sun_hours: z.number().min(0).max(24), // Average hours of direct sunlight per day (can be derived from shade_map)
  shade_map: ShadeMapSchema.optional(), // Detailed shade data by time slot and season
  soil: SoilConditionsSchema,
  type: z.enum(['planting', 'pathway', 'water', 'tree']), // Subcell terrain type
});

export type SubcellConditions = z.infer<typeof SubcellConditionsSchema>;

/**
 * Computed aggregation helpers
 * These are calculated from position, not stored independently
 */
export const SubcellComputedSchema = z.object({
  cell_x_ft: z.number().int().min(0),  // Which 1×1 ft cell (x coordinate)
  cell_y_ft: z.number().int().min(0),  // Which 1×1 ft cell (y coordinate)
  zone_x: z.number().int().min(0),     // Which 10×10 ft zone (x coordinate)
  zone_y: z.number().int().min(0),     // Which 10×10 ft zone (y coordinate)
});

export type SubcellComputed = z.infer<typeof SubcellComputedSchema>;

/**
 * Subcell - The atomic spatial unit (3×3 inches)
 *
 * Contains spatial data and conditions only.
 * Plants are stored in GardenState.plants[] and referenced by plant_id.
 * Observations are stored separately in Observation objects.
 *
 * This is the base schema for spatial data. For temporal snapshots,
 * see SubcellState in GardenState.ts which extends this with plant_id.
 */
export const SubcellSchema = z.object({
  id: z.string(),                    // Format: "sub_{x_in}_{y_in}"

  // Absolute position in inches from southwest corner (0,0)
  position: z.object({
    x_in: z.number().int().min(0),   // X position in inches
    y_in: z.number().int().min(0),   // Y position in inches
  }),

  // Computed aggregation helpers (calculated from position)
  computed: SubcellComputedSchema,

  // Growing conditions
  conditions: SubcellConditionsSchema,
});

export type Subcell = z.infer<typeof SubcellSchema>;

/**
 * Helper function to compute cell and zone coordinates from subcell position
 */
export function computeSubcellAggregation(x_in: number, y_in: number): SubcellComputed {
  return {
    cell_x_ft: Math.floor(x_in / 12),      // 12 inches per foot
    cell_y_ft: Math.floor(y_in / 12),
    zone_x: Math.floor(x_in / 120),        // 120 inches per 10 ft zone
    zone_y: Math.floor(y_in / 120),
  };
}

/**
 * Create a subcell ID from position
 */
export function createSubcellId(x_in: number, y_in: number): string {
  return `sub_${x_in}_${y_in}`;
}
