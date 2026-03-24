/**
 * Operational Planner — orchestrator that generates Task[] for a date.
 *
 * Three task sources, merged and deduplicated:
 *   1. Lifecycle — plant-stage triggers from LifecycleSpec activities
 *   2. Season — static calendar tasks (infrastructure, procurement, prep)
 *   3. Rules — condition-based reactive tasks (water when dry, harvest when ready)
 *
 * Pipeline:
 *   1. Lifecycle: group plants by species, evaluate activity triggers
 *   2. Season: filter pre-expanded season tasks to this date
 *   3. Rules: evaluate enabled rules against plant state + conditions
 *   4. Merge all candidates, deduplicate against existing tasks
 */

import type { PlantSpecies } from '../types/PlantSpecies';
import type { PlantState } from '../types/PlantState';
import type { Task } from '../types/Task';
import { isDuplicateTask } from '../types/Task';
import type { TaskRule } from '../types/Rules';
import type { LifecycleSpec } from '../types/LifecycleSpec';
import type { ConditionsResolver } from '../environment/types';
import { generateTasksFromLifecycle } from './generateTasksFromLifecycle';
import { generateTasksFromRules } from './generateTasksFromRules';

export interface PlannerInput {
  plants: PlantState[];
  date: Date;
  env: ConditionsResolver;
  catalog: Map<string, PlantSpecies>;
  lifecycles: Map<string, LifecycleSpec>;
  existingTasks: Task[];
  seasonTaskIndex?: Map<string, Task[]>;
  rules?: TaskRule[];
}

export interface PlannerResult {
  newTasks: Task[];
  totalEvaluated: number;
}

/** Generate new tasks for a single date from all sources, deduplicating against existing. */
export function planDay(input: PlannerInput): PlannerResult {
  const { plants, date, env, catalog, lifecycles, existingTasks, seasonTaskIndex, rules } = input;
  const candidates: Task[] = [];

  // Source 1: Lifecycle-driven tasks (plant stage triggers)
  const groups = groupPlantsBySpecies(plants);
  for (const [species_id, speciesPlants] of groups) {
    const species = catalog.get(species_id);
    const lifecycle = lifecycles.get(species_id);
    if (!species || !lifecycle) continue;

    candidates.push(...generateTasksFromLifecycle(lifecycle, speciesPlants, species, date, env, existingTasks));
  }

  // Source 2: Season calendar tasks (O(1) lookup from pre-built index)
  if (seasonTaskIndex) {
    const dateKey = date.toISOString().slice(0, 10);
    const todaysTasks = seasonTaskIndex.get(dateKey);
    if (todaysTasks) {
      candidates.push(...todaysTasks);
    }
  }

  // Source 3: Rule-based reactive tasks
  if (rules && rules.length > 0) {
    candidates.push(...generateTasksFromRules(rules, plants, date, env, existingTasks));
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
    if (plant.lifecycle === 'dead' || plant.lifecycle === 'senescent' || plant.lifecycle === 'pulled') continue;
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
