/**
 * Resolve a completed Task into state changes.
 *
 * Pure function: task + current plants + catalog -> updated plants + effects.
 * In simulation mode, tasks auto-resolve with assumed-perfect execution.
 * In live mode, the same function runs but observation data can override defaults.
 *
 * Task types that mutate plant state:
 *   - harvest: delegates to harvestPlant() for full exhaustion/vigor logic
 *
 * Task types that mutate conditions:
 *   - water: boosts soil moisture to 80% FC (decays over 3 days in sim)
 *
 * Task types that are labor-only (no state mutation in simulation):
 *   - thin: simulation starts with final plant count. Task exists for labor tracking.
 *   - inspect, prune, weed, build, etc.: informational
 */

import type { Task } from '../types/Task';
import type { PlantState } from '../types/PlantState';
import type { PlantSpecies } from '../types/PlantSpecies';
import { harvestPlant } from './harvestPlant';

export interface ResolutionResult {
  /** Updated plant array if the task mutated state. Undefined if no mutation. */
  plants?: PlantState[];
  /** If true, watering occurred — simulation should record a moisture boost. */
  watered?: boolean;
}

/** Apply a task's effects to plant state. Returns updated plants and effects. */
export function resolveTask(
  task: Task,
  plants: PlantState[],
  catalog: Map<string, PlantSpecies>,
): ResolutionResult {
  switch (task.type) {
    case 'harvest':
      return resolveHarvest(task, plants, catalog);
    case 'water':
      return { watered: true };
    default:
      return {};
  }
}

/**
 * Harvest: delegate to harvestPlant() which handles the full lifecycle —
 * biomass reset, cut advancement, vigor degradation from cut_yield_curve,
 * and exhaustion (max_cuts → senescent for CAC, dead for bulk).
 */
function resolveHarvest(
  task: Task,
  plants: PlantState[],
  catalog: Map<string, PlantSpecies>,
): ResolutionResult {
  const targetPlantId = task.target.target_type === 'plant'
    ? (task.target as { plant_id: string }).plant_id
    : undefined;

  if (!targetPlantId) return {};

  const targetPlant = plants.find(p => p.plant_id === targetPlantId);
  if (!targetPlant || !targetPlant.is_harvestable) return {};

  const updated = plants.map(p =>
    p.plant_id === targetPlantId
      ? harvestPlant(p, catalog)
      : p,
  );

  return { plants: updated };
}
