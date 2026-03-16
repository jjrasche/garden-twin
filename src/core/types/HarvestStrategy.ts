import { z } from 'zod';
import { LookupTableSchema } from './PlantSpecies';
import { ProcessingActivitySchema } from './LifecycleSpec';

/**
 * HarvestStrategy — management decision, separate from species biology.
 *
 * The same plant can be harvested different ways with different yield outcomes:
 * - Kale cut-and-come-again: 8 cuts, 14d regrowth, 1.75 lbs total
 * - Kale single-pull: 1 cut, ~0.8 lbs
 * - Amish Paste continuous: pick every 3d, 15 lbs/plant
 * - Corn bulk: harvest at husk_dry, 0.24 lbs/plant
 */
export const HarvestStrategySchema = z.object({
  id: z.string(),
  type: z.enum(['cut_and_come_again', 'bulk', 'continuous']),

  /** Yield depends on harvest method, not just species biology. */
  baseline_lbs_per_plant: z.number().min(0),

  /** Cut-and-come-again parameters. */
  max_cuts: z.number().int().min(1).optional(),
  regrowth_days: z.number().int().min(1).optional(),
  cut_yield_curve: LookupTableSchema.optional(),

  /** Bulk harvest indicator (e.g., "husk_dry", "vine_die_back"). */
  maturity_indicator: z.string().optional(),

  /** Continuous harvest pick frequency. */
  pick_frequency_days: z.number().int().min(1).optional(),

  /** Post-harvest processing tied to this harvest method. */
  processing: z.array(ProcessingActivitySchema).optional(),
});

export type HarvestStrategy = z.infer<typeof HarvestStrategySchema>;
