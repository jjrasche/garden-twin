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
  completedTasks?: Task[],
): Task[] {
  const alive = plants.filter(p => p.lifecycle === 'growing' || p.lifecycle === 'stressed');
  if (alive.length === 0) return [];

  const tasks: Task[] = [];

  for (const activity of lifecycle.activities) {
    if (!shouldFireActivity(activity, alive, date, env, species, completedTasks)) continue;

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
  completedTasks?: Task[],
): boolean {
  const representative = findRepresentative(plants);
  if (isRecurrenceExpired(activity, representative, date, env, species)) return false;

  // Non-recurring stage-triggered activities (thin, hill, pull_dead) are one-shot:
  // if already completed for this species, don't fire again.
  // plant_flag triggers (harvest) are self-gating — the flag resets on resolution,
  // so they naturally stop firing until the condition re-triggers.
  if (!activity.recurrence
    && activity.trigger.type === 'growth_stage') {
    if (isAlreadyCompleted(activity.activity_id, species.id, completedTasks)) return false;
  }

  const recurrenceInterval = activity.recurrence?.interval_days;
  return plants.some(plant => evaluateTrigger(activity.trigger, plant, date, env, recurrenceInterval));
}

/** Check if a one-shot activity was already completed for this species. */
function isAlreadyCompleted(
  activityId: string,
  speciesId: string,
  completedTasks?: Task[],
): boolean {
  if (!completedTasks) return false;
  return completedTasks.some(t =>
    t.status === 'completed'
    && t.generated_by_rule === `lifecycle:${activityId}`
    && t.parameters?.species_id === speciesId,
  );
}

/** Most advanced plant in the group — earliest planting date, highest cut count. */
function findRepresentative(plants: PlantState[]): PlantState {
  return plants.reduce((best, p) =>
    p.planted_date < best.planted_date || p.cut_number > best.cut_number ? p : best,
  );
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
