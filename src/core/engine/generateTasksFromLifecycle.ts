/**
 * Generate Task[] from LifecycleSpec activities whose triggers fire on a given date.
 *
 * Concept function: one species' lifecycle + its plants + one date -> Task[].
 * Handles recurrence end-condition checks and cooldown deduplication.
 */

import type { LifecycleSpec, LifecycleActivity, Recurrence } from '../types/LifecycleSpec';
import type { PlantSpecies } from '../types/PlantSpecies';
import type { PlantState } from '../types/PlantState';
import type { Task, TaskType } from '../types/Task';
import { createTaskId } from '../types/Task';
import type { ConditionsResolver } from '../environment/types';
import { evaluateTrigger } from './evaluateTrigger';

/** Generate tasks for one species' lifecycle on a single date. */
export function generateTasksFromLifecycle(
  lifecycle: LifecycleSpec,
  plants: PlantState[],
  species: PlantSpecies,
  date: Date,
  env: ConditionsResolver,
): Task[] {
  const alive = plants.filter(p => p.lifecycle === 'growing' || p.lifecycle === 'stressed');
  if (alive.length === 0) return [];

  const tasks: Task[] = [];

  for (const activity of lifecycle.activities) {
    if (!shouldFireActivity(activity, alive, date, env, species)) continue;

    tasks.push(buildTask(activity, alive, date, species));
  }

  return tasks;
}

/** Check if an activity's trigger fires for any plant in the group. */
function shouldFireActivity(
  activity: LifecycleActivity,
  plants: PlantState[],
  date: Date,
  env: ConditionsResolver,
  species: PlantSpecies,
): boolean {
  if (isRecurrenceExpired(activity, plants[0]!, date, env, species)) return false;

  return plants.some(plant => evaluateTrigger(activity.trigger, plant, date, env));
}

/** Check if a recurring activity has passed its end condition. */
function isRecurrenceExpired(
  activity: LifecycleActivity,
  representative: PlantState,
  date: Date,
  env: ConditionsResolver,
  species: PlantSpecies,
): boolean {
  const recurrence = activity.recurrence;
  if (!recurrence) return false;

  switch (recurrence.end_condition) {
    case 'frost':
      return date >= env.avg_first_frost;
    case 'season_end':
      return date >= env.avg_hard_frost;
    case 'max_cuts':
      return representative.cut_number >= (recurrence.end_value ?? Infinity);
    case 'bolt':
      return representative.lifecycle === 'dead' || representative.lifecycle === 'senescent' || representative.lifecycle === 'pulled';
    case 'days_after_planting': {
      const planted = new Date(representative.planted_date);
      const elapsed = (date.getTime() - planted.getTime()) / 86_400_000;
      return elapsed > (recurrence.end_value ?? Infinity);
    }
  }
}

/** Build a concrete Task from a triggered activity. */
function buildTask(
  activity: LifecycleActivity,
  plants: PlantState[],
  date: Date,
  species: PlantSpecies,
): Task {
  const now = date.toISOString();

  return {
    task_id: createTaskId(activity.task_type as TaskType),
    type: activity.task_type as TaskType,
    target: {
      target_type: 'plant' as const,
      plant_id: plants[0]!.plant_id,
    },
    parameters: {
      species_id: species.id,
      species_name: species.name,
      activity_id: activity.activity_id,
      activity_name: activity.name,
      plant_count: plants.length,
      instructions: activity.instructions,
      equipment: activity.equipment,
    },
    created_at: now,
    priority: activity.priority ?? 5,
    due_by: now,
    labor_type: activity.labor_type,
    estimated_duration_minutes: computeDuration(activity, plants.length),
    status: 'queued',
    generated_by_rule: `lifecycle:${activity.activity_id}`,
  };
}

function computeDuration(activity: LifecycleActivity, plant_count: number): number {
  if (activity.batch_size) {
    const batches = Math.ceil(plant_count / activity.batch_size);
    return (activity.duration_minutes_per_plant * plant_count)
      + (activity.duration_minutes_fixed * batches);
  }
  return (activity.duration_minutes_per_plant * plant_count)
    + activity.duration_minutes_fixed;
}
