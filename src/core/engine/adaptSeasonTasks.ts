/**
 * Adapt SeasonTask[] (hand-authored 2026 data) into Task[] (unified schema).
 *
 * SeasonTask is a planning-oriented format with tiers, fatigue types, and
 * recurrence. Task is the operational schema with targets, assignments, and
 * status tracking. This adapter bridges the two.
 *
 * Recurrence expansion: a recurring SeasonTask produces one Task instance
 * per interval from target_date through end_date.
 */

import type { Task, TaskType } from '../types/Task';
import type { SeasonTask, TaskCategory } from '../data/season-tasks-2026';

/** Convert all SeasonTasks into Task[], expanding recurrences. */
export function adaptSeasonTasks(seasonTasks: SeasonTask[]): Task[] {
  const tasks: Task[] = [];
  for (const st of seasonTasks) {
    if (st.recurrence) {
      tasks.push(...expandRecurrence(st));
    } else {
      tasks.push(adaptOne(st, st.target_date));
    }
  }
  return tasks;
}

function expandRecurrence(st: SeasonTask): Task[] {
  const tasks: Task[] = [];
  const start = new Date(st.target_date);
  const end = new Date(st.recurrence!.end_date);
  const interval = st.recurrence!.interval_days;

  const day = new Date(start);
  let instance = 0;
  while (day <= end) {
    tasks.push(adaptOne(st, day.toISOString().slice(0, 10), instance));
    day.setDate(day.getDate() + interval);
    instance++;
  }
  return tasks;
}

function adaptOne(st: SeasonTask, date: string, instance?: number): Task {
  const suffix = instance !== undefined ? `_${instance}` : '';
  return {
    task_id: `season_${st.id}${suffix}`,
    type: mapCategoryToTaskType(st.category, st.name),
    target: st.species_id
      ? { target_type: 'plant' as const, plant_id: st.species_id }
      : resolveTarget(st),
    parameters: {
      season_task_id: st.id,
      name: st.name,
      tier: st.tier,
      fatigue_type: st.fatigue_type,
      equipment: st.equipment,
      plant_count: st.plant_count,
      notes: st.notes,
      depends_on: st.depends_on,
    },
    created_at: new Date().toISOString(),
    priority: mapCategoryToPriority(st.category),
    due_by: `${date}T23:59:59Z`,
    labor_type: 'manual',
    estimated_duration_minutes: st.estimated_minutes,
    status: 'queued',
    generated_by_rule: `season_2026:${st.category}`,
  };
}

function resolveTarget(st: SeasonTask): Task['target'] {
  if (st.category === 'infrastructure' || st.category === 'deterrence') {
    return { target_type: 'infrastructure' as const, infrastructure_id: st.id };
  }
  return { target_type: 'garden' as const };
}

function mapCategoryToTaskType(category: TaskCategory, name: string): TaskType {
  const map: Record<TaskCategory, TaskType> = {
    infrastructure: 'build',
    seed_starting: 'prepare',
    deterrence: 'build',
    planting: 'plant',
    maintenance: 'prune',
    harvest: 'harvest',
    processing: 'prepare',
    cleanup: 'prepare',
  };
  // Refine based on name keywords
  const lower = name.toLowerCase();
  if (lower.includes('water')) return 'water';
  if (lower.includes('weed')) return 'weed';
  if (lower.includes('hill')) return 'hill';
  if (lower.includes('thin')) return 'thin';
  if (lower.includes('sow') || lower.includes('seed')) return 'sow';
  if (lower.includes('mulch')) return 'mulch';
  if (lower.includes('fertiliz')) return 'fertilize';
  if (lower.includes('inspect')) return 'inspect';
  if (lower.includes('net')) return 'net';
  if (lower.includes('trap')) return 'trap';
  if (lower.includes('stake') || lower.includes('trellis')) return 'stake';
  if (lower.includes('procure') || lower.includes('buy') || lower.includes('order')) return 'procure';
  return map[category];
}

function mapCategoryToPriority(category: TaskCategory): number {
  const map: Record<TaskCategory, number> = {
    infrastructure: 7,
    seed_starting: 8,
    deterrence: 6,
    planting: 9,
    maintenance: 5,
    harvest: 9,
    processing: 6,
    cleanup: 3,
  };
  return map[category];
}
