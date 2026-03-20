/**
 * Labor Schedule Calculator
 *
 * Combines LifecycleSpec data with a production plan to produce
 * a computable weekly labor schedule.
 */

import { LifecycleSpec, LifecycleActivity, ProcessingActivity } from '../types/LifecycleSpec';
import { CropPlanting } from './ProductionTimeline';
import { resolveHarvestStrategy } from './strategyResolver';

const MS_PER_DAY = 86_400_000;

// ── Output Types ────────────────────────────────────────────────────────────

export interface ScheduledTask {
  date: Date;
  species_id: string;
  display_group: string;
  activity_id: string;
  activity_name: string;
  task_type: string;
  plant_count: number;
  duration_minutes: number;       // (per_plant * count) + fixed
  equipment: string[];
  skill_level: string;
  labor_type: string;
  instructions?: string;
  priority: number;
}

export interface WeeklyLabor {
  week_start: Date;
  tasks: ScheduledTask[];
  total_minutes: number;
  equipment_needed: string[];     // Deduplicated across all tasks this week
}

// ── Core Functions ──────────────────────────────────────────────────────────

/** Compute total duration for an activity given a plant count. */
function computeDuration(activity: LifecycleActivity, plant_count: number): number {
  if (activity.batch_size) {
    const batches = Math.ceil(plant_count / activity.batch_size);
    return (activity.duration_minutes_per_plant * plant_count) +
           (activity.duration_minutes_fixed * batches);
  }
  return (activity.duration_minutes_per_plant * plant_count) +
         activity.duration_minutes_fixed;
}

/** Expand a single activity into concrete dated ScheduledTasks. */
function expandActivity(
  activity: LifecycleActivity,
  planting: CropPlanting,
  planting_date: Date,
  season_end: Date,
  kill_temp_date?: Date,
): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];
  const duration = computeDuration(activity, planting.plant_count);

  if (activity.trigger.type === 'growth_stage') {
    // Growth-stage triggers produce a single task at season end (approximation).
    // The real trigger comes from the ledger at runtime.
    tasks.push(buildTask(season_end, activity, planting, duration));
    return tasks;
  }

  if (activity.trigger.type === 'harvest_accumulated') {
    // Processing triggers are handled separately by expandProcessing.
    return tasks;
  }

  // Only days_after_planting and growth_stage triggers produce dated tasks for now.
  // condition and observation triggers are evaluated at runtime, not scheduled ahead.
  if (activity.trigger.type !== 'days_after_planting') {
    return tasks;
  }

  const start_date = addDays(planting_date, activity.trigger.days);

  if (!activity.recurrence) {
    tasks.push(buildTask(start_date, activity, planting, duration));
    return tasks;
  }

  // Recurring activity
  const end_date = computeEndDate(activity.recurrence.end_condition, activity.recurrence.end_value, planting_date, season_end, kill_temp_date);
  const max_iterations = (activity.recurrence.end_condition === 'max_cuts' && activity.recurrence.end_value !== undefined)
    ? activity.recurrence.end_value
    : Infinity;
  let current = new Date(start_date);
  let count = 0;

  while (current <= end_date && count < max_iterations) {
    tasks.push(buildTask(new Date(current), activity, planting, duration));
    current = addDays(current, activity.recurrence.interval_days);
    count++;
  }

  return tasks;
}

/** Expand processing activities based on total expected harvest. */
function expandProcessing(
  processing: ProcessingActivity,
  total_harvest_lbs: number,
  harvest_end_date: Date,
  planting: CropPlanting,
): ScheduledTask[] {
  if (total_harvest_lbs <= 0) return [];

  const batch_count = Math.ceil(total_harvest_lbs / processing.input_lbs_per_batch);
  const tasks: ScheduledTask[] = [];

  // Schedule batches weekly starting from harvest end
  for (let i = 0; i < batch_count; i++) {
    const date = addDays(harvest_end_date, i * 7);
    tasks.push({
      date,
      species_id: planting.species.id,
      display_group: planting.display_group,
      activity_id: processing.activity_id,
      activity_name: processing.name,
      task_type: 'process',
      plant_count: planting.plant_count,
      duration_minutes: processing.duration_minutes_per_batch,
      equipment: processing.equipment,
      skill_level: processing.skill_level,
      labor_type: 'manual',
      instructions: processing.instructions,
      priority: 8,
    });
  }

  return tasks;
}

