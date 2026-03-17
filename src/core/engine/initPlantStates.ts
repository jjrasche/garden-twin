/**
 * Initialize PlantState[] from PlantInstance[] — one-time expansion.
 *
 * Groups plants by (species_id, planted_date, harvest_strategy_id),
 * computes daily_potential + vigor once per group, applies survival filter.
 */

import type { PlantSpecies } from '../types/PlantSpecies';
import type { PlantState } from '../types/PlantState';
import { createStressCounters } from '../types/PlantState';
import type { PlantInstance } from '../types/GardenState';
import type { ConditionsResolver } from '../environment/types';
import { computeDailyGdd } from '../calculators/gddEngine';
import { resolveHarvestStrategy } from '../calculators/strategyResolver';
import { daysBetween, computeDeathDate, buildCutSchedule } from '../calculators/growthMath';

/** Scan forward to find the date when accumulated GDD reaches a target. */
function estimateGddDate(
  plant_date: Date, target_gdd: number, base_temp_f: number,
  env: ConditionsResolver, limit: Date,
): Date {
  let accumulated = 0;
  const scan = new Date(plant_date);
  while (scan <= limit && accumulated < target_gdd) {
    const cond = env.getConditions(scan);
    accumulated += computeDailyGdd(cond.avg_high_f, cond.avg_low_f, base_temp_f);
    scan.setDate(scan.getDate() + 1);
  }
  return new Date(scan);
}

/** Compute daily_potential for a group based on strategy type. */
function computeDailyPotential(
  species: PlantSpecies, harvest_strategy_id: string | undefined,
  plant_date: Date, env: ConditionsResolver, season_end: Date,
): { daily_potential: number; vigor: number } {
  const strategy = resolveHarvestStrategy(harvest_strategy_id, species);
  if (!strategy) return { daily_potential: 0, vigor: 1.0 };

  const baseline = strategy.baseline_lbs_per_plant;
  const phenology = species.phenology;

  if (strategy.type === 'cut_and_come_again') {
    const cuts = buildCutSchedule(plant_date, species, strategy, env);
    if (cuts) return { daily_potential: cuts.daily_potential, vigor: cuts.vigors[0]! };
    return { daily_potential: baseline / Math.max(1, species.days_to_first_harvest), vigor: 1.0 };
  }

  if (strategy.type === 'bulk' && phenology) {
    const fruiting_date = estimateGddDate(plant_date, phenology.gdd_stages.fruiting, phenology.base_temp_f, env, season_end);
    const mature_date = estimateGddDate(plant_date, phenology.gdd_stages.mature, phenology.base_temp_f, env, season_end);
    const productive_days = Math.max(1, daysBetween(fruiting_date, mature_date));
    return { daily_potential: baseline / productive_days, vigor: 1.0 };
  }

  if (strategy.type === 'continuous') {
    const productive_start = phenology
      ? estimateGddDate(plant_date, phenology.gdd_stages.fruiting, phenology.base_temp_f, env, season_end)
      : new Date(plant_date.getTime() + species.days_to_first_harvest * 86_400_000);
    const death_date = computeDeathDate(species, productive_start, env, season_end);
    const alive_days = Math.max(7, daysBetween(productive_start, death_date));
    return { daily_potential: baseline / alive_days, vigor: 1.0 };
  }

  return { daily_potential: baseline / Math.max(1, species.days_to_first_harvest), vigor: 1.0 };
}

/** Group key for plants that share the same growth parameters. */
function groupKey(plant: PlantInstance): string {
  return `${plant.species_id}|${plant.planted_date}|${plant.harvest_strategy_id ?? ''}`;
}

/**
 * Convert PlantInstance[] into engine PlantState[].
 *
 * Groups by (species_id, planted_date, harvest_strategy_id) to compute
 * daily_potential once per group. Applies germination × establishment
 * survival filter per group.
 */
export function initPlantStates(
  plants: PlantInstance[],
  catalog: Map<string, PlantSpecies>,
  env: ConditionsResolver,
  season_end: Date,
): PlantState[] {
  // Group plants by shared growth parameters
  const groups = new Map<string, PlantInstance[]>();
  for (const plant of plants) {
    const key = groupKey(plant);
    const group = groups.get(key);
    if (group) {
      group.push(plant);
    } else {
      groups.set(key, [plant]);
    }
  }

  const result: PlantState[] = [];

  for (const [, instances] of groups) {
    const representative = instances[0]!;
    const species = catalog.get(representative.species_id);
    if (!species) continue;

    const plant_date = new Date(representative.planted_date);
    const { daily_potential, vigor } = computeDailyPotential(
      species, representative.harvest_strategy_id,
      plant_date, env, season_end,
    );

    const surviving_count = Math.floor(
      instances.length * species.germination_rate * species.establishment_rate,
    );

    for (let i = 0; i < surviving_count; i++) {
      const instance = instances[i]!;
      result.push({
        plant_id: instance.plant_id,
        species_id: instance.species_id,
        subcell_id: instance.root_subcell_id,
        planted_date: instance.planted_date,
        stage: 'seed',
        accumulated_dev: 0,
        accumulated_gdd: 0,
        accumulated_lbs: 0,
        harvest_strategy_id: instance.harvest_strategy_id,
        cut_number: 0,
        vigor,
        daily_potential,
        stress: createStressCounters(),
        is_harvestable: false,
        is_dead: false,
      });
    }
  }

  return result;
}
