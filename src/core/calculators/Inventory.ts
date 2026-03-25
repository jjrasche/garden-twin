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
  avg_quality_score: number;
  min_quality_score: number;
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
 * With quality-decline harvest, biomass sits on plants as inventory.
 * Plants with is_harvestable = true have enough biomass to pick.
 * Quality score indicates produce value.
 */
export function getAvailableHarvest(
  snapshots: DaySnapshot[],
  date: Date,
): AvailableSpecies[] {
  const snap = findNearestSnapshot(snapshots, date);
  if (!snap) return [];

  const bySpecies = new Map<string, {
    lbs: number;
    harvestable: number;
    total: number;
    qualitySum: number;
    qualityMin: number;
  }>();

  for (const plant of snap.plants) {
    const isAlive = plant.lifecycle === 'growing' || plant.lifecycle === 'stressed';
    if (!isAlive) continue;

    const accum = bySpecies.get(plant.species_id) ?? {
      lbs: 0, harvestable: 0, total: 0, qualitySum: 0, qualityMin: 1.0,
    };
    accum.total++;

    if (plant.is_harvestable && plant.accumulated_lbs > 0.01) {
      accum.harvestable++;
      accum.lbs += plant.accumulated_lbs;
      const quality = plant.quality_score ?? 0;
      accum.qualitySum += quality;
      accum.qualityMin = Math.min(accum.qualityMin, quality);
    }
    bySpecies.set(plant.species_id, accum);
  }

  const results: AvailableSpecies[] = [];
  for (const [speciesId, accum] of bySpecies) {
    if (accum.harvestable === 0) continue;
    results.push({
      species_id: speciesId,
      available_lbs: accum.lbs,
      harvestable_plant_count: accum.harvestable,
      total_plant_count: accum.total,
      avg_quality_score: accum.harvestable > 0 ? accum.qualitySum / accum.harvestable : 0,
      min_quality_score: accum.qualityMin,
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