// ── Orchestrator ────────────────────────────────────────────────────────────

/** Build a complete weekly labor schedule from a production plan and lifecycle specs. */
export function buildLaborSchedule(
  plan: CropPlanting[],
  specs: Map<string, LifecycleSpec>,
  season_start: Date,
  season_end: Date,
): WeeklyLabor[] {
  const all_tasks: ScheduledTask[] = [];

  for (const planting of plan) {
    const spec = specs.get(planting.species.id);
    if (!spec) continue;

    const planting_date = new Date(planting.planting_date);
    const kill_temp_date = estimateKillDate(planting.species.layout?.kill_temp_f, season_end);

    for (const activity of spec.activities) {
      all_tasks.push(...expandActivity(activity, planting, planting_date, season_end, kill_temp_date));
    }

    if (spec.processing) {
      const strategy = resolveHarvestStrategy(planting.harvest_strategy_id, planting.species);
      const baseline = strategy?.baseline_lbs_per_plant ?? 0;
      const total_lbs = baseline *
                         planting.species.germination_rate *
                         planting.species.establishment_rate *
                         planting.plant_count;
      const harvest_end = kill_temp_date ?? season_end;

      for (const proc of spec.processing) {
        all_tasks.push(...expandProcessing(proc, total_lbs, harvest_end, planting));
      }
    }
  }

  return groupByWeek(all_tasks, season_start, season_end);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function buildTask(
  date: Date,
  activity: LifecycleActivity,
  planting: CropPlanting,
  duration: number,
): ScheduledTask {
  return {
    date,
    species_id: planting.species.id,
    display_group: planting.display_group,
    activity_id: activity.activity_id,
    activity_name: activity.name,
    task_type: activity.task_type,
    plant_count: planting.plant_count,
    duration_minutes: duration,
    equipment: activity.equipment,
    skill_level: activity.skill_level,
    labor_type: activity.labor_type,
    instructions: activity.instructions,
    priority: activity.priority,
  };
}

function computeEndDate(
  condition: string,
  value: number | undefined,
  planting_date: Date,
  season_end: Date,
  kill_temp_date?: Date,
): Date {
  let end: Date;
  switch (condition) {
    case 'frost':
      end = kill_temp_date ?? season_end;
      break;
    case 'days_after_planting':
      end = value !== undefined ? addDays(planting_date, value) : season_end;
      break;
    case 'max_cuts':
    case 'bolt':
    case 'season_end':
    default:
      end = season_end;
      break;
  }
  // Never schedule past frost kill
  if (kill_temp_date && kill_temp_date < end) return kill_temp_date;
  return end;
}

/** Rough estimate: Grand Rapids avg first frost Sep 29. */
function estimateKillDate(kill_temp_f: number | undefined, season_end: Date): Date | undefined {
  if (kill_temp_f === undefined) return undefined;
  // Tender crops (kill >= 33F): die at first frost ~Sep 29
  if (kill_temp_f >= 33) return new Date('2025-09-29');
  // Semi-hardy (kill 25-32F): die ~Oct 15
  if (kill_temp_f >= 25) return new Date('2025-10-15');
  // Hardy (kill < 25F): survive to season end
  return season_end;
}

function groupByWeek(tasks: ScheduledTask[], season_start: Date, season_end: Date): WeeklyLabor[] {
  const weeks: WeeklyLabor[] = [];
  const earliest = new Date(Math.min(
    season_start.getTime(),
    ...tasks.map(t => t.date.getTime()),
  ));

  // Start from 10 weeks before season (indoor seed start)
  const schedule_start = addDays(earliest, -7);
  const schedule_end = addDays(season_end, 28); // 4 weeks post-season for processing
  let current = new Date(schedule_start);

  while (current <= schedule_end) {
    const week_end = addDays(current, 7);
    const week_tasks = tasks.filter(t => t.date >= current && t.date < week_end);

    if (week_tasks.length > 0) {
      const equipment_set = new Set<string>();
      for (const t of week_tasks) {
        for (const e of t.equipment) equipment_set.add(e);
      }

      weeks.push({
        week_start: new Date(current),
        tasks: week_tasks,
        total_minutes: week_tasks.reduce((sum, t) => sum + t.duration_minutes, 0),
        equipment_needed: [...equipment_set].sort(),
      });
    }

    current = week_end;
  }

  return weeks;
}
