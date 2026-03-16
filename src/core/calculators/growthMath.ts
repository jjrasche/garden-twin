/**
 * Pure growth math extracted from ProductionTimeline.
 *
 * These functions are source-agnostic: they work with any EnvironmentSource
 * (historical, observed, or composite). Used by both planning mode
 * (all-at-once season computation) and operational mode (daily ledger
 * accumulation).
 */

import { PlantSpecies, survivalRate } from '../types';
import { interpolate } from './interpolate';
import { EnvironmentSource, computeEffectiveSunHours } from '../environment';
import { computeModifierProduct, computeSurvivalModifier } from './yieldModel';

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
export function computeBoltSurvival(species: PlantSpecies, date: Date, env: EnvironmentSource): number {
  const trigger = species.modifiers.bolt_trigger;
  if (!trigger) return 1.0;
  const conditions = env.getConditions(date);
  const value = conditions[trigger.condition === 'photoperiod_h' ? 'photoperiod_h' : 'avg_high_f'];
  return interpolate(trigger.survival_curve, value);
}

/** Population survival via growth_response[] (replaces modifiers.bolt_trigger). */
export function computeSurvivalFromConditions(species: PlantSpecies, date: Date, env: EnvironmentSource): number {
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
export function computeDeathDate(species: PlantSpecies, harvest_start: Date, env: EnvironmentSource, season_end: Date): Date {
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
export function isDeadFromFrost(species: PlantSpecies, date: Date, env: EnvironmentSource): boolean {
  const kill_temp = species.layout?.kill_temp_f;
  if (kill_temp === undefined) return false;
  if (env.source_type === 'historical' && kill_temp >= 32 && date >= env.avg_first_frost) return true;
  return env.getConditions(date).avg_low_f < kill_temp;
}

// ── Cut Schedule ─────────────────────────────────────────────────────────────

export interface CutSchedule {
  cut_dates: Date[];
  window_starts: Date[];
  vigors: number[];
  daily_potential: number;
}

/**
 * Pre-compute cut schedule with daily growth potential.
 *
 * Each cut's yield = integral of (daily_potential x vigor x modifier) over its
 * growth window. daily_potential is calibrated so total under perfect conditions
 * equals baseline_lbs_per_plant.
 */
export function buildCutSchedule(plant_date: Date, species: PlantSpecies): CutSchedule | null {
  const cac = species.cut_and_come_again;
  if (!cac) return null;

  const cut_dates: Date[] = [];
  const window_starts: Date[] = [];
  const vigors: number[] = [];

  let vigor_days_total = 0;
  for (let c = 1; c <= cac.max_cuts; c++) {
    const d = new Date(plant_date);
    d.setDate(d.getDate() + species.days_to_first_harvest + (c - 1) * cac.regrowth_days);
    cut_dates.push(d);

    const window_start = c === 1
      ? new Date(plant_date)
      : cut_dates[c - 2]!;
    window_starts.push(window_start);

    const window_days = daysBetween(window_start, d);
    const vigor = interpolate(cac.cut_yield_curve, c);
    vigors.push(vigor);
    vigor_days_total += vigor * window_days;
  }

  const daily_potential = species.baseline_lbs_per_plant / vigor_days_total;

  return { cut_dates, window_starts, vigors, daily_potential };
}

// ── Daily Growth ─────────────────────────────────────────────────────────────

/** One day's growth for a single plant under current conditions. */
export function computeDailyGrowth(
  species: PlantSpecies, date: Date, vigor: number,
  daily_potential: number, zone_physY: number, env: EnvironmentSource,
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
  vigor: number, daily_potential: number, zone_physY: number, env: EnvironmentSource,
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
