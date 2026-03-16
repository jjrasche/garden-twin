import { z } from 'zod';

// Labor task templates have been replaced by data-driven Rules.
// See src/core/types/Rules.ts for the new task generation system.

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
 * Bolting trigger — population survival model, not a yield scaler.
 * When condition exceeds threshold, a fraction of plants bolt (yield = 0).
 * Surviving plants produce at full yield. Applied as plant_count multiplier.
 *
 * Example: spinach at 14h photoperiod → 60% of Bloomsdale population survives.
 */
export const BoltTriggerSchema = z.object({
  condition: z.enum(['photoperiod_h', 'temperature_f']),
  // Condition value → fraction of population that SURVIVES (1.0 = no bolting, 0.0 = all bolted)
  survival_curve: LookupTableSchema,
});

export type BoltTrigger = z.infer<typeof BoltTriggerSchema>;

/**
 * Cut-and-come-again harvest parameters.
 *
 * Models plants harvested by cutting foliage, which then regrows for
 * subsequent cuts. Each cut yields a fraction of baseline_lbs_per_plant,
 * weighted by cut_yield_curve and normalized so total = baseline.
 *
 * Example: lettuce with 4 cuts, curve {1:1.0, 2:0.8, 3:0.6, 4:0.4}
 *   sum = 2.8, cut 1 gets 1.0/2.8 = 35.7% of baseline, etc.
 *   Environmental modifiers scale each cut independently.
 */
export const CutAndComeAgainSchema = z.object({
  max_cuts: z.number().int().min(1),
  regrowth_days: z.number().int().min(1),
  // Cut number → relative yield weight. Normalized by sum to distribute baseline.
  cut_yield_curve: LookupTableSchema,
});

export type CutAndComeAgain = z.infer<typeof CutAndComeAgainSchema>;

/**
 * All yield modifiers for a species
 */
export const ModifiersSchema = z.object({
  sun: LookupTableSchema,                    // Sun hours → multiplier
  soil: SoilModifiersSchema,                 // Soil conditions → multipliers
  spacing_plants_per_sq_ft: LookupTableSchema, // Plant density → multiplier
  // Water stress — soil moisture as % of field capacity (FC) → yield multiplier.
  // FC = max water soil holds after gravity drainage. 0% = oven-dry, ~20-25% = permanent
  // wilting point (PWP), 100% = field capacity, >100% = waterlogged (pore space filling).
  // Optimal range varies by species (FAO depletion fraction p): corn ~50-90%, lettuce ~75-95%.
  // Source: FAO Irrigation & Drainage Papers 33 (Doorenbos & Kassam 1979) and 56 (Allen 1998).
  soil_moisture_pct_fc: LookupTableSchema.optional(),
  // Seasonal modifiers — applied per-week against local environment data
  temperature_f: LookupTableSchema.optional(),      // Avg daily high °F → multiplier
  soil_temperature_f: LookupTableSchema.optional(),  // Soil temp °F → multiplier (potato tuberization)
  photoperiod_h: LookupTableSchema.optional(),       // Day length hours → yield multiplier (continuous)
  // Bolting — threshold event that kills fraction of population (not a yield scaler)
  bolt_trigger: BoltTriggerSchema.optional(),
});

export type Modifiers = z.infer<typeof ModifiersSchema>;

/**
 * GrowthResponse — declarative biological modifier curve.
 *
 * Species bring their own set of response curves. The growth engine iterates
 * whatever curves a species declares. No hardcoded field names.
 *
 * factor: the condition being responded to (sun_hours, temperature_f, etc.)
 * curve: lookup table mapping condition value → 0-1 multiplier
 * effect: how this response is applied:
 *   - growth_rate: multiplied into daily growth modifier
 *   - population_survival: fraction of plants surviving (bolt, heat kill)
 * name: optional human label (e.g., "bolt", "tuberization")
 */
export const GrowthResponseSchema = z.object({
  factor: z.string(),
  curve: LookupTableSchema,
  effect: z.enum(['growth_rate', 'population_survival']),
  name: z.string().optional(),
});

export type GrowthResponse = z.infer<typeof GrowthResponseSchema>;

/**
 * GDD-based phenology — replaces calendar days_to_first_harvest.
 *
 * GDD (Growing Degree Days) = max(0, (high + low) / 2 - base_temp_f).
 * Stage transitions occur when accumulated GDD crosses thresholds.
 * A tomato matures after ~1200 GDD base 50°F, not "82 days."
 */
export const PhenologySchema = z.object({
  base_temp_f: z.number(),
  gdd_stages: z.object({
    vegetative: z.number(),
    flowering: z.number(),
    fruiting: z.number(),
    mature: z.number(),
  }),
});

export type Phenology = z.infer<typeof PhenologySchema>;

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
 * Spacing requirements for layout optimization
 */
export const SpacingSchema = z.object({
  in_row_in: z.number().min(1),         // Inches between plants within a row
  between_row_in: z.number().min(1),    // Inches between rows
  equidistant_in: z.number().min(1).optional(), // Equidistant grid spacing (corn, etc.)
});

