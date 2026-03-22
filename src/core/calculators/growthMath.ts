/**
 * Pure growth math extracted from ProductionTimeline.
 *
 * These functions are source-agnostic: they work with any ConditionsResolver
 * (historical, observed, or composite). Used by both planning mode
 * (all-at-once season computation) and operational mode (daily ledger
 * accumulation).
 */

import { PlantSpecies, survivalRate } from '../types';
import type { HarvestStrategy } from '../types/HarvestStrategy';
import { interpolate } from './interpolate';
import { ConditionsResolver, computeEffectiveSunHours } from '../environment';
import { computeModifierProduct, computeSurvivalModifier } from './yieldModel';
import { computeDailyGdd } from './gddEngine';

// ── Constants ────────────────────────────────────────────────────────────────

export const MS_PER_DAY = 86_400_000;

/** 40ft deciduous tree at south edge of garden (physY=0). */
export const SHADE_TREE_HEIGHT_FT = 40;

export type SunZone = 'shade' | 'boundary' | 'full_sun';

/** physY midpoints for each zone (inches from south edge). */
export const ZONE_PHYS_Y: Record<SunZone, number> = {
  shade: 120,      // center of physY 0-240 (20ft shade zone)
  boundary: 240,   // shade/sun boundary
  full_sun: 600,   // well beyond any tree shadow
};

// ── Date Helpers ─────────────────────────────────────────────────────────────

export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

export function minDate(a: Date, b: Date): Date {
  return a < b ? a : b;
}

// ── Modifier Helpers ─────────────────────────────────────────────────────────

/** Highest breakpoint temperature where modifier >= 0.95 (top of optimal range). */
export function findPeakTemp(curve: Record<string, number>): number {
  let peak = -Infinity;
  for (const [key, value] of Object.entries(curve)) {
    if (value >= 0.95 && Number(key) > peak) peak = Number(key);
  }
  return peak;
}

/** Fraction of population surviving bolt trigger at given conditions. */
export function computeBoltSurvival(species: PlantSpecies, date: Date, env: ConditionsResolver): number {
  const trigger = species.modifiers.bolt_trigger;
  if (!trigger) return 1.0;
  const conditions = env.getConditions(date);
  const value = conditions[trigger.condition === 'photoperiod_h' ? 'photoperiod_h' : 'avg_high_f'];
  return interpolate(trigger.survival_curve, value);
}

/** Population survival via growth_response[] (replaces modifiers.bolt_trigger). */
export function computeSurvivalFromConditions(species: PlantSpecies, date: Date, env: ConditionsResolver): number {
  if (!species.growth_response) return 1.0;
  const cond = env.getConditions(date);
  const flat: Record<string, number> = {
    temperature_f: cond.avg_high_f,
    soil_temp_f: cond.soil_temp_f,
    photoperiod_h: cond.photoperiod_h,
  };
  if (cond.soil_moisture_pct_fc !== undefined) flat.soil_moisture_pct_fc = cond.soil_moisture_pct_fc;
  return computeSurvivalModifier(species.growth_response, flat);
}

// ── Death / Frost ────────────────────────────────────────────────────────────

/**
 * Earliest date a plant dies from frost, heat, or bolt.
 *
 * - Cold death: avg_low drops below kill_temp_f
 * - Heat death: temperature_f modifier <= 0.1 on the HOT side (above optimal)
 * - Bolt death: bolt_trigger survival <= 0.05 (population destroyed)
 */
export function computeDeathDate(species: PlantSpecies, harvest_start: Date, env: ConditionsResolver, season_end: Date): Date {
  let earliest = season_end;

  // 1. Cold death (frost kill) — scan actual daily lows
  // For historical sources (smoothed monthly averages), avg_first_frost is a
  // reasonable proxy. For observed/composite sources, the daily low IS the
  // actual low, so we always scan.
  const kill_temp = species.layout?.kill_temp_f;
  if (kill_temp !== undefined) {
    const useProxy = env.source_type === 'historical' && kill_temp >= 32;
    if (useProxy && env.avg_first_frost > harvest_start) {
      earliest = minDate(earliest, env.avg_first_frost);
    } else {
      const scan = new Date(harvest_start);
      while (scan <= earliest) {
        const cond = env.getConditions(scan);
        if (cond.avg_low_f < kill_temp) { earliest = minDate(earliest, scan); break; }
        scan.setDate(scan.getDate() + 7);
      }
    }
  }

  // 2. Heat death: temperature modifier drops below threshold on hot side
  const temp_response = species.growth_response?.find(r => r.factor === 'temperature_f');
  if (temp_response) {
    const peak = findPeakTemp(temp_response.curve);
    const scan = new Date(harvest_start);
    while (scan <= earliest) {
      const cond = env.getConditions(scan);
      if (cond.avg_high_f > peak && interpolate(temp_response.curve, cond.avg_high_f) <= 0.1) {
        earliest = minDate(earliest, scan);
        break;
      }
      scan.setDate(scan.getDate() + 7);
    }
  }

  // 3. Bolt death: survival drops below threshold (population destroyed)
  if (species.growth_response?.some(r => r.effect === 'population_survival')) {
    const scan = new Date(harvest_start);
    while (scan <= earliest) {
      if (computeSurvivalFromConditions(species, scan, env) <= 0.05) {
        earliest = minDate(earliest, scan);
        break;
      }
      scan.setDate(scan.getDate() + 7);
    }
  }

  return earliest;
}

