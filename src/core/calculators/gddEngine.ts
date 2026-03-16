/**
 * GDD Engine — development track (thermal time → stage transitions).
 *
 * Pure functions for Growing Degree Day accumulation and phenological
 * stage determination. No side effects, no environment source dependency.
 *
 * GDD formula: max(0, (high_f + low_f) / 2 - base_temp_f)
 * Stage transitions: accumulated_gdd >= species.phenology.gdd_stages threshold
 */

import type { GrowthStage } from '../types/GardenState';

export interface GddStages {
  vegetative: number;
  flowering: number;
  fruiting: number;
  mature: number;
}

export interface DailyTemp {
  high_f: number;
  low_f: number;
}

/** GDD for a single day using the averaging method. */
export function computeDailyGdd(high_f: number, low_f: number, base_temp_f: number): number {
  return Math.max(0, (high_f + low_f) / 2 - base_temp_f);
}

/** Growth stage from accumulated GDD against species thresholds. */
export function determineStage(accumulated_gdd: number, gdd_stages: GddStages): GrowthStage {
  if (accumulated_gdd >= gdd_stages.mature) return 'harvest';
  if (accumulated_gdd >= gdd_stages.fruiting) return 'fruiting';
  if (accumulated_gdd >= gdd_stages.flowering) return 'flowering';
  if (accumulated_gdd >= gdd_stages.vegetative) return 'vegetative';
  return 'seed';
}

/** Whether a growth stage gates harvestable biomass accumulation. */
export function isHarvestableStage(stage: GrowthStage): boolean {
  return stage === 'fruiting' || stage === 'harvest';
}

/** Sum GDD over a range of daily temperatures. */
export function accumulateGddOverRange(dailyTemps: DailyTemp[], base_temp_f: number): number {
  let total = 0;
  for (const day of dailyTemps) {
    total += computeDailyGdd(day.high_f, day.low_f, base_temp_f);
  }
  return total;
}
