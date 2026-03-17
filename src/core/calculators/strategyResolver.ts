/**
 * Resolve a HarvestStrategy for a planting.
 *
 * Lookup order:
 * 1. Explicit harvest_strategy_id on the planting
 * 2. Default mapping from species_id → strategy_id
 * 3. null (companion plants with no harvest)
 */

import type { PlantSpecies } from '../types';
import type { HarvestStrategy } from '../types/HarvestStrategy';
import { HARVEST_STRATEGIES, DEFAULT_HARVEST_STRATEGY } from '../data/harvestStrategies';

export function resolveHarvestStrategy(
  harvest_strategy_id: string | undefined,
  species: PlantSpecies,
): HarvestStrategy | null {
  const id = harvest_strategy_id ?? DEFAULT_HARVEST_STRATEGY[species.id];
  if (!id) return null;
  return HARVEST_STRATEGIES.get(id) ?? null;
}
