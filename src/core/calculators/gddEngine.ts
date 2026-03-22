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
  germinated: number;
  vegetative: number;
  flowering: number;
  fruiting: number;
  mature: number;
}

export interface DailyTemp {
  high_f: number;
  low_f: number;
}

/** GDD for a single day using the averaging method.
 *  Optional ceiling caps the effective temperature — prevents unrealistic
 *  GDD accumulation on extreme heat days when development actually stalls. */
export function computeDailyGdd(
  high_f: number, low_f: number, base_temp_f: number,
  ceiling_temp_f?: number,
): number {
  const avg = (high_f + low_f) / 2;
  const capped = ceiling_temp_f !== undefined ? Math.min(avg, ceiling_temp_f) : avg;
  return Math.max(0, capped - base_temp_f);
}

/** Growth stage from accumulated GDD against species thresholds. */
export function determineStage(accumulated_gdd: number, gdd_stages: GddStages): GrowthStage {
  if (accumulated_gdd >= gdd_stages.mature) return 'harvest';
  if (accumulated_gdd >= gdd_stages.fruiting) return 'fruiting';
  if (accumulated_gdd >= gdd_stages.flowering) return 'flowering';
  if (accumulated_gdd >= gdd_stages.vegetative) return 'vegetative';
  if (accumulated_gdd >= gdd_stages.germinated) return 'germinated';
  return 'seed';
}

/** Whether a growth stage gates harvestable biomass accumulation. */
export function isHarvestableStage(stage: GrowthStage): boolean {
  return stage === 'fruiting' || stage === 'harvest';
}

/** Sum GDD over a range of daily temperatures. */
export function accumulateGddOverRange(
  dailyTemps: DailyTemp[], base_temp_f: number, ceiling_temp_f?: number,
): number {
  let total = 0;
  for (const day of dailyTemps) {
    total += computeDailyGdd(day.high_f, day.low_f, base_temp_f, ceiling_temp_f);
  }
  return total;
}
