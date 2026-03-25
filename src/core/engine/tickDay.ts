/**
 * Unified growth engine — single daily tick for one or many plants.
 *
 * tickPlant(): one plant, one day → updated state + events
 * tickDay():   all plants, one day → updated states + events
 *
 * Pipeline per plant per day:
 *   1. checkFrost         — instantaneous kill check
 *   2. checkSurvival      — population_survival curves
 *   3. updateStress       — duration-based stress counters
 *   4. accumulateDev      — GDD × development_rate modifiers → stage transitions
 *   5. accumulateBiomass  — growth in productive stages only
 *   6. computeQuality     — flavor × maturity (biomass ratio)
 *   7. checkHarvestReady  — biomass >= min_harvest_lbs? (backward compat)
 */

import type { PlantSpecies } from '../types/PlantSpecies';
import type { PlantState, GrowthEvent, StressCounters } from '../types/PlantState';
import type { GrowthStage } from '../types/GardenState';
import type { ConditionsResolver } from '../environment/types';
import { computeDailyGdd, determineStage } from '../calculators/gddEngine';
import { computeQuality, isHarvestable as checkMinBiomass } from '../calculators/qualityModel';
import { computeDevelopmentModifier, computeGrowthModifier, computeSurvivalModifier } from '../calculators/yieldModel';
import { interpolate } from '../calculators/interpolate';
import { resolveHarvestStrategy } from '../calculators/strategyResolver';

// ── Leaf Functions (one concern each) ────────────────────────────────────────

/** Resolve flat conditions record from environment at a date. */
function resolveConditions(
  date: Date, env: ConditionsResolver,
): Record<string, number> {
  const cond = env.getConditions(date);
  const flat: Record<string, number> = {
    temperature_f: cond.avg_high_f,
    soil_temp_f: cond.soil_temp_f,
    photoperiod_h: cond.photoperiod_h,
    sun_hours: cond.sunshine_hours ?? 8, // 8h default = full sun, no clouds
  };
  if (cond.soil_moisture_pct_fc !== undefined) flat.soil_moisture_pct_fc = cond.soil_moisture_pct_fc;
  return flat;
}

/** Check if plant dies from frost.
 *  Pre-emergence (seed/germinated): use soil temp — tubers/seeds are underground.
 *  Post-emergence (vegetative+): use air temp — exposed foliage is vulnerable. */
function checkFrost(
  species: PlantSpecies, date: Date, env: ConditionsResolver,
  stage?: string,
): string | null {
  const kill_temp = species.layout?.kill_temp_f;
  if (kill_temp === undefined) return null;
  const cond = env.getConditions(date);
  const preEmergence = stage === 'seed' || stage === 'germinated';
  const effectiveTemp = preEmergence ? cond.soil_temp_f : cond.avg_low_f;
  if (effectiveTemp < kill_temp) return 'frost';
  return null;
}

/** Check population survival curves against per-plant bolt resistance.
 *  Each plant has a random bolt_resistance (0-1). When the survival modifier
 *  drops below the plant's resistance, that individual plant bolts/dies.
 *  High-resistance plants bolt first; low-resistance plants survive longer. */
function checkSurvival(
  species: PlantSpecies, conditions: Record<string, number>,
  bolt_resistance: number,
): string | null {
  if (!species.growth_response) return null;
  const survival = computeSurvivalModifier(species.growth_response, conditions);
  if (survival <= bolt_resistance) return 'population_collapse';
  return null;
}

/** Update stress counters. Returns new counters, optional death cause, and vigor penalty. */
function updateStress(
  stress: StressCounters,
  species: PlantSpecies,
  conditions: Record<string, number>,
): { stress: StressCounters; cause: string | null; vigor_penalty: number } {
  const tolerances = species.stress_tolerances;
  if (!tolerances) return { stress, cause: null, vigor_penalty: 1.0 };

  const next = { ...stress };
  let cause: string | null = null;
  let worst_penalty = 1.0;

  const stress_checks: Array<{
    key: 'drought' | 'waterlog' | 'heat';
    counter: 'drought_days' | 'waterlog_days' | 'heat_days';
    condition_key: string;
    death_cause: string;
  }> = [
    { key: 'drought', counter: 'drought_days', condition_key: 'soil_moisture_pct_fc', death_cause: 'drought' },
    { key: 'waterlog', counter: 'waterlog_days', condition_key: 'soil_moisture_pct_fc', death_cause: 'waterlog' },
    { key: 'heat', counter: 'heat_days', condition_key: 'temperature_f', death_cause: 'heat_stress' },
  ];

  for (const check of stress_checks) {
    const tol = tolerances[check.key];
    if (!tol) continue;
    const val = conditions[check.condition_key];
    const is_stressed = val !== undefined && (
      tol.direction === 'below' ? val < tol.threshold : val > tol.threshold
    );
    next[check.counter] = is_stressed
      ? stress[check.counter] + 1
      : Math.max(0, stress[check.counter] - 1);
    if (next[check.counter] >= tol.days_to_death) cause = check.death_cause;

    // Linear vigor penalty between days_to_damage and days_to_death
    if (next[check.counter] >= tol.days_to_damage && next[check.counter] < tol.days_to_death) {
      const damage_range = tol.days_to_death - tol.days_to_damage;
      const damage_progress = (next[check.counter] - tol.days_to_damage) / damage_range;
      worst_penalty = Math.min(worst_penalty, 1.0 - damage_progress);
    }
  }

  return { stress: next, cause, vigor_penalty: worst_penalty };
}

