/**
 * Growth Ledger — per-plant mutable growth state for operational mode.
 *
 * Tracks accumulated biomass between harvests, cut number, vigor, and
 * readiness. Uses the same accumulateGrowth() math as planning mode
 * but advances incrementally day-by-day.
 */

import { PlantSpecies, survivalRate, Observation } from '../types';
import { EnvironmentSource } from '../environment';
import { CropPlanting } from './ProductionTimeline';
import type { SunZone } from './growthMath';
import {
  MS_PER_DAY, ZONE_PHYS_Y,
  accumulateGrowth, buildCutSchedule, computeDeathDate,
  isDeadFromFrost, computeBoltSurvival, daysBetween,
} from './growthMath';
import { interpolate } from './interpolate';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlantGrowthEntry {
  plant_id: string;
  species_id: string;
  zone_physY: number;
  accumulated_lbs: number;
  last_reset_date: string;       // ISO date of last harvest or planting
  cut_number: number;            // Current cut (0 = first growth)
  vigor: number;                 // Current cut's vigor factor
  daily_potential: number;       // Calibrated daily rate (lbs/day under perfect conditions)
  harvest_threshold_lbs: number; // Ready when accumulated >= threshold
  is_ready_to_harvest: boolean;
  is_dead: boolean;
}

export type GrowthLedger = Map<string, PlantGrowthEntry>;

// ── Initialization ───────────────────────────────────────────────────────────

/** Compute the harvest threshold for a single cut (lbs per plant). */
function computeThreshold(species: PlantSpecies, vigor: number, window_days: number, daily_potential: number): number {
  return daily_potential * vigor * window_days * 0.9; // 90% of perfect to trigger readiness
}

/** Create a ledger entry for one plant in a CropPlanting group. */
function createEntryFromPlanting(
  plant_id: string, species: PlantSpecies, zone_physY: number, planting_date: string,
): PlantGrowthEntry {
  const cuts = buildCutSchedule(new Date(planting_date), species);
  const daily_potential = cuts?.daily_potential
    ?? species.baseline_lbs_per_plant / Math.max(1, species.days_to_first_harvest);
  const vigor = cuts ? cuts.vigors[0]! : 1.0;
  const window_days = species.days_to_first_harvest;
  const threshold = computeThreshold(species, vigor, window_days, daily_potential);

  return {
    plant_id,
    species_id: species.id,
    zone_physY,
    accumulated_lbs: 0,
    last_reset_date: planting_date,
    cut_number: 0,
    vigor,
    daily_potential,
    harvest_threshold_lbs: threshold,
    is_ready_to_harvest: false,
    is_dead: false,
  };
}

export function createLedgerFromPlan(plan: CropPlanting[]): GrowthLedger {
  const ledger: GrowthLedger = new Map();

  for (const planting of plan) {
    for (let i = 0; i < planting.plant_count; i++) {
      const plant_id = `${planting.species.id}_${planting.display_group}_${i}`;
      const zone_physY = ZONE_PHYS_Y[planting.zone as SunZone];
      ledger.set(plant_id, createEntryFromPlanting(
        plant_id, planting.species, zone_physY, planting.planting_date,
      ));
    }
  }

  return ledger;
}

export function createLedgerFromGardenState(
  plants: Array<{ plant_id: string; species_id: string; planted_date: string; occupied_subcells: string[] }>,
  speciesMap: Map<string, PlantSpecies>,
  physYLookup: (plant_id: string) => number,
): GrowthLedger {
  const ledger: GrowthLedger = new Map();

  for (const plant of plants) {
    const species = speciesMap.get(plant.species_id);
    if (!species) continue;

    const zone_physY = physYLookup(plant.plant_id);
    ledger.set(plant.plant_id, createEntryFromPlanting(
      plant.plant_id, species, zone_physY, plant.planted_date,
    ));
  }

  return ledger;
}

// ── Advancement ──────────────────────────────────────────────────────────────

/**
 * Advance all ledger entries to a target date.
 *
 * Pure function: returns a new ledger with accumulated growth.
 * Uses the same accumulateGrowth() as planning mode.
 */
