import { z } from 'zod';
import { ShadeMapSchema, SoilConditionsSchema } from './Subcell';
import { InfrastructureFeatureSchema } from './Infrastructure';

/**
 * Schema version for migration support
 */
export const GARDEN_STATE_SCHEMA_VERSION = '1.0' as const;

// =============================================================================
// PlantInstance - Individual plant with observed and expected state
// =============================================================================

export const GrowthStageSchema = z.enum([
  'seed',
  'germinated',
  'vegetative',
  'flowering',
  'fruiting',
  'harvest',
  'done',
]);

export type GrowthStage = z.infer<typeof GrowthStageSchema>;

export const HealthStatusSchema = z.enum([
  'healthy',
  'attention_needed',
  'critical',
  'dead',
]);

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

/**
 * PlantInstance - A single plant in the garden
 *
 * Contains ONLY observed state. Expected state comes from GardenState[projected].
 * Lives at GardenState level (not embedded in subcells).
 * Subcells reference plants by plant_id.
 */
export const PlantInstanceSchema = z.object({
  plant_id: z.string(),
  species_id: z.string(),

  // Spatial - which subcells this plant occupies
  root_subcell_id: z.string(),              // Master position (where stem is)
  occupied_subcells: z.array(z.string()),   // All subcells this plant covers

  // Temporal
  planted_date: z.string(),                 // ISO date

  // Observed state (from sensors/observations)
  current_stage: GrowthStageSchema,
  height_cm: z.number().min(0),
  fruit_count: z.number().int().min(0).optional(),
  last_observed: z.string(),                // ISO datetime

  // Physical structural dependency (e.g., bean climbing corn stalk)
  // References another PlantInstance.plant_id that this plant is attached to
  support_plant_id: z.string().optional(),

  // Derived/UI helpers (computed, can be cached)
  health_status: HealthStatusSchema.optional(),
});

export type PlantInstance = z.infer<typeof PlantInstanceSchema>;

// =============================================================================
// SubcellState - Spatial unit with conditions (plant reference only)
// =============================================================================

/**
 * SubcellState - Spatial data for a 3x3 inch cell
 *
 * Contains static/slow-changing properties.
 * Plants are referenced by ID, not embedded.
 */
export const SubcellStateSchema = z.object({
  subcell_id: z.string(),                   // Format: "sub_{x_in}_{y_in}"

  // Position (static)
  position: z.object({
    x_in: z.number().int().min(0),
    y_in: z.number().int().min(0),
  }),

  // Computed aggregation (for queries)
  computed: z.object({
    cell_x_ft: z.number().int().min(0),
    cell_y_ft: z.number().int().min(0),
    zone_x: z.number().int().min(0),
    zone_y: z.number().int().min(0),
  }),

  // Terrain (static)
  type: z.enum(['planting', 'pathway', 'water', 'tree']),

  // Soil (slow-changing, can be updated by sensors)
  soil: SoilConditionsSchema.extend({
    moisture_pct: z.number().min(0).max(100).optional(), // Daily from sensors
  }),

  // Sun (static with seasonal variation)
  sun_hours: z.number().min(0).max(24),
  shade_map: ShadeMapSchema.optional(),

  // Plant reference (dynamic) - NOT the plant itself
  plant_id: z.string().optional(),
});

export type SubcellState = z.infer<typeof SubcellStateSchema>;

// =============================================================================
// EnvironmentalConditions - Garden-wide weather/ambient data
// =============================================================================

/**
 * Garden-wide environmental conditions
 *
 * Updated daily from weather station / sensors.
 * Different from per-subcell soil conditions.
 */
export const EnvironmentalConditionsSchema = z.object({
  temp_f: z.number(),
  humidity_pct: z.number().min(0).max(100),
  precipitation_in: z.number().min(0),
  wind_mph: z.number().min(0),
  soil_temp_f: z.number(),
  // Garden-wide soil moisture average (subcells have individual readings)
  avg_soil_moisture_pct: z.number().min(0).max(100).optional(),
});

export type EnvironmentalConditions = z.infer<typeof EnvironmentalConditionsSchema>;

// =============================================================================
// GardenStateSummary - Pre-computed stats for fast UI rendering
// =============================================================================

/**
 * Summary stats for quick visualization queries
 *
 * Pre-computed so UI doesn't need to iterate all plants/subcells.
 */
