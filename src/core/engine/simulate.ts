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
import type { TaskRule } from '../types/Rules';
import type { ConditionsResolver } from '../environment/types';
import { tickDay } from './tickDay';
import { initPlantStates } from './initPlantStates';
import { planDay } from './operationalPlanner';
import { resolveTask, type ConditionOverride } from './resolveTask';
import { harvestPlant } from './harvestPlant';
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
  seasonTasks?: Task[];  // Pre-expanded via adaptSeasonTasks(); indexed at simulation start
  rules?: TaskRule[];
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

// Re-export harvestPlant for backward compatibility (was defined here, now in harvestPlant.ts)
export { harvestPlant } from './harvestPlant';

/** Harvest plants whose quality has dropped below the species must-harvest floor. */
function harvestDecliningPlants(
  plants: PlantState[],
  catalog: Map<string, PlantSpecies>,
  date: Date,
): { plants: PlantState[]; events: GrowthEvent[] } {
  const events: GrowthEvent[] = [];
  const updatedPlants = plants.map(plant => {
    if (!plant.is_harvestable || plant.lifecycle === 'dead' || plant.lifecycle === 'pulled') return plant;
    const species = catalog.get(plant.species_id);
    const mustHarvestFloor = species?.quality?.must_harvest_floor ?? 0.3;
    if (plant.quality_score !== undefined && plant.quality_score < mustHarvestFloor) {
      events.push({
        type: 'harvested', plant_id: plant.plant_id, date,
        harvested_lbs: plant.accumulated_lbs, quality_score: plant.quality_score,
      });
      return { ...harvestPlant(plant, catalog), days_since_harvestable: 0 };
    }
    return plant;
  });
  return { plants: updatedPlants, events };
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

/** Index pre-expanded season tasks by date key for O(1) lookup per day. */
function indexSeasonTasksByDate(tasks?: Task[]): Map<string, Task[]> | undefined {
  if (!tasks || tasks.length === 0) return undefined;
  const index = new Map<string, Task[]>();
  for (const task of tasks) {
    const dateKey = task.due_by?.slice(0, 10);
    if (!dateKey) continue;
    const bucket = index.get(dateKey);
    if (bucket) {
      bucket.push(task);
    } else {
      index.set(dateKey, [task]);
    }
  }
  return index;
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

    // 2. Quality-decline harvest (harvest only when quality demands it)
    const harvestResult = harvestDecliningPlants(plants, ctx.catalog, currentDate);
    plants = harvestResult.plants;
    const harvestEvents = harvestResult.events;

    // 3. Auto-pull senescent plants (gardener clears them same day they notice)
    plants = plants.map(p => {
      if (p.lifecycle === 'senescent') return { ...p, lifecycle: 'pulled' as const };
      return p;
    });

    // 4. Succession evaluation
    plants = evaluateAndMaterializeSuccessions(activeSuccessions, plants, currentDate, ctx);

    snapshots.push({ date: currentDate, plants: [...plants], events: [...result.events, ...harvestEvents] });
    day.setDate(day.getDate() + 1);

    if (plants.every(p => p.lifecycle === 'dead' || p.lifecycle === 'pulled')) break;
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

// ── Condition Overrides ──────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/**
 * Compute the effective value for a condition factor given active overrides.
 * Multiple overrides on the same factor use the most recent one.
 * Boost decays linearly over decayDays back to the baseline.
 */
export function computeOverrideValue(
  factor: string,
  baseValue: number,
  overrides: ConditionOverride[],
  currentDate: Date,
): number {
  // Find the most recent active override for this factor
  let bestOverride: ConditionOverride | null = null;
  for (const ov of overrides) {
    if (ov.factor !== factor) continue;
    const daysSince = Math.floor((currentDate.getTime() - ov.appliedDate.getTime()) / MS_PER_DAY);
    if (daysSince < 0 || daysSince >= ov.decayDays) continue;
    if (!bestOverride || ov.appliedDate > bestOverride.appliedDate) {
      bestOverride = ov;
    }
  }
  if (!bestOverride) return baseValue;

  const daysSince = Math.floor((currentDate.getTime() - bestOverride.appliedDate.getTime()) / MS_PER_DAY);
  const decayFraction = 1 - daysSince / bestOverride.decayDays;
  return baseValue + (bestOverride.targetValue - baseValue) * decayFraction;
}

/**
 * Wrap a ConditionsResolver with active condition overrides from task resolution.
 * Applies to both getConditions and getWeeklyConditions.
 */
function applyConditionOverrides(
  baseEnv: ConditionsResolver,
  overrides: ConditionOverride[],
): ConditionsResolver {
  if (overrides.length === 0) return baseEnv;

  return {
    ...baseEnv,
    getConditions(date: Date, where?: { physY: number }) {
      const baseCond = baseEnv.getConditions(date, where);
      const result = { ...baseCond };

      if (baseCond.soil_moisture_pct_fc !== undefined) {
        result.soil_moisture_pct_fc = computeOverrideValue(
          'soil_moisture_pct_fc', baseCond.soil_moisture_pct_fc, overrides, date,
        );
      }

      return result;
    },
    getWeeklyConditions(start: Date, end: Date) {
      return baseEnv.getWeeklyConditions(start, end);
    },
  };
}

// ── Task-Aware Simulation ─────────────────────────────────────────────────

/** Simulate with operational planner: tick + succession + task generation + resolution. */
export function simulateWithTasks(
  gardenState: GardenState,
  ctx: SimulationContext & { lifecycles: Map<string, LifecycleSpec> },
): DaySnapshot[] {
  let plants = initPlantStates(gardenState.plants, ctx.catalog, ctx.env, ctx.dateRange.end);
  const snapshots: DaySnapshot[] = [];
  const allTasks: Task[] = [];
  const activeSuccessions = buildActiveSuccessions(ctx);
  const seasonTaskIndex = indexSeasonTasksByDate(ctx.seasonTasks);
  const activeOverrides: ConditionOverride[] = [];

  const day = new Date(ctx.dateRange.start);
  while (day <= ctx.dateRange.end) {
    const currentDate = new Date(day);
    const dateIso = currentDate.toISOString();

    // Apply condition overrides from prior task resolutions (watering, fertilizing, etc.)
    const effectiveEnv = applyConditionOverrides(ctx.env, activeOverrides);

    // 1. Growth tick (uses override-adjusted conditions)
    const result = tickDay(plants, currentDate, effectiveEnv, ctx.catalog);
    plants = result.plants;

    // 2. Succession evaluation
    plants = evaluateAndMaterializeSuccessions(activeSuccessions, plants, currentDate, ctx);

    // 3. Task generation (all three sources)
    const planResult = planDay({
      plants,
      date: currentDate,
      env: effectiveEnv,
      catalog: ctx.catalog,
      lifecycles: ctx.lifecycles,
      existingTasks: allTasks,
      seasonTaskIndex,
      rules: ctx.rules,
    });

    // 4. Auto-resolve tasks in simulation (assumed perfect execution)
    const resolvedTasks = planResult.newTasks.map(task => {
      const resolution = resolveTask(task, plants, ctx.catalog, currentDate);
      if (resolution.plants) {
        plants = resolution.plants;
      }
      if (resolution.overrides) {
        activeOverrides.push(...resolution.overrides);
      }
      return { ...task, status: 'completed' as const, completed_at: dateIso };
    });

    // 5. Quality-decline forced harvest (plants not caught by task-driven harvest)
    const qualityHarvest = harvestDecliningPlants(plants, ctx.catalog, currentDate);
    plants = qualityHarvest.plants;
    const harvestEvents = qualityHarvest.events;

    // 6. Auto-pull senescent plants (gardener clears them same day)
    plants = plants.map(p =>
      p.lifecycle === 'senescent' ? { ...p, lifecycle: 'pulled' as const } : p,
    );

    allTasks.push(...resolvedTasks);

    snapshots.push({
      date: currentDate,
      plants: [...plants],
      events: [...result.events, ...harvestEvents],
      tasks: resolvedTasks.length > 0 ? resolvedTasks : undefined,
    });

    day.setDate(day.getDate() + 1);

    if (plants.every(p => p.lifecycle === 'dead' || p.lifecycle === 'pulled')) break;
  }

  return snapshots;
}