/** Check whether a plant is dead from frost at a given date. */
export function isDeadFromFrost(species: PlantSpecies, date: Date, env: ConditionsResolver): boolean {
  const kill_temp = species.layout?.kill_temp_f;
  if (kill_temp === undefined) return false;
  if (env.source_type === 'historical' && kill_temp >= 32 && date >= env.avg_first_frost) return true;
  return env.getConditions(date).avg_low_f < kill_temp;
}

// ── Cut-and-Come-Again Calibration ───────────────────────────────────────────

/**
 * Calibrate daily_potential for cut-and-come-again crops.
 *
 * daily_potential is set so that at growth_mod=1.0, one regrowth_days period
 * of biomass accumulation reaches the harvest threshold. Vigor weighting
 * normalizes across cuts so total season yield ≈ baseline_lbs_per_plant.
 *
 * No dependency on planting date, environment, or calendar estimates.
 * Actual harvest timing emerges from the daily biomass loop in tickDay.
 */
export function calibrateCacPotential(
  strategy: HarvestStrategy,
): { daily_potential: number; initial_vigor: number } {
  const { baseline_lbs_per_plant, max_cuts, regrowth_days, cut_yield_curve } = strategy;
  if (!regrowth_days || !cut_yield_curve) {
    return { daily_potential: 0, initial_vigor: 1.0 };
  }
  // Sum vigor across all defined cuts. If max_cuts is set, use it as limit.
  // If undefined (unlimited cuts like kale), use all curve entries.
  const num_cuts = max_cuts ?? Math.max(...Object.keys(cut_yield_curve).map(Number));
  let vigor_sum = 0;
  for (let c = 1; c <= num_cuts; c++) {
    vigor_sum += interpolate(cut_yield_curve, c);
  }
  const vigor_days = vigor_sum * regrowth_days;
  return {
    daily_potential: baseline_lbs_per_plant / vigor_days,
    initial_vigor: interpolate(cut_yield_curve, 1),
  };
}

// ── Daily Growth ─────────────────────────────────────────────────────────────

/** One day's growth for a single plant under current conditions. */
export function computeDailyGrowth(
  species: PlantSpecies, date: Date, vigor: number,
  daily_potential: number, zone_physY: number, env: ConditionsResolver,
): number {
  const cond = env.getConditions(date);
  const sun_hours = computeEffectiveSunHours(zone_physY, date, SHADE_TREE_HEIGHT_FT, cond.sunshine_hours);
  return computeModifierProduct(species, { sun_hours, ...cond }) * daily_potential * vigor;
}

// ── Growth Accumulation ──────────────────────────────────────────────────────

/**
 * Integrate daily growth over a window.
 *
 * Each day: growth = daily_potential x vigor x modifier_product(conditions).
 * Returns accumulated biomass (lbs, before survival/bolt/plant_count scaling).
 * Samples daily for accuracy with observed weather data.
 */
export function accumulateGrowth(
  species: PlantSpecies, window_start: Date, window_end: Date,
  vigor: number, daily_potential: number, zone_physY: number, env: ConditionsResolver,
): number {
  const window_ms = window_end.getTime() - window_start.getTime();
  const window_days = window_ms / MS_PER_DAY;
  const sample_count = Math.max(1, Math.round(window_days));
  let accumulated = 0;

  for (let s = 0; s < sample_count; s++) {
    const t = (s + 0.5) / sample_count;
    const sample_date = new Date(window_start.getTime() + t * window_ms);
    const cond = env.getConditions(sample_date);
    const sun_hours = computeEffectiveSunHours(zone_physY, sample_date, SHADE_TREE_HEIGHT_FT, cond.sunshine_hours);
    const modifier = computeModifierProduct(species, { sun_hours, ...cond });
    accumulated += daily_potential * vigor * modifier * (window_days / sample_count);
  }

  return accumulated;
}
