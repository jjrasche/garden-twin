import { z } from 'zod';

/**
 * Labor task definition
 */
export const TaskSchema = z.object({
  name: z.string(),                       // e.g., "planting", "watering", "harvest"
  timing_days: z.array(z.number().int().min(0)), // Days from planting date [0, 7, 14, ...]
  hours_per_plant: z.number().min(0).optional(),  // Labor hours per plant
  hours_per_sq_ft: z.number().min(0).optional(),  // Labor hours per square foot
  processing_hours_per_lb: z.number().min(0).optional(), // Post-harvest processing
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * Nutritional content per pound of harvest
 */
export const NutritionPerLbSchema = z.object({
  calories: z.number().min(0),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_g: z.number().min(0),
  fiber_g: z.number().min(0),
  vitamin_a_mcg: z.number().min(0).optional(),
  vitamin_c_mg: z.number().min(0).optional(),
  vitamin_k_mcg: z.number().min(0).optional(),
  calcium_mg: z.number().min(0).optional(),
  iron_mg: z.number().min(0).optional(),
  potassium_mg: z.number().min(0).optional(),
});

export type NutritionPerLb = z.infer<typeof NutritionPerLbSchema>;

/**
 * Visual representation
 */
export const IconSchema = z.object({
  emoji: z.string(),                // e.g., "🌽"
  color: z.string().optional(),     // Hex color fallback
});

export type Icon = z.infer<typeof IconSchema>;

/**
 * Lookup table for interpolation
 * Maps input value to output multiplier
 * Example: {4: 0.3, 8: 1.0} means:
 *   - At 4 hours sun: 0.3× yield
 *   - At 8 hours sun: 1.0× yield
 *   - At 6 hours sun: interpolate to 0.65× yield
 */
export const LookupTableSchema = z.record(z.number());

export type LookupTable = z.infer<typeof LookupTableSchema>;

/**
 * Soil modifiers - lookup tables for each nutrient
 */
export const SoilModifiersSchema = z.object({
  N_ppm: LookupTableSchema,
  P_ppm: LookupTableSchema,
  K_ppm: LookupTableSchema,
  pH: LookupTableSchema,
  compaction_psi: LookupTableSchema,
});

export type SoilModifiers = z.infer<typeof SoilModifiersSchema>;

/**
 * All yield modifiers for a species
 */
export const ModifiersSchema = z.object({
  sun: LookupTableSchema,                    // Sun hours → multiplier
  soil: SoilModifiersSchema,                 // Soil conditions → multipliers
  spacing_plants_per_sq_ft: LookupTableSchema, // Plant density → multiplier
});

export type Modifiers = z.infer<typeof ModifiersSchema>;

/**
 * Data source citation
 */
export const SourceSchema = z.object({
  claim: z.string(),           // What this source supports (e.g., "yield")
  citation: z.string(),        // Author, year, title
  url: z.string().url(),       // Link to source
});

export type Source = z.infer<typeof SourceSchema>;

/**
 * Plant species definition
 *
 * Contains all genetic/biological data for a plant variety.
 * Used to calculate yield, labor, and nutrition for specific subcells.
 */
export const PlantSpeciesSchema = z.object({
  // Identity
  id: z.string(),              // Unique identifier (e.g., "corn_wapsie_valley")
  name: z.string(),            // Human-readable name

  // Space requirements
  plants_per_sq_ft: z.number().min(0),  // Recommended planting density
  height_ft: z.number().min(0),         // Mature height

  // Timing (days from planting)
  days_to_first_harvest: z.number().int().min(0),
  days_harvest_window: z.number().int().min(0), // How many days harvest lasts

  // Yield model
  baseline_lbs_per_plant: z.number().min(0),  // Yield under optimal conditions
  success_rate: z.number().min(0).max(1),     // Probability plant survives to harvest

  // Yield modifiers (interpolated lookup tables)
  modifiers: ModifiersSchema,

  // Nutrition (per lb of harvest)
  nutrition_per_lb: NutritionPerLbSchema,

  // Visual representation
  icon: IconSchema,

  // Labor requirements
  tasks: z.array(TaskSchema),

  // Costs
  seed_cost_per_plant: z.number().min(0),
  materials_cost_per_plant: z.number().min(0).optional(),

  // Data quality metadata
  data_confidence: z.enum(['high', 'medium', 'low']),
  sources: z.array(SourceSchema),
});

export type PlantSpecies = z.infer<typeof PlantSpeciesSchema>;
