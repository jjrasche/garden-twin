/**
 * Extract harvest and labor data from simulation snapshots.
 *
 * Shared between ProfitTimeline (UI) and integration tests.
 * Avoids duplicating the same extraction loops in multiple places.
 */

import type { DaySnapshot } from '../engine/simulate';
import type { GardenState } from '../types/GardenState';
import { computeAreaFractions } from './Profitability';

/** Aggregate harvest_ready event lbs by species across all snapshots. */
export function extractHarvestLbs(snapshots: DaySnapshot[]): Map<string, number> {
  const harvestLbs = new Map<string, number>();
  for (const snap of snapshots) {
    for (const event of snap.events) {
      if (event.type !== 'harvest_ready') continue;
      const plant = snap.plants.find(p => p.plant_id === event.plant_id);
      if (!plant) continue;
      harvestLbs.set(plant.species_id, (harvestLbs.get(plant.species_id) ?? 0) + event.accumulated_lbs);
    }
  }
  return harvestLbs;
}

/** Aggregate task labor minutes into hours by species across all snapshots. */
export function extractLaborHours(snapshots: DaySnapshot[]): Map<string, number> {
  const laborHours = new Map<string, number>();
  for (const snap of snapshots) {
    for (const task of snap.tasks ?? []) {
      const speciesId = task.parameters?.species_id as string | undefined;
      if (!speciesId) continue;
      const minutes = task.estimated_duration_minutes ?? 0;
      laborHours.set(speciesId, (laborHours.get(speciesId) ?? 0) + minutes / 60);
    }
  }
  return laborHours;
}

/** Compute species area fractions from gardenState plant subcell occupancy. */
export function extractAreaFractions(gardenState: GardenState | null): Map<string, number> {
  if (!gardenState) return new Map();
  const subcellCounts = new Map<string, number>();
  for (const plant of gardenState.plants) {
    subcellCounts.set(plant.species_id, (subcellCounts.get(plant.species_id) ?? 0) + plant.occupied_subcells.length);
  }
  return computeAreaFractions(subcellCounts);
}
