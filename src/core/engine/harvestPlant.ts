/**
 * Apply harvest to a single plant: reset biomass, advance cut, check exhaustion.
 *
 * Pure leaf function — no side effects, no simulation state.
 * Used by both collectSnapshots (auto-harvest) and resolveTask (task-driven harvest).
 */

import type { PlantSpecies } from '../types/PlantSpecies';
import type { PlantState } from '../types/PlantState';
import { resolveHarvestStrategy } from '../calculators/strategyResolver';
import { interpolate } from '../calculators/interpolate';

/** Harvest one plant: reset biomass, advance cut, apply vigor curve, check exhaustion. */
export function harvestPlant(
  plant: PlantState,
  catalog: Map<string, PlantSpecies>,
): PlantState {
  if (!plant.is_harvestable) return plant;

  const species = catalog.get(plant.species_id);
  if (!species) return plant;

  const strategy = resolveHarvestStrategy(plant.harvest_strategy_id, species);
  const max_cuts = strategy?.max_cuts;
  const cut_yield_curve = strategy?.cut_yield_curve;
  const next_cut = plant.cut_number + 1;

  const is_exhausted = strategy?.type === 'bulk'
    || (max_cuts !== undefined && next_cut >= max_cuts);

  const resetFields = {
    accumulated_lbs: 0,
    cut_number: next_cut,
    is_harvestable: false,
    quality_score: undefined,
  };

  if (is_exhausted) {
    if (strategy?.type === 'cut_and_come_again') {
      // CAC exhaustion = spent/bolted, not dead. Plant occupies space until pulled.
      return { ...plant, ...resetFields, lifecycle: 'senescent' as const };
    }
    // Bulk harvest = plant is done (potato vine die-back, corn dry-down)
    return { ...plant, ...resetFields, lifecycle: 'dead' as const };
  }

  const next_vigor = cut_yield_curve
    ? interpolate(cut_yield_curve, next_cut + 1)
    : plant.vigor;

  return {
    ...plant,
    ...resetFields,
    vigor: next_vigor,
  };
}
