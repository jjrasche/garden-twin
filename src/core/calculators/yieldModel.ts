/**
 * Canonical per-plant yield formula.
 *
 * All yield calculations in the system delegate here. Conditions are optional —
 * omit what you don't have and that modifier defaults to 1.0 (optimal).
 *
 * Soil factors use Liebig's Law (minimum of competing nutrients) per DSSAT/APSIM.
 * Environmental stresses (temperature, photoperiod) are independent and multiplicative.
 */

import { PlantSpecies, survivalRate } from '../types';
import { interpolate } from './interpolate';

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
 * Product of all environmental modifiers for given conditions.
 *
 * Separated from baseline and survival so callers can accumulate
 * daily growth independently (biomass accumulation model).
 *
 * Formula:
 *   sun × min(soil_N, soil_P, soil_K, pH, compaction)
 *       × spacing × moisture × temperature × soil_temp × photoperiod
 */
export function computeModifierProduct(species: PlantSpecies, conditions: YieldConditions): number {
  let m = interpolate(species.modifiers.sun, conditions.sun_hours);

  if (conditions.soil) {
    m *= Math.min(
      interpolate(species.modifiers.soil.N_ppm, conditions.soil.N_ppm),
      interpolate(species.modifiers.soil.P_ppm, conditions.soil.P_ppm),
      interpolate(species.modifiers.soil.K_ppm, conditions.soil.K_ppm),
      interpolate(species.modifiers.soil.pH, conditions.soil.pH),
      interpolate(species.modifiers.soil.compaction_psi, conditions.soil.compaction_psi),
    );
  }

  if (conditions.spacing_plants_per_sq_ft !== undefined) {
    m *= interpolate(species.modifiers.spacing_plants_per_sq_ft, conditions.spacing_plants_per_sq_ft);
  }

  if (species.modifiers.soil_moisture_pct_fc && conditions.soil_moisture_pct_fc !== undefined) {
    m *= interpolate(species.modifiers.soil_moisture_pct_fc, conditions.soil_moisture_pct_fc);
  }

  if (species.modifiers.temperature_f && conditions.avg_high_f !== undefined) {
    m *= interpolate(species.modifiers.temperature_f, conditions.avg_high_f);
  }

  if (species.modifiers.soil_temperature_f && conditions.soil_temp_f !== undefined) {
    m *= interpolate(species.modifiers.soil_temperature_f, conditions.soil_temp_f);
  }

  if (species.modifiers.photoperiod_h && conditions.photoperiod_h !== undefined) {
    m *= interpolate(species.modifiers.photoperiod_h, conditions.photoperiod_h);
  }

  return m;
}

/**
 * Expected total yield per plant given species and growing conditions.
 *
 * Formula: baseline × modifierProduct × survival
 */
export function computePlantYield(species: PlantSpecies, conditions: YieldConditions): number {
  return species.baseline_lbs_per_plant * computeModifierProduct(species, conditions) * survivalRate(species);
}
