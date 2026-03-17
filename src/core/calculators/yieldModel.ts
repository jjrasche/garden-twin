/**
 * Canonical per-plant yield formula.
 *
 * All yield calculations in the system delegate here. Conditions are optional —
 * omit what you don't have and that modifier defaults to 1.0 (optimal).
 *
 * When species.growth_response exists, all modifiers are multiplicative via
 * computeGrowthModifier. Legacy path uses Liebig's Law for soil nutrients.
 */

import { PlantSpecies, survivalRate } from '../types';
import type { GrowthResponse } from '../types/PlantSpecies';
import { interpolate } from './interpolate';
import { resolveHarvestStrategy } from './strategyResolver';

export interface YieldConditions {
  sun_hours: number;
  soil?: {
    N_ppm: number;
    P_ppm: number;
    K_ppm: number;
    pH: number;
    compaction_psi: number;
  };
  spacing_plants_per_sq_ft?: number;
  soil_moisture_pct_fc?: number;
  avg_high_f?: number;
  soil_temp_f?: number;
  photoperiod_h?: number;
}

/**
 * Flatten YieldConditions into a Record for computeGrowthModifier.
 *
 * Bridges the YieldConditions API (typed fields) to the GrowthResponse API
 * (arbitrary string keys). Maps condition field names to biological factor names:
 *   avg_high_f → temperature_f (species response curves use biological name)
 *   soil.N_ppm → N_ppm (flattened from nested object)
 */
export function flattenYieldConditions(conditions: YieldConditions): Record<string, number> {
  const flat: Record<string, number> = { sun_hours: conditions.sun_hours };

  if (conditions.soil) {
    flat.N_ppm = conditions.soil.N_ppm;
    flat.P_ppm = conditions.soil.P_ppm;
    flat.K_ppm = conditions.soil.K_ppm;
    flat.pH = conditions.soil.pH;
    flat.compaction_psi = conditions.soil.compaction_psi;
  }
  if (conditions.spacing_plants_per_sq_ft !== undefined) flat.spacing_plants_per_sq_ft = conditions.spacing_plants_per_sq_ft;
  if (conditions.soil_moisture_pct_fc !== undefined) flat.soil_moisture_pct_fc = conditions.soil_moisture_pct_fc;
  if (conditions.avg_high_f !== undefined) flat.temperature_f = conditions.avg_high_f;
  if (conditions.soil_temp_f !== undefined) flat.soil_temp_f = conditions.soil_temp_f;
  if (conditions.photoperiod_h !== undefined) flat.photoperiod_h = conditions.photoperiod_h;

  return flat;
}

/**
 * Product of all environmental modifiers for given conditions.
 *
 * When species has growth_response[], delegates to computeGrowthModifier
 * (fully multiplicative). Falls back to legacy hardcoded field iteration
 * for species without growth_response.
 */
export function computeModifierProduct(species: PlantSpecies, conditions: YieldConditions): number {
  return computeGrowthModifier(species.growth_response ?? [], flattenYieldConditions(conditions));
}

/**
 * Expected total yield per plant given species and growing conditions.
 *
 * Formula: baseline × modifierProduct × survival
 */
export function computePlantYield(species: PlantSpecies, conditions: YieldConditions): number {
  const strategy = resolveHarvestStrategy(undefined, species);
  const baseline = strategy?.baseline_lbs_per_plant ?? 0;
  return baseline * computeModifierProduct(species, conditions) * survivalRate(species);
}

// =============================================================================
// GrowthResponse-based modifiers (Phase 1 — replaces hardcoded field iteration)
// =============================================================================

/**
 * Product of all growth_rate response curves.
 *
 * Iterates GrowthResponse[] and multiplies curves where effect === 'growth_rate'.
 * If a condition value for a factor is missing, that curve is skipped (1.0).
 */
export function computeGrowthModifier(
  responses: GrowthResponse[],
  conditions: Record<string, number>,
): number {
  let product = 1.0;
  for (const r of responses) {
    if (r.effect !== 'growth_rate') continue;
    const value = conditions[r.factor];
    if (value === undefined) continue;
    product *= interpolate(r.curve, value);
  }
  return product;
}

/**
 * Product of all population_survival response curves.
 *
 * Returns the fraction of the population that survives (bolt, heat kill, etc.).
 * If a condition value is missing, that curve is skipped (1.0).
 */
export function computeSurvivalModifier(
  responses: GrowthResponse[],
  conditions: Record<string, number>,
): number {
  let product = 1.0;
  for (const r of responses) {
    if (r.effect !== 'population_survival') continue;
    const value = conditions[r.factor];
    if (value === undefined) continue;
    product *= interpolate(r.curve, value);
  }
  return product;
}

/**
 * Product of all development_rate response curves.
 *
 * Modulates how fast the plant accumulates development units (GDD-based).
 * Values > 1.0 accelerate development (e.g., long-day spinach bolts faster).
 * Respects active_stages: if a response declares active_stages and the
 * plant's current stage is not listed, that curve is skipped (1.0).
 */
export function computeDevelopmentModifier(
  responses: GrowthResponse[],
  conditions: Record<string, number>,
  current_stage: string,
): number {
  let product = 1.0;
  for (const r of responses) {
    if (r.effect !== 'development_rate') continue;
    if (r.active_stages && !r.active_stages.includes(current_stage)) continue;
    const value = conditions[r.factor];
    if (value === undefined) continue;
    product *= interpolate(r.curve, value);
  }
  return product;
}
