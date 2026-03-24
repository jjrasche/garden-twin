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
import type { ConditionsResolver, WeeklyConditions } from '../environment/types';
import { tickDay } from './tickDay';
import { initPlantStates } from './initPlantStates';
import { planDay } from './operationalPlanner';
import { resolveTask } from './resolveTask';
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

    // 2. Auto-harvest
    plants = plants.map(p => p.is_harvestable ? harvestPlant(p, ctx.catalog) : p);

    // 3. Auto-pull senescent plants (gardener clears them same day they notice)
    plants = plants.map(p => {
      if (p.lifecycle === 'senescent') return { ...p, lifecycle: 'pulled' as const };
      return p;
    });

    // 4. Succession evaluation
    plants = evaluateAndMaterializeSuccessions(activeSuccessions, plants, currentDate, ctx);

    snapshots.push({ date: currentDate, plants: [...plants], events: result.events });
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

// ── Moisture Overlay ──────────────────────────────────────────────────────

/** Tracks watering events and applies moisture boost with linear decay. */
const WATERING_TARGET_PCT_FC = 80;
const WATERING_DECAY_DAYS = 3;

/**
 * Wrap a ConditionsResolver with a moisture overlay from watering events.
 * Boost decays linearly over WATERING_DECAY_DAYS back to the weather baseline.
 */
function applyMoistureOverlay(
  baseEnv: ConditionsResolver,
  lastWateredDate: Date | null,
): ConditionsResolver {
  if (!lastWateredDate) return baseEnv;

  return {
    ...baseEnv,
    getConditions(date: Date, where?: { physY: number }) {
      const baseCond = baseEnv.getConditions(date, where);
      const daysSinceWatering = Math.floor(
        (date.getTime() - lastWateredDate.getTime()) / 86_400_000,
      );

      if (daysSinceWatering < 0 || daysSinceWatering >= WATERING_DECAY_DAYS) {
        return baseCond;
      }

      const baseMoisture = baseCond.soil_moisture_pct_fc ?? 50;
      const boostFraction = 1 - daysSinceWatering / WATERING_DECAY_DAYS;
      const boostedMoisture = baseMoisture + (WATERING_TARGET_PCT_FC - baseMoisture) * boostFraction;

      return { ...baseCond, soil_moisture_pct_fc: Math.min(100, boostedMoisture) };
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
  let lastWateredDate: Date | null = null;

  const day = new Date(ctx.dateRange.start);
  while (day <= ctx.dateRange.end) {
    const currentDate = new Date(day);
    const dateIso = currentDate.toISOString();

    // Apply moisture overlay from prior watering
    const effectiveEnv = applyMoistureOverlay(ctx.env, lastWateredDate);

    // 1. Growth tick (uses moisture-adjusted conditions)
    const result = tickDay(plants, currentDate, effectiveEnv, ctx.catalog);
    plants = result.plants;

    // 2. Succession evaluation
    plants = evaluateAndMaterializeSuccessions(activeSuccessions, plants, currentDate, ctx);

    // 3. Task generation (all three sources — uses moisture-adjusted conditions for rules)
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
      const resolution = resolveTask(task, plants, ctx.catalog);
      if (resolution.plants) {
        plants = resolution.plants;
      }
      if (resolution.watered) {
        lastWateredDate = currentDate;
      }
      return { ...task, status: 'completed' as const, completed_at: dateIso };
    });

    // 5. Auto-pull senescent plants (gardener clears them same day)
    plants = plants.map(p =>
      p.lifecycle === 'senescent' ? { ...p, lifecycle: 'pulled' as const } : p,
    );

    allTasks.push(...resolvedTasks);

    snapshots.push({
      date: currentDate,
      plants: [...plants],
      events: result.events,
      tasks: resolvedTasks.length > 0 ? resolvedTasks : undefined,
    });

    day.setDate(day.getDate() + 1);

    if (plants.every(p => p.lifecycle === 'dead' || p.lifecycle === 'pulled')) break;
  }

  return snapshots;
}
