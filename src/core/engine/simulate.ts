/**
 * Season simulation — tick loop with harvest policy.
 *
 * simulateGrowth() = tickDay() in a loop + harvest decisions.
 *   'auto':   harvest when harvest_ready fires (planning mode)
 *   'manual': emit events only, no auto-harvest (operational mode)
 */

import type { PlantSpecies } from '../types/PlantSpecies';
import type { PlantState, GrowthEvent } from '../types/PlantState';
import type { GardenState } from '../types/GardenState';
import type { ConditionsResolver } from '../environment/types';
import { tickDay } from './tickDay';
import { initPlantStates } from './initPlantStates';
import { resolveHarvestStrategy } from '../calculators/strategyResolver';
import { interpolate } from '../calculators/interpolate';

export type HarvestPolicy = 'auto' | 'manual';

export interface SimulationResult {
  plants: PlantState[];
  events: GrowthEvent[];
  total_harvested_lbs: number;
}

/** Run the growth engine from start to end date. */
export function simulateGrowth(
  initial_plants: PlantState[],
  dateRange: { start: Date; end: Date },
  env: ConditionsResolver,
  catalog: Map<string, PlantSpecies>,
  policy: HarvestPolicy,
): SimulationResult {
  let plants = initial_plants;
  const all_events: GrowthEvent[] = [];
  let total_harvested_lbs = 0;

  const day = new Date(dateRange.start);
  while (day <= dateRange.end) {
    const result = tickDay(plants, new Date(day), env, catalog);
    plants = result.plants;
    all_events.push(...result.events);

    if (policy === 'auto') {
      const harvest_result = harvestReady(plants, catalog);
      plants = harvest_result.plants;
      total_harvested_lbs += harvest_result.harvested_lbs;
    }

    day.setDate(day.getDate() + 1);
  }

  return { plants, events: all_events, total_harvested_lbs };
}

// ── Single-Plant Harvest ────────────────────────────────────────────────────

/** Apply harvest to a single plant: reset biomass, advance cut, check exhaustion. */
export function harvestPlant(
  plant: PlantState,
  catalog: Map<string, PlantSpecies>,
): PlantState {
  if (!plant.is_harvestable) return plant;

  const species = catalog.get(plant.species_id);
  if (!species) return plant;

  const strategy = resolveHarvestStrategy(plant.harvest_strategy_id, species);
  const max_cuts = strategy?.max_cuts ?? 1;
  const cut_yield_curve = strategy?.cut_yield_curve;
  const next_cut = plant.cut_number + 1;

  const is_exhausted = (cut_yield_curve && next_cut >= max_cuts)
    || strategy?.type === 'bulk';

  if (is_exhausted) {
    return { ...plant, accumulated_lbs: 0, cut_number: next_cut, is_harvestable: false, is_dead: true, stage: 'done' as const };
  }

  const next_vigor = cut_yield_curve
    ? interpolate(cut_yield_curve, next_cut + 1)
    : plant.vigor;

  return {
    ...plant,
    accumulated_lbs: 0,
    cut_number: next_cut,
    vigor: next_vigor,
    is_harvestable: false,
  };
}

// ── Batch Harvest ───────────────────────────────────────────────────────────

interface HarvestResult {
  plants: PlantState[];
  harvested_lbs: number;
}

/** Harvest all plants that are marked harvestable. */
function harvestReady(
  plants: PlantState[],
  catalog: Map<string, PlantSpecies>,
): HarvestResult {
  let harvested_lbs = 0;
  const updated = plants.map(plant => {
    if (!plant.is_harvestable) return plant;
    harvested_lbs += plant.accumulated_lbs;
    return harvestPlant(plant, catalog);
  });
  return { plants: updated, harvested_lbs };
}

// ── DaySnapshot Pipeline ────────────────────────────────────────────────────

export interface DaySnapshot {
  date: Date;
  plants: PlantState[];
  events: GrowthEvent[];
}

/** Run tick loop over PlantState[], auto-harvesting each day. */
export function collectSnapshots(
  initial_plants: PlantState[],
  catalog: Map<string, PlantSpecies>,
  env: ConditionsResolver,
  dateRange: { start: Date; end: Date },
): DaySnapshot[] {
  let plants = initial_plants;
  const snapshots: DaySnapshot[] = [];

  const day = new Date(dateRange.start);
  while (day <= dateRange.end) {
    const result = tickDay(plants, new Date(day), env, catalog);
    plants = result.plants;

    plants = plants.map(p => p.is_harvestable ? harvestPlant(p, catalog) : p);

    snapshots.push({ date: new Date(day), plants: [...plants], events: result.events });
    day.setDate(day.getDate() + 1);
  }

  return snapshots;
}

/** Simulate from GardenState: init plants, then collect daily snapshots. */
export function simulateFromState(
  gardenState: GardenState,
  catalog: Map<string, PlantSpecies>,
  env: ConditionsResolver,
  dateRange: { start: Date; end: Date },
): DaySnapshot[] {
  const plants = initPlantStates(gardenState.plants, catalog, env, dateRange.end);
  return collectSnapshots(plants, catalog, env, dateRange);
}
