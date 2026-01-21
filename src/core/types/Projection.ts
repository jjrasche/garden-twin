import { z } from 'zod';

/**
 * Yield projection for a single subcell
 */
export const YieldProjectionSchema = z.object({
  subcell_id: z.string(),
  species_id: z.string(),
  yield_lbs: z.number().min(0),
  calories: z.number().min(0),
  confidence: z.number().min(0).max(1),  // How confident we are in this projection
  first_harvest_date: z.string(),        // ISO date
  last_harvest_date: z.string(),         // ISO date
});

export type YieldProjection = z.infer<typeof YieldProjectionSchema>;

/**
 * Labor task for a specific week
 */
export const LaborTaskSchema = z.object({
  species_id: z.string(),
  task_name: z.string(),                 // "planting", "watering", "harvest", etc.
  hours: z.number().min(0),
});

export type LaborTask = z.infer<typeof LaborTaskSchema>;

/**
 * Labor schedule for a single week
 */
export const LaborWeekSchema = z.object({
  week_number: z.number().int().min(1).max(52),  // Week of year (1-52)
  week_starting: z.string(),             // ISO date (Monday of this week)
  tasks: z.array(LaborTaskSchema),
  total_hours: z.number().min(0),
});

export type LaborWeek = z.infer<typeof LaborWeekSchema>;

/**
 * Harvest for a specific species in a week
 */
export const HarvestEntrySchema = z.object({
  species_id: z.string(),
  lbs: z.number().min(0),
  calories: z.number().min(0).optional(),
});

export type HarvestEntry = z.infer<typeof HarvestEntrySchema>;

/**
 * Harvest schedule for a single week
 */
export const HarvestWeekSchema = z.object({
  week_number: z.number().int().min(1).max(52),
  week_starting: z.string(),             // ISO date
  harvests: z.array(HarvestEntrySchema),
  total_lbs: z.number().min(0),
});

export type HarvestWeek = z.infer<typeof HarvestWeekSchema>;

/**
 * Aggregated totals
 */
export const ProjectionTotalsSchema = z.object({
  total_calories: z.number().min(0),
  total_labor_hours: z.number().min(0),
  total_cost_dollars: z.number().min(0),
  total_yield_lbs: z.number().min(0),
  planted_subcells: z.number().int().min(0),
  species_count: z.number().int().min(0),
});

export type ProjectionTotals = z.infer<typeof ProjectionTotalsSchema>;

/**
 * Complete projection for a garden plan
 *
 * Contains all calculated yields, labor schedules, and harvest timelines.
 */
export const ProjectionSchema = z.object({
  plan_id: z.string(),
  type: z.enum(['initial', 'weekly_update', 'actual']),
  generated_date: z.string(),            // When this projection was created
  as_of_date: z.string(),                // Projection is relative to this date

  // Per-subcell yield projections
  yields: z.array(YieldProjectionSchema),

  // Weekly labor schedule (weeks 1-52)
  labor_schedule: z.array(LaborWeekSchema),

  // Weekly harvest schedule (weeks 1-52)
  harvest_schedule: z.array(HarvestWeekSchema),

  // Aggregated totals
  totals: ProjectionTotalsSchema,
});

export type Projection = z.infer<typeof ProjectionSchema>;

/**
 * Planning assignment - which subcells have which plants
 */
export const PlantingAssignmentSchema = z.object({
  subcell_id: z.string(),
  species_id: z.string(),
  planting_date: z.string(),             // ISO date
});

export type PlantingAssignment = z.infer<typeof PlantingAssignmentSchema>;

/**
 * Garden plan - what to plant where
 */
export const PlanSchema = z.object({
  id: z.string(),
  garden_id: z.string(),
  name: z.string().optional(),
  created_at: z.string(),

  // Planting assignments
  plantings: z.array(PlantingAssignmentSchema),
});

export type Plan = z.infer<typeof PlanSchema>;
