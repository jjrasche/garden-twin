/**
 * Extract harvest and labor data from simulation snapshots.
 *
 * Shared between ProfitTimeline (UI) and integration tests.
 * Avoids duplicating the same extraction loops in multiple places.
 */

import type { DaySnapshot } from '../engine/simulate';
import type { GardenState } from '../types/GardenState';
import { computeAreaFractions } from './Profitability';

/**
 * Aggregate projected sellable lbs by species across all snapshots.
 *
 * Three-tier extraction (first non-empty source wins):
 *   1. 'harvested' events — quality-decline forced harvest (actual picks)
 *   2. Peak accumulated biomass — projected inventory from demand-driven model.
 *      Tracks the highest accumulated_lbs per plant across the season, representing
 *      the sellable ceiling if all produce is ordered.
 *   3. 'harvest_ready' events — legacy auto-harvest simulations (backward compat)
 */
export function extractHarvestLbs(snapshots: DaySnapshot[]): Map<string, number> {
  const harvestedLbs = new Map<string, number>();
  const peakBiomass = new Map<string, number>(); // plant_id → peak lbs
  const plantSpecies = new Map<string, string>(); // plant_id → species_id

  for (const snap of snapshots) {
    // Track harvest events
    for (const event of snap.events) {
      if (event.type === 'harvested') {
        const plant = snap.plants.find(p => p.plant_id === event.plant_id);
        const speciesId = plant?.species_id ?? '';
        if (speciesId) harvestedLbs.set(speciesId, (harvestedLbs.get(speciesId) ?? 0) + event.harvested_lbs);
      }
    }

    // Track peak biomass per plant (for demand-driven projection)
    for (const plant of snap.plants) {
      if (!plant.is_harvestable || plant.accumulated_lbs <= 0) continue;
      plantSpecies.set(plant.plant_id, plant.species_id);
      const current = peakBiomass.get(plant.plant_id) ?? 0;
      if (plant.accumulated_lbs > current) {
        peakBiomass.set(plant.plant_id, plant.accumulated_lbs);
      }
    }
  }

  // Combine harvested events + peak biomass for complete projected revenue.
  // Harvested events capture quality-decline forced picks (produce already picked).
  // Peak biomass captures produce still on plants (available for orders).
  const projectedLbs = new Map<string, number>();
  for (const [speciesId, lbs] of harvestedLbs) {
    projectedLbs.set(speciesId, lbs);
  }
  for (const [plantId, peakLbs] of peakBiomass) {
    const speciesId = plantSpecies.get(plantId);
    if (!speciesId) continue;
    projectedLbs.set(speciesId, (projectedLbs.get(speciesId) ?? 0) + peakLbs);
  }

  if (projectedLbs.size > 0) return projectedLbs;

  // Fallback: legacy 'harvest_ready' events (old auto-harvest simulations)
  for (const snap of snapshots) {
    for (const event of snap.events) {
      if (event.type !== 'harvest_ready') continue;
      const plant = snap.plants.find(p => p.plant_id === event.plant_id);
      if (!plant) continue;
      projectedLbs.set(plant.species_id, (projectedLbs.get(plant.species_id) ?? 0) + event.accumulated_lbs);
    }
  }
  return projectedLbs;
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
