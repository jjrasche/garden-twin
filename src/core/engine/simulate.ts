/**
 * Season simulation — tick loop with harvest policy.
 *
 * All simulation functions receive a SimulationContext that carries the
 * full configuration: catalog, environment, date range, and optional
 * succession configs. This avoids threading growing parameter lists.
 */

import type { PlantSpecies } from '../types/PlantSpecies';
import type { PlantState, GrowthEvent } from '../types/PlantState';
import type { Task } from '../types/Task';
import type { GardenState } from '../types/GardenState';
import type { PlantInstance } from '../types/GardenState';
import type { LifecycleSpec } from '../types/LifecycleSpec';
import type { ConditionsResolver } from '../environment/types';
import { tickDay } from './tickDay';
import { initPlantStates } from './initPlantStates';
import { planDay } from './operationalPlanner';
import { resolveHarvestStrategy } from '../calculators/strategyResolver';
import { interpolate } from '../calculators/interpolate';
import { type ActiveSuccession, evaluateSuccessionTrigger, materializeSuccessor } from './evaluateSuccession';
import type { SuccessorSpec } from '../calculators/ProductionTimeline';
import type { SunZone } from '../calculators/growthMath';

// ── SimulationContext ────────────────────────────────────────────────────────

/** Succession config — links a predecessor crop's plants to its successor. */
export interface SuccessionConfig {
  predecessorPlantIds: Set<string>;
  successor: SuccessorSpec;
  zone: SunZone;
  zone_id: string;
}

/** Everything the simulation loop needs in one object. */
export interface SimulationContext {
  catalog: Map<string, PlantSpecies>;
  env: ConditionsResolver;
  dateRange: { start: Date; end: Date };
  successions?: SuccessionConfig[];
  lifecycles?: Map<string, LifecycleSpec>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type HarvestPolicy = 'auto' | 'manual';

export interface SimulationResult {
  plants: PlantState[];
  events: GrowthEvent[];
  total_harvested_lbs: number;
}

export interface DaySnapshot {
  date: Date;
  plants: PlantState[];
  events: GrowthEvent[];
  tasks?: Task[];
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
  const max_cuts = strategy?.max_cuts;
  const cut_yield_curve = strategy?.cut_yield_curve;
  const next_cut = plant.cut_number + 1;

  const is_exhausted = strategy?.type === 'bulk'
    || (max_cuts !== undefined && next_cut >= max_cuts);

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

// ── Legacy simulateGrowth (used by older code paths) ────────────────────────

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

interface HarvestResult {
  plants: PlantState[];
  harvested_lbs: number;
}

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

// ── Succession Evaluation ───────────────────────────────────────────────────

function resolveConditions(env: ConditionsResolver, date: Date): Record<string, number> {
  const cond = env.getConditions(date);
  return {
    temperature_f: cond.avg_high_f,
    soil_temp_f: cond.soil_temp_f,
    photoperiod_h: cond.photoperiod_h,
  };
}

function evaluateAndMaterializeSuccessions(
  activeSuccessions: ActiveSuccession[],
  plants: PlantState[],
  currentDate: Date,
  ctx: SimulationContext,
): PlantState[] {
  const conditions = resolveConditions(ctx.env, currentDate);

  for (const succ of activeSuccessions) {
    // Materialize if trigger already fired and planting date reached
    if (succ.triggered && succ.plantingDate && currentDate >= succ.plantingDate) {
      const instances = materializeSuccessor(succ.successor, succ.plantingDate, succ.zone);
      const newStates = initPlantStates(instances, ctx.catalog, ctx.env, ctx.dateRange.end);
      plants = [...plants, ...newStates];
      succ.plantingDate = undefined;
      continue;
    }

    if (succ.triggered) continue;

    // Check trigger
    const predecessors = plants.filter(p => succ.predecessorPlantIds.has(p.plant_id));
    if (evaluateSuccessionTrigger(succ.successor.trigger, predecessors, conditions)) {
      succ.triggered = true;
      const plantDate = new Date(currentDate);
      plantDate.setDate(plantDate.getDate() + succ.successor.delay_days);
      succ.plantingDate = plantDate;
    }
  }

  return plants;
}

function buildActiveSuccessions(ctx: SimulationContext): ActiveSuccession[] {
  return (ctx.successions ?? []).map(c => ({
    predecessorPlantIds: c.predecessorPlantIds,
    successor: c.successor,
    zone: c.zone,
    zone_id: c.zone_id,
    triggered: false,
  }));
}

// ── DaySnapshot Pipeline ────────────────────────────────────────────────────

/** Run tick loop with auto-harvest and succession evaluation. */
export function collectSnapshots(
  initial_plants: PlantState[],
  ctx: SimulationContext,
): DaySnapshot[] {
  let plants = initial_plants;
  const snapshots: DaySnapshot[] = [];
  const activeSuccessions = buildActiveSuccessions(ctx);

  const day = new Date(ctx.dateRange.start);
  while (day <= ctx.dateRange.end) {
    const currentDate = new Date(day);

    // 1. Growth tick
    const result = tickDay(plants, currentDate, ctx.env, ctx.catalog);
    plants = result.plants;

    // 2. Auto-harvest
    plants = plants.map(p => p.is_harvestable ? harvestPlant(p, ctx.catalog) : p);

    // 3. Succession evaluation
    plants = evaluateAndMaterializeSuccessions(activeSuccessions, plants, currentDate, ctx);

    snapshots.push({ date: currentDate, plants: [...plants], events: result.events });
    day.setDate(day.getDate() + 1);

    if (plants.every(p => p.is_dead)) break;
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
  const ctx: SimulationContext = { catalog, env, dateRange };
  const plants = initPlantStates(gardenState.plants, catalog, env, dateRange.end);
  return collectSnapshots(plants, ctx);
}

// ── Task-Aware Simulation ─────────────────────────────────────────────────

/** Simulate with operational planner: tick + harvest + succession + task generation. */
export function simulateWithTasks(
  gardenState: GardenState,
  ctx: SimulationContext & { lifecycles: Map<string, LifecycleSpec> },
): DaySnapshot[] {
  let plants = initPlantStates(gardenState.plants, ctx.catalog, ctx.env, ctx.dateRange.end);
  const snapshots: DaySnapshot[] = [];
  const allTasks: Task[] = [];
  const activeSuccessions = buildActiveSuccessions(ctx);

  const day = new Date(ctx.dateRange.start);
  while (day <= ctx.dateRange.end) {
    const currentDate = new Date(day);

    // 1. Growth tick
    const result = tickDay(plants, currentDate, ctx.env, ctx.catalog);
    plants = result.plants;

    // 2. Auto-harvest
    plants = plants.map(p => p.is_harvestable ? harvestPlant(p, ctx.catalog) : p);

    // 3. Succession evaluation
    plants = evaluateAndMaterializeSuccessions(activeSuccessions, plants, currentDate, ctx);

    // 4. Task generation
    const planResult = planDay({
      plants,
      date: currentDate,
      env: ctx.env,
      catalog: ctx.catalog,
      lifecycles: ctx.lifecycles,
      existingTasks: allTasks,
    });
    allTasks.push(...planResult.newTasks);

    snapshots.push({
      date: currentDate,
      plants: [...plants],
      events: result.events,
      tasks: planResult.newTasks.length > 0 ? [...planResult.newTasks] : undefined,
    });

    day.setDate(day.getDate() + 1);

    if (plants.every(p => p.is_dead)) break;
  }

  return snapshots;
}
