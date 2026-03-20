import { z } from 'zod';
import { TaskTypeSchema } from './Task';

// =============================================================================
// Activity Trigger — when does this activity start?
// =============================================================================

export const ActivityTriggerSchema = z.discriminatedUnion('type', [
  // Fixed offset from planting date (most common)
  z.object({
    type: z.literal('days_after_planting'),
    days: z.number().int(),        // Can be negative (e.g., -42 for indoor seed start)
  }),
  // Relative to a growth stage
  z.object({
    type: z.literal('growth_stage'),
    stage: z.enum(['germinated', 'vegetative', 'flowering', 'fruiting', 'harvest', 'done']),
  }),
  // Post-harvest processing (triggered by accumulated harvest volume)
  z.object({
    type: z.literal('harvest_accumulated'),
    threshold_lbs: z.number().min(0),  // Trigger when this many lbs have been harvested
  }),
  // Condition crosses a threshold (e.g., soil temp reaches planting minimum)
  z.object({
    type: z.literal('condition'),
    factor: z.string(),                // Condition key (soil_temperature_f, moisture_pct, etc.)
    threshold: z.number(),
    direction: z.enum(['above', 'below']),  // Trigger when value goes above/below threshold
  }),
  // Observation of a specific event (e.g., pest detected, damage seen)
  z.object({
    type: z.literal('observation'),
    observation_type: z.string(),      // What was observed (pest_detected, damage, emergence)
    subject_id: z.string().optional(), // Specific pest_id, species_id, etc.
  }),
]);

export type ActivityTrigger = z.infer<typeof ActivityTriggerSchema>;

// =============================================================================
// Recurrence — does this activity repeat?
// =============================================================================

export const RecurrenceSchema = z.object({
  interval_days: z.number().int().min(1),
  end_condition: z.enum([
    'frost',               // Until species kill_temp_f is reached
    'bolt',                // Until bolt_trigger fires
    'max_cuts',            // Until cut_and_come_again max_cuts reached
    'days_after_planting', // Until N days after planting
    'season_end',          // Until season_end date
  ]),
  end_value: z.number().optional(), // For days_after_planting: the day count
});

export type Recurrence = z.infer<typeof RecurrenceSchema>;

// =============================================================================
// Lifecycle Activity — one action in a plant's lifecycle
// =============================================================================

/**
 * A template for work that must happen during a plant's life.
 *
 * Combined with plant_count and planting_date from the production plan,
 * these templates produce concrete dated tasks with computed durations.
 *
 * Two duration fields:
 * - duration_minutes_per_plant: scales with plant count
 * - duration_minutes_fixed: setup/cleanup overhead, constant regardless of count
 *
 * Total = (per_plant * plant_count) + fixed
 */
export const LifecycleActivitySchema = z.object({
  activity_id: z.string(),
  name: z.string(),                      // "hill", "prune_sucker", "harvest_cut"
  task_type: TaskTypeSchema,

  // When
  trigger: ActivityTriggerSchema,
  recurrence: RecurrenceSchema.optional(), // null = one-time

  // How long
  duration_minutes_per_plant: z.number().min(0),
  duration_minutes_fixed: z.number().min(0), // Setup/cleanup overhead
  batch_size: z.number().int().min(1).optional(), // If work is batched (e.g., sow a tray of 72)

  // What tools
  equipment: z.array(z.string()),

  // Who
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']),
  labor_type: z.enum(['manual', 'robot', 'either']),

  // How (for training/delegation)
  instructions: z.string().optional(),

  // Priority when generating tasks
  priority: z.number().int().min(1).max(10),
});

export type LifecycleActivity = z.infer<typeof LifecycleActivitySchema>;

// =============================================================================
// Processing Activity — post-harvest transformation (canning, drying, etc.)
// =============================================================================

/**
 * Post-harvest processing that transforms raw harvest into stored product.
 *
 * Labor here is per-batch, not per-plant. The system computes how many
 * batches are needed from total harvest lbs.
 */
export const ProcessingActivitySchema = z.object({
  activity_id: z.string(),
  name: z.string(),                        // "can_marinara", "blanch_freeze", "dry_shell"

  // Batch sizing
  input_lbs_per_batch: z.number().min(0),  // Raw harvest input per batch
  output_per_batch: z.number().min(0),     // Units produced per batch
  output_unit: z.string(),                 // "quart", "lb_dried", "pint_frozen"

  // Labor
  duration_minutes_per_batch: z.number().min(0),
  equipment: z.array(z.string()),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']),

  // Instructions
  instructions: z.string().optional(),

  // Storage
  storage_method: z.enum(['canned_shelf', 'freezer', 'root_cellar', 'dried_ambient']),
  storage_volume_per_unit: z.string().optional(), // "1 quart jar", "1 gallon freezer bag"
  shelf_life_months: z.number().int().min(1),
});

export type ProcessingActivity = z.infer<typeof ProcessingActivitySchema>;

// =============================================================================
// Lifecycle Spec — full lifecycle definition for a species
// =============================================================================

/**
 * Complete lifecycle specification for a plant species.
 *
 * Lives adjacent to PlantSpecies (referenced by species_id, not embedded).
 * The production plan calculator combines these with CropPlanting data to
 * produce a weekly labor schedule.
 */
export const LifecycleSpecSchema = z.object({
  species_id: z.string(),
  activities: z.array(LifecycleActivitySchema),
  processing: z.array(ProcessingActivitySchema).optional(),
});

export type LifecycleSpec = z.infer<typeof LifecycleSpecSchema>;