export function advanceLedger(
  ledger: GrowthLedger,
  toDate: Date,
  env: EnvironmentSource,
  speciesMap: Map<string, PlantSpecies>,
): GrowthLedger {
  const result: GrowthLedger = new Map();

  for (const [id, entry] of ledger) {
    const species = speciesMap.get(entry.species_id);
    if (!species || entry.is_dead) {
      result.set(id, { ...entry });
      continue;
    }

    const window_start = new Date(entry.last_reset_date);
    if (toDate <= window_start) {
      result.set(id, { ...entry });
      continue;
    }

    // Check death
    if (isDeadFromFrost(species, toDate, env)) {
      result.set(id, { ...entry, is_dead: true, is_ready_to_harvest: false });
      continue;
    }

    const bolt_survival = computeBoltSurvival(species, toDate, env);
    if (bolt_survival <= 0.05) {
      result.set(id, { ...entry, is_dead: true, is_ready_to_harvest: false });
      continue;
    }

    // Check if plant has reached first harvest date
    const plant_date = new Date(entry.last_reset_date);
    if (entry.cut_number === 0) {
      const first_harvest_date = new Date(plant_date);
      first_harvest_date.setDate(first_harvest_date.getDate() + species.days_to_first_harvest);
      if (toDate < first_harvest_date && species.harvest_type !== 'continuous') {
        // Not yet at first harvest — accumulate but don't mark ready
        const accumulated = accumulateGrowth(
          species, window_start, toDate, entry.vigor,
          entry.daily_potential, entry.zone_physY, env,
        );
        result.set(id, { ...entry, accumulated_lbs: accumulated });
        continue;
      }
    }

    const accumulated = accumulateGrowth(
      species, window_start, toDate, entry.vigor,
      entry.daily_potential, entry.zone_physY, env,
    );
    const ready = accumulated >= entry.harvest_threshold_lbs;

    result.set(id, { ...entry, accumulated_lbs: accumulated, is_ready_to_harvest: ready });
  }

  return result;
}

// ── Harvest / Death Recording ────────────────────────────────────────────────

export function recordHarvest(
  ledger: GrowthLedger, plant_id: string, date: string,
  speciesMap: Map<string, PlantSpecies>, actual_lbs?: number,
): GrowthLedger {
  const result = new Map(ledger);
  const entry = result.get(plant_id);
  if (!entry) return result;

  const species = speciesMap.get(entry.species_id);
  if (!species) return result;

  const next_cut = entry.cut_number + 1;
  const cac = species.cut_and_come_again;

  // For cut-and-come-again: check if max cuts exceeded
  if (cac && next_cut >= cac.max_cuts) {
    result.set(plant_id, { ...entry, is_dead: true, is_ready_to_harvest: false });
    return result;
  }

  const vigor = cac ? interpolate(cac.cut_yield_curve, next_cut + 1) : entry.vigor;
  const window_days = cac ? cac.regrowth_days : species.days_to_first_harvest;
  const threshold = computeThreshold(species, vigor, window_days, entry.daily_potential);

  result.set(plant_id, {
    ...entry,
    accumulated_lbs: 0,
    last_reset_date: date,
    cut_number: next_cut,
    vigor,
    harvest_threshold_lbs: threshold,
    is_ready_to_harvest: false,
  });

  return result;
}

export function recordDeath(ledger: GrowthLedger, plant_id: string): GrowthLedger {
  const result = new Map(ledger);
  const entry = result.get(plant_id);
  if (!entry) return result;

  result.set(plant_id, { ...entry, is_dead: true, is_ready_to_harvest: false });
  return result;
}

// ── Observation Integration (Phase 2, Step 7) ────────────────────────────────

export function applyObservationToLedger(
  ledger: GrowthLedger, obs: Observation, speciesMap: Map<string, PlantSpecies>,
): GrowthLedger {
  if (!obs.plant_id) return ledger;

  const entry = ledger.get(obs.plant_id);
  if (!entry) return ledger;

  // Death observation: growth_stage 'done'
  if (obs.growth_stage === 'done') {
    return recordDeath(ledger, obs.plant_id);
  }

  // Harvest observation: growth_stage 'harvest'
  if (obs.growth_stage === 'harvest') {
    return recordHarvest(ledger, obs.plant_id, obs.timestamp.slice(0, 10), speciesMap);
  }

  return ledger;
}
