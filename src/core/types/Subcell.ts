import { z } from 'zod';

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

/**
 * A single plant instance
 */
export const PlantInstanceSchema = z.object({
  individual_id: z.string(),       // Unique identifier for this specific plant
  species_id: z.string(),          // Reference to PlantSpecies
  planted_date: z.string(),        // ISO date string
  expected_yield_lbs: z.number().min(0), // Calculated expected yield
});

export type PlantInstance = z.infer<typeof PlantInstanceSchema>;

/**
 * Machine observation of a plant
 */
export const ObservationSchema = z.object({
  timestamp: z.string(),           // ISO datetime string
  height_cm: z.number().min(0).optional(),
  health_score: z.number().min(0).max(1).optional(), // 0 = dead, 1 = perfect health
  leaf_count: z.number().int().min(0).optional(),
  image_url: z.string().url().optional(),
  notes: z.string().optional(),
});

export type Observation = z.infer<typeof ObservationSchema>;

/**
 * Conditions specific to a subcell
 */
export const SubcellConditionsSchema = z.object({
  sun_hours: z.number().min(0).max(24), // Average hours of direct sunlight per day
  soil: SoilConditionsSchema,
  type: z.enum(['planting', 'pathway']), // Is this area plantable or a pathway?
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
 * Subcell - The atomic data unit (3×3 inches)
 *
 * CRITICAL: This is the single source of truth for all garden data.
 * Cells and zones are computed views aggregated from subcells.
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

  // What's planted here (optional - null for empty subcells)
  plant: PlantInstanceSchema.optional(),

  // Machine observations over time (optional - sparse array)
  observations: z.array(ObservationSchema).optional(),
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
