import { z } from 'zod';
import { GrowthStageSchema } from './GardenState';

// =============================================================================
// StageConfig — species-level lifecycle declaration
// =============================================================================

export const StageConfigSchema = z.object({
  /** Which stages this species goes through, in order. */
  stage_sequence: z.array(GrowthStageSchema),

  /** Which stages produce harvestable biomass. */
  productive_stages: z.array(GrowthStageSchema),
});

export type StageConfig = z.infer<typeof StageConfigSchema>;

// =============================================================================
// StressTolerances — species-level thresholds for duration-based stress
// =============================================================================

export const StressThresholdSchema = z.object({
  /** Condition value that triggers stress accumulation. */
  threshold: z.number(),
  /** Direction: 'below' means stress when value < threshold; 'above' means stress when value > threshold. */
  direction: z.enum(['below', 'above']),
  /** Consecutive stress days before vigor penalty begins. */
  days_to_damage: z.number().int().min(1),
  /** Consecutive stress days before death. */
  days_to_death: z.number().int().min(1),
});

export type StressThreshold = z.infer<typeof StressThresholdSchema>;

export const StressTolerancesSchema = z.object({
  drought: StressThresholdSchema.optional(),
  waterlog: StressThresholdSchema.optional(),
  heat: StressThresholdSchema.optional(),
});

export type StressTolerances = z.infer<typeof StressTolerancesSchema>;

// =============================================================================
// StressCounters — per-plant mutable stress tracking
// =============================================================================

export const StressCountersSchema = z.object({
  drought_days: z.number().int().min(0),
  waterlog_days: z.number().int().min(0),
  heat_days: z.number().int().min(0),
});

export type StressCounters = z.infer<typeof StressCountersSchema>;

export function createStressCounters(): StressCounters {
  return { drought_days: 0, waterlog_days: 0, heat_days: 0 };
}

// =============================================================================
// PlantState — per-plant mutable growth state
// =============================================================================

export const PlantStateSchema = z.object({
  plant_id: z.string(),
  species_id: z.string(),
  subcell_id: z.string(),
  planted_date: z.string(),

  // Biological state
  stage: GrowthStageSchema,
  accumulated_dev: z.number().min(0),
  accumulated_gdd: z.number().min(0),
  accumulated_lbs: z.number().min(0),

  // Harvest tracking
  harvest_strategy_id: z.string().optional(),
  cut_number: z.number().int().min(0),
  vigor: z.number().min(0),
  daily_potential: z.number().min(0),

  // Stress tracking
  stress: StressCountersSchema,

  // Derived (set by engine each tick)
  is_harvestable: z.boolean(),
  is_dead: z.boolean(),
});

export type PlantState = z.infer<typeof PlantStateSchema>;

// =============================================================================
// GrowthEvent — discriminated union emitted by tickDay
// =============================================================================

export type GrowthEvent =
  | { type: 'stage_changed'; plant_id: string; from: string; to: string; date: Date }
  | { type: 'harvest_ready'; plant_id: string; date: Date; accumulated_lbs: number }
  | { type: 'plant_died'; plant_id: string; date: Date; cause: string };
