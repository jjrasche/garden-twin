/**
 * Projected inventory — what's available to harvest on a given date.
 *
 * Reads DaySnapshot[] from simulation and aggregates harvestable plants
 * by species. This is the data source for customer-facing availability
 * and the order → task pipeline.
 */

import type { DaySnapshot } from '../engine/simulate';

// ── Types ───────────────────────────────────────────────────────────────────

export interface AvailableSpecies {
  species_id: string;
  available_lbs: number;
  harvestable_plant_count: number;
  total_plant_count: number;
}

export interface WeekForecast {
  date: Date;
  species: AvailableSpecies[];
  total_available_lbs: number;
}

// ── Core Functions ──────────────────────────────────────────────────────────

/** Find the snapshot closest to (but not after) the target date. */
function findNearestSnapshot(snapshots: DaySnapshot[], target: Date): DaySnapshot | null {
  let best: DaySnapshot | null = null;
  for (const snap of snapshots) {
    if (snap.date <= target) {
      if (!best || snap.date > best.date) best = snap;
    }
  }
  return best;
}

/**
 * Get available harvest on a specific date.
 *
 * Returns one entry per species with harvestable plants, aggregating
 * accumulated_lbs across all harvestable plants of that species.
 */
export function getAvailableHarvest(
  snapshots: DaySnapshot[],
  date: Date,
): AvailableSpecies[] {
  const snap = findNearestSnapshot(snapshots, date);
  if (!snap) return [];

  const bySpecies = new Map<string, { lbs: number; harvestable: number; total: number }>();

  for (const plant of snap.plants) {
    const harvestAccum = bySpecies.get(plant.species_id) ?? { lbs: 0, harvestable: 0, total: 0 };
    harvestAccum.total++;
    if (plant.is_harvestable) {
      harvestAccum.harvestable++;
      harvestAccum.lbs += plant.accumulated_lbs;
    }
    bySpecies.set(plant.species_id, harvestAccum);
  }

  const results: AvailableSpecies[] = [];
  for (const [speciesId, harvestAccum] of bySpecies) {
    if (harvestAccum.harvestable === 0) continue;
    results.push({
      species_id: speciesId,
      available_lbs: harvestAccum.lbs,
      harvestable_plant_count: harvestAccum.harvestable,
      total_plant_count: harvestAccum.total,
    });
  }

  return results.sort((a, b) => b.available_lbs - a.available_lbs);
}

/**
 * Get weekly inventory forecast for the next N weeks.
 *
 * Returns one WeekForecast per week starting from startDate.
 * Each entry shows what species are harvestable and estimated lbs.
 */
export function getInventoryForecast(
  snapshots: DaySnapshot[],
  startDate: Date,
  weeks: number,
): WeekForecast[] {
  const forecasts: WeekForecast[] = [];

  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

  for (let w = 0; w < weeks; w++) {
    const weekDate = new Date(startDate.getTime() + w * MS_PER_WEEK);

    const species = getAvailableHarvest(snapshots, weekDate);
    const totalLbs = species.reduce((sum, sp) => sum + sp.available_lbs, 0);

    forecasts.push({
      date: weekDate,
      species,
      total_available_lbs: totalLbs,
    });
  }

  return forecasts;
}