/** Compute daily development units and raw GDD. */
function computeDailyDev(
  species: PlantSpecies,
  conditions: Record<string, number>,
  current_stage: string,
  env_cond: { avg_high_f: number; avg_low_f: number },
): { daily_gdd: number; daily_dev: number } {
  const phenology = species.phenology;
  if (!phenology) return { daily_gdd: 0, daily_dev: 0 };

  const daily_gdd = computeDailyGdd(env_cond.avg_high_f, env_cond.avg_low_f, phenology.base_temp_f, phenology.ceiling_temp_f);
  const dev_modifier = species.growth_response
    ? computeDevelopmentModifier(species.growth_response, conditions, current_stage)
    : 1.0;
  return { daily_gdd, daily_dev: daily_gdd * dev_modifier };
}

/** Determine the next stage from accumulated dev units. */
function resolveStage(
  accumulated_dev: number,
  species: PlantSpecies,
): GrowthStage {
  if (!species.phenology) return 'vegetative';
  return determineStage(accumulated_dev, species.phenology.gdd_stages);
}

/** Clamp stage to what the species' stage_sequence allows. */
function clampStage(
  gdd_stage: GrowthStage,
  species: PlantSpecies,
): GrowthStage {
  const sequence = species.stage_config?.stage_sequence;
  if (!sequence) return gdd_stage;
  // Find the latest stage in the sequence that the GDD stage has reached
  const stage_order: GrowthStage[] = ['seed', 'germinated', 'vegetative', 'flowering', 'fruiting', 'harvest', 'done'];
  const gdd_idx = stage_order.indexOf(gdd_stage);
  let best: GrowthStage = 'seed';
  for (const s of sequence) {
    if (s === 'done') continue;
    if (stage_order.indexOf(s) <= gdd_idx) best = s;
  }
  return best;
}

/** Whether the current stage is productive (biomass accumulates). */
function isProductiveStage(stage: GrowthStage, species: PlantSpecies): boolean {
  const productive = species.stage_config?.productive_stages;
  if (!productive) {
    // Fallback: fruiting + harvest for species without stage_config
    return stage === 'fruiting' || stage === 'harvest';
  }
  return productive.includes(stage);
}

