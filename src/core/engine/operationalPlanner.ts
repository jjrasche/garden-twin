/**
 * Operational Planner — orchestrator that generates Task[] for a date.
 *
 * Consumes GardenState (via PlantState[]) + LifecycleSpecs + ConditionsResolver.
 * Delegates to generateTasksFromLifecycle for biology-driven tasks.
 * Applies deduplication against existing tasks to prevent duplicates.
 *
 * Pipeline:
 *   1. Group plants by species_id
 *   2. For each species with a lifecycle, evaluate activity triggers
 *   3. Collect all generated tasks
 *   4. Deduplicate against existing (incomplete) tasks
 */

import type { PlantSpecies } from '../types/PlantSpecies';
import type { PlantState } from '../types/PlantState';
import type { Task } from '../types/Task';
import { isDuplicateTask } from '../types/Task';
import type { LifecycleSpec } from '../types/LifecycleSpec';
import type { ConditionsResolver } from '../environment/types';
import { generateTasksFromLifecycle } from './generateTasksFromLifecycle';

export interface PlannerInput {
  plants: PlantState[];
  date: Date;
  env: ConditionsResolver;
  catalog: Map<string, PlantSpecies>;
  lifecycles: Map<string, LifecycleSpec>;
  existingTasks: Task[];
}

export interface PlannerResult {
  newTasks: Task[];
  totalEvaluated: number;
}

/** Generate new tasks for a single date, deduplicating against existing. */
export function planDay(input: PlannerInput): PlannerResult {
  const { plants, date, env, catalog, lifecycles, existingTasks } = input;

  const groups = groupPlantsBySpecies(plants);
  const candidates: Task[] = [];

  for (const [species_id, speciesPlants] of groups) {
    const species = catalog.get(species_id);
    const lifecycle = lifecycles.get(species_id);
    if (!species || !lifecycle) continue;

    const tasks = generateTasksFromLifecycle(lifecycle, speciesPlants, species, date, env);
    candidates.push(...tasks);
  }

  const newTasks = deduplicateTasks(candidates, existingTasks);

  return {
    newTasks,
    totalEvaluated: candidates.length,
  };
}

function groupPlantsBySpecies(plants: PlantState[]): Map<string, PlantState[]> {
  const groups = new Map<string, PlantState[]>();
  for (const plant of plants) {
    if (plant.is_dead || plant.stage === 'done') continue;
    const group = groups.get(plant.species_id);
    if (group) {
      group.push(plant);
    } else {
      groups.set(plant.species_id, [plant]);
    }
  }
  return groups;
}

function deduplicateTasks(candidates: Task[], existing: Task[]): Task[] {
  return candidates.filter(candidate => !isDuplicateTask(candidate, existing));
}