export const GardenStateSummarySchema = z.object({
  total_plants: z.number().int().min(0),
  healthy_count: z.number().int().min(0),
  attention_count: z.number().int().min(0),
  critical_count: z.number().int().min(0),
  tasks_pending: z.number().int().min(0),
  labor_hours_this_week: z.number().min(0),
  expected_yield_lbs: z.number().min(0),
});

export type GardenStateSummary = z.infer<typeof GardenStateSummarySchema>;

// =============================================================================
// GardenState - Temporal snapshot of entire garden
// =============================================================================

/**
 * GardenState - The garden at a point in time
 *
 * Can be:
 * - 'actual': Current observed reality
 * - 'projected': Future expected state (from seasonal planner)
 *
 * This replaces the old Garden + Plan + Projection objects.
 */
export const GardenStateSchema = z.object({
  // Identity and versioning
  state_id: z.string(),
  schema_version: z.literal(GARDEN_STATE_SCHEMA_VERSION),
  storage_strategy: z.enum(['snapshot', 'delta']),

  // Temporal
  timestamp: z.string(),                    // ISO datetime - when this state is for
  type: z.enum(['actual', 'projected']),
  projection_date: z.string().optional(),   // For projected: when was this calculated

  // Garden reference
  garden_id: z.string(),

  // Location (from old Garden schema)
  location: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    city: z.string(),
    state: z.string().optional(),
    country: z.string().optional(),
    timezone: z.string(),
  }),

  // Grid config (from old Garden schema)
  grid: z.object({
    width_ft: z.number().int().min(1),
    length_ft: z.number().int().min(1),
    subcell_size_in: z.number().int().min(1), // Always 3
    total_subcells: z.number().int().min(1),
  }),

  // Normalized data - plants separate from subcells
  plants: z.array(PlantInstanceSchema),
  subcells: z.array(SubcellStateSchema),

  // Physical features (mounds, channels, trellises, paths)
  infrastructure: z.array(InfrastructureFeatureSchema).optional(),

  // Garden-wide conditions
  environment: EnvironmentalConditionsSchema,

  // Pre-computed summary for UI
  summary: GardenStateSummarySchema.optional(),

  // Quality/confidence (for projected states)
  confidence: z.number().min(0).max(1).optional(),

  // Metadata
  created_at: z.string(),                   // When this record was created
  updated_at: z.string(),                   // Last modification
});

export type GardenState = z.infer<typeof GardenStateSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new GardenState ID
 */
export function createGardenStateId(gardenId: string, timestamp: string, type: 'actual' | 'projected'): string {
  const dateStr = timestamp.split('T')[0].replace(/-/g, '');
  return `gs_${gardenId}_${type}_${dateStr}_${Date.now()}`;
}

/**
 * Get plant by ID from GardenState
 */
export function getPlantById(state: GardenState, plantId: string): PlantInstance | undefined {
  return state.plants.find(p => p.plant_id === plantId);
}

/**
 * Get all plants in a subcell
 */
export function getPlantsInSubcell(state: GardenState, subcellId: string): PlantInstance[] {
  return state.plants.filter(p =>
    p.root_subcell_id === subcellId || (p.occupied_subcells?.includes(subcellId) ?? false)
  );
}

/**
 * Get subcell by ID from GardenState
 */
export function getSubcellById(state: GardenState, subcellId: string): SubcellState | undefined {
  return state.subcells.find(s => s.subcell_id === subcellId);
}

/**
 * Calculate days since planting
 */
export function getDaysSincePlanting(plantedDate: string): number {
  const planted = new Date(plantedDate);
  const now = new Date();
  const diffMs = now.getTime() - planted.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate variance from expected (requires projected state)
 */
export function getVarianceFromExpected(
  actual: PlantInstance,
  expected: PlantInstance
): number {
  if (expected.height_cm === 0) return 0;
  return ((actual.height_cm - expected.height_cm) / expected.height_cm) * 100;
}

/**
 * Calculate summary stats from plants
 */
export function calculateSummary(plants: PlantInstance[], pendingTasks: number = 0): GardenStateSummary {
  const healthy = plants.filter(p => p.health_status === 'healthy').length;
  const attention = plants.filter(p => p.health_status === 'attention_needed').length;
  const critical = plants.filter(p => p.health_status === 'critical').length;

  return {
    total_plants: plants.length,
    healthy_count: healthy,
    attention_count: attention,
    critical_count: critical,
    tasks_pending: pendingTasks,
    labor_hours_this_week: 0, // Calculated from tasks
    expected_yield_lbs: 0, // Calculate from projected state if needed
  };
}