/** Compute daily biomass growth. */
function computeBiomass(
  species: PlantSpecies,
  vigor: number,
  daily_potential: number,
  conditions: Record<string, number>,
): number {
  const growth_mod = species.growth_response
    ? computeGrowthModifier(species.growth_response, conditions)
    : 1.0;
  return daily_potential * vigor * growth_mod;
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export interface TickResult {
  plant: PlantState;
  events: GrowthEvent[];
}

/**
 * Advance one plant by one day. Pure function — returns new state + events.
 */
export function tickPlant(
  plant: PlantState,
  date: Date,
  env: ConditionsResolver,
  catalog: Map<string, PlantSpecies>,
): TickResult {
  if (plant.lifecycle === 'dead' || plant.lifecycle === 'senescent' || plant.lifecycle === 'pulled') {
    return { plant, events: [] };
  }

  if (date < new Date(plant.planted_date)) {
    return { plant, events: [] };
  }

  const species = catalog.get(plant.species_id);
  if (!species) return { plant, events: [] };

  const events: GrowthEvent[] = [];
  const env_cond = env.getConditions(date);
  const conditions = resolveConditions(date, env);
  // Inject planting density into conditions for spacing growth curves
  if (plant.density_plants_per_sqft !== undefined) {
    conditions.spacing_plants_per_sq_ft = plant.density_plants_per_sqft;
  }

  // 1. Frost kill
  const frost_cause = checkFrost(species, date, env, plant.stage);
  if (frost_cause) {
    return {
      plant: { ...plant, lifecycle: 'dead' },
      events: [{ type: 'plant_died', plant_id: plant.plant_id, date, cause: 'frost' }],
    };
  }

  // 2. Population survival → bolting (not death)
  const survival_cause = checkSurvival(species, conditions, plant.bolt_resistance);
  if (survival_cause) {
    return {
      plant: { ...plant, lifecycle: 'senescent', is_harvestable: false },
      events: [{ type: 'plant_senescent', plant_id: plant.plant_id, date, cause: survival_cause }],
    };
  }

  // 3. Stress counters
  const stress_result = updateStress(plant.stress, species, conditions);
  if (stress_result.cause) {
    return {
      plant: { ...plant, lifecycle: 'dead', stress: stress_result.stress },
      events: [{ type: 'plant_died', plant_id: plant.plant_id, date, cause: stress_result.cause }],
    };
  }

  // Lifecycle reflects current stress level
  const lifecycle = stress_result.vigor_penalty < 1.0 ? 'stressed' as const : 'growing' as const;

  // 4. Development accumulation
  const { daily_gdd, daily_dev } = computeDailyDev(species, conditions, plant.stage, env_cond);
  const new_accumulated_dev = plant.accumulated_dev + daily_dev;
  const new_accumulated_gdd = plant.accumulated_gdd + daily_gdd;

  // Stage transition
  const gdd_stage = resolveStage(new_accumulated_dev, species);

  // Bolt for leafy crops is handled by population_survival curves (e.g., spinach
  // photoperiod bolt) and development_rate acceleration, not GDD-based instant death.
  // The flowering GDD thresholds represent year-2 biology for biennials (kale) and
  // are too low to use as year-1 kill triggers. clampStage prevents stage progression
  // past what the species' stage_sequence allows.
  const clamped_stage = clampStage(gdd_stage, species);
  if (clamped_stage !== plant.stage) {
    events.push({
      type: 'stage_changed',
      plant_id: plant.plant_id,
      from: plant.stage,
      to: clamped_stage,
      date,
    });
  }

  // 5. Biomass accumulation (only in productive stages)
  const strategy = resolveHarvestStrategy(plant.harvest_strategy_id, species);
  let new_accumulated_lbs = plant.accumulated_lbs;
  if (isProductiveStage(clamped_stage, species)) {
    const effective_vigor = plant.vigor * stress_result.vigor_penalty;
    new_accumulated_lbs += computeBiomass(species, effective_vigor, plant.daily_potential, conditions);
  }

  // 6. Quality computation (flavor × maturity from biomass ratio)
  const minHarvestLbs = species.quality?.min_harvest_lbs ?? 0;
  const currentlyHarvestable = minHarvestLbs > 0
    ? checkMinBiomass(new_accumulated_lbs, minHarvestLbs)
    : checkHarvestReady(clamped_stage, new_accumulated_lbs, plant, species, strategy);

  const qualityResult = species.quality
    ? computeQuality(species, conditions, new_accumulated_lbs)
    : undefined;

  const is_harvestable = currentlyHarvestable;

  if (is_harvestable && !plant.is_harvestable) {
    events.push({
      type: 'harvest_ready',
      plant_id: plant.plant_id,
      date,
      accumulated_lbs: new_accumulated_lbs,
    });
  }

  return {
    plant: {
      ...plant,
      lifecycle,
      stage: clamped_stage,
      accumulated_dev: new_accumulated_dev,
      accumulated_gdd: new_accumulated_gdd,
      accumulated_lbs: new_accumulated_lbs,
      stress: stress_result.stress,
      quality_score: qualityResult?.quality_score,
      is_harvestable,
    },
    events,
  };
}

/** Whether a plant is ready for harvest, given its strategy type.
 *  For cut-and-come-again: regrowth_days defines the threshold in "optimal-day
 *  equivalents." Actual regrowth time depends on conditions — cold weather
 *  (growth_mod < 1.0) means slower biomass accumulation and longer intervals. */
function checkHarvestReady(
  stage: GrowthStage, accumulated_lbs: number,
  plant: PlantState, species: PlantSpecies,
  strategy: { type: string; regrowth_days?: number } | null,
): boolean {
  if (!strategy || accumulated_lbs <= 0) return false;
  if (!isProductiveStage(stage, species)) return false;

  if (strategy.type === 'bulk') return stage === 'harvest';
  if (strategy.type === 'continuous') return true;

  // CAC: accumulate to threshold before each cut
  const window_days = strategy.regrowth_days ?? 14;
  const threshold = plant.daily_potential * plant.vigor * window_days * 0.9;
  return accumulated_lbs >= threshold;
}

// ── Batch Orchestrator ───────────────────────────────────────────────────────

export interface DayResult {
  plants: PlantState[];
  events: GrowthEvent[];
}

/** Advance all plants by one day. */
export function tickDay(
  plants: PlantState[],
  date: Date,
  env: ConditionsResolver,
  catalog: Map<string, PlantSpecies>,
): DayResult {
  const all_events: GrowthEvent[] = [];
  const updated = plants.map(plant => {
    const result = tickPlant(plant, date, env, catalog);
    all_events.push(...result.events);
    return result.plant;
  });
  return { plants: updated, events: all_events };
}