export type Spacing = z.infer<typeof SpacingSchema>;

/**
 * Companion planting relationship between two species
 */
export const CompanionEffectSchema = z.object({
  target_species_id: z.string(),        // The other species in this relationship
  effect: z.enum(['beneficial', 'antagonistic']),
  mechanism: z.string(),                // Why (e.g., "shared blight", "repels aphids")
  min_distance_in: z.number().min(0).optional(), // Minimum separation for antagonistic
  max_distance_in: z.number().min(0).optional(), // Maximum distance for beneficial effect
});

export type CompanionEffect = z.infer<typeof CompanionEffectSchema>;

/**
 * Pest control properties for companion plants (marigold, nasturtium, etc.)
 */
export const PestControlSchema = z.object({
  repels: z.array(z.string()),                  // Pests repelled (e.g., "nematodes", "aphids")
  attracts_beneficial: z.array(z.string()),     // Beneficial insects attracted
  effective_radius_in: z.number().min(0),       // How far the effect extends from plant center
  is_trap_crop: z.boolean(),                    // Draws pests to itself (nasturtium)
  trap_distance_in: z.number().min(0).optional(), // Optimal distance from protected crop
});

export type PestControl = z.infer<typeof PestControlSchema>;

/**
 * Layout profile — all attributes needed for spatial optimization
 *
 * Captures spacing, light, temperature, companion, and containment
 * constraints that the layout optimizer uses to place plants.
 */
export const LayoutProfileSchema = z.object({
  // Spacing
  spacing: SpacingSchema,

  // Light
  shade_tolerance: z.enum(['full_sun', 'partial_shade', 'shade_preferred']),

  // Physical dimensions
  spread_in: z.number().min(1),                 // Canopy/foliage width at maturity
  root_depth: z.enum(['shallow', 'medium', 'deep']),

  // Temperature
  frost_tolerance: z.enum(['very_hardy', 'semi_hardy', 'tender']),
  kill_temp_f: z.number(),                      // Air temp (°F) that kills the plant
  min_soil_temp_f: z.number(),                  // Minimum soil temp for planting/germination

  // Planting
  planting_method: z.enum(['direct_sow', 'transplant', 'tuber', 'rhizome']),

  // Role in the garden
  role: z.enum(['food_crop', 'pest_control', 'herb', 'cover_crop']),

  // Companion planting relationships
  companions: z.array(CompanionEffectSchema).optional(),

  // Pest control properties (for companion/pest-control plants)
  pest_control: PestControlSchema.optional(),

  // Containment (invasive species like mint, catnip)
  needs_containment: z.boolean(),
  spread_mechanism: z.enum(['none', 'rhizomes', 'self_seeding', 'both']).optional(),
});

export type LayoutProfile = z.infer<typeof LayoutProfileSchema>;

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

  // Harvest model
  // 'cut_and_come_again': discrete cuts with regrowth (lettuce, spinach, kale)
  // 'continuous': ongoing fruit production, weekly conditions scale yield (tomato)
  // 'bulk_harvest': all yield at one point, growth conditions determine total (potato, corn)
  harvest_type: z.enum(['cut_and_come_again', 'continuous', 'bulk_harvest']).optional(),

  // Yield model — baseline = theoretical optimum under ideal conditions.
  // Modifiers reduce to real-world values. Do not bake conservatism into baseline.
  baseline_lbs_per_plant: z.number().min(0),

  // Survival decomposition: tracks seed→plant and plant→harvest independently.
  // germination_rate: fraction of seeds/tubers that emerge (1.0 for transplants).
  // establishment_rate: fraction of emerged plants that survive to harvest.
  // Combined: survivalRate(species) = germination_rate × establishment_rate
  germination_rate: z.number().min(0).max(1),
  establishment_rate: z.number().min(0).max(1),

  // Cut-and-come-again parameters (required when harvest_type === 'cut_and_come_again')
  cut_and_come_again: CutAndComeAgainSchema.optional(),

  // Declarative modifier curves (replaces flat modifiers — Phase 1)
  growth_response: z.array(GrowthResponseSchema).optional(),

  // @deprecated — use growth_response. Kept for calculator migration (Phase 3/4).
  modifiers: ModifiersSchema,

  // Nutrition (per lb of harvest)
  nutrition_per_lb: NutritionPerLbSchema,

  // Visual representation
  icon: IconSchema,

  // GDD-based phenology (optional — being added in Phase 1)
  phenology: PhenologySchema.optional(),

  // Layout optimization profile (optional — not all legacy species have this yet)
  layout: LayoutProfileSchema.optional(),

  // Costs
  seed_cost_per_plant: z.number().min(0),
  materials_cost_per_plant: z.number().min(0).optional(),

  // Data quality metadata
  data_confidence: z.enum(['high', 'medium', 'low']),
  sources: z.array(SourceSchema),
});

export type PlantSpecies = z.infer<typeof PlantSpeciesSchema>;

/** Combined survival fraction: germination × establishment. */
export function survivalRate(species: PlantSpecies): number {
  return species.germination_rate * species.establishment_rate;
}
