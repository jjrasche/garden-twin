/**
 * Evaluate a LifecycleSpec ActivityTrigger against current plant/garden state.
 *
 * Leaf function: one trigger, one plant, one date -> boolean.
 * No side effects. No task creation.
 */

import type { ActivityTrigger } from '../types/LifecycleSpec';
import type { PlantState } from '../types/PlantState';
import type { ConditionsResolver } from '../environment/types';

const MS_PER_DAY = 86_400_000;

/** Whether a single trigger condition is met for a plant on a date. */
export function evaluateTrigger(
  trigger: ActivityTrigger,
  plant: PlantState,
  date: Date,
  env: ConditionsResolver,
): boolean {
  switch (trigger.type) {
    case 'days_after_planting':
      return evaluateDaysAfterPlanting(trigger.days, plant, date);
    case 'growth_stage':
      return plant.stage === trigger.stage;
    case 'harvest_accumulated':
      return plant.accumulated_lbs >= trigger.threshold_lbs;
    case 'condition':
      return evaluateConditionThreshold(trigger, date, env);
    case 'observation':
      // Observations require external input; cannot evaluate from state alone.
      return false;
  }
}

function evaluateDaysAfterPlanting(days: number, plant: PlantState, date: Date): boolean {
  const planted = new Date(plant.planted_date);
  const elapsed = Math.floor((date.getTime() - planted.getTime()) / MS_PER_DAY);
  return elapsed === days;
}

function evaluateConditionThreshold(
  trigger: { factor: string; threshold: number; direction: 'above' | 'below' },
  date: Date,
  env: ConditionsResolver,
): boolean {
  const cond = env.getConditions(date);
  const value = resolveConditionValue(trigger.factor, cond);
  if (value === undefined) return false;
  return trigger.direction === 'above'
    ? value >= trigger.threshold
    : value <= trigger.threshold;
}

function resolveConditionValue(
  factor: string,
  cond: { avg_high_f: number; avg_low_f: number; soil_temp_f: number; photoperiod_h: number; soil_moisture_pct_fc?: number },
): number | undefined {
  switch (factor) {
    case 'soil_temperature_f':
    case 'soil_temp_f':
      return cond.soil_temp_f;
    case 'temperature_f':
      return cond.avg_high_f;
    case 'photoperiod_h':
      return cond.photoperiod_h;
    case 'soil_moisture_pct_fc':
      return cond.soil_moisture_pct_fc;
    default:
      return undefined;
  }
}
