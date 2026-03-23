/**
 * Harvest readiness queries — generates Tasks from PlantState[].
 */

import { Task, createTaskId, isDuplicateTask } from '../types/Task';
import type { PlantSpecies } from '../types/PlantSpecies';
import type { PlantState } from '../types/PlantState';
import type { ConditionsResolver } from '../environment/types';
import { tickDay } from '../engine/tickDay';

/** Generate harvest tasks for plants where is_harvestable is true. */
export function generateHarvestTasks(
  plants: PlantState[],
  existingTasks: Task[],
): Task[] {
  const tasks: Task[] = [];
  const now = new Date().toISOString();

  for (const plant of plants) {
    if (!plant.is_harvestable || plant.lifecycle === 'dead') continue;

    const candidate = {
      type: 'harvest' as const,
      target: { target_type: 'plant' as const, plant_id: plant.plant_id },
    };

    if (isDuplicateTask(candidate, existingTasks)) continue;

    tasks.push({
      task_id: createTaskId('harvest'),
      type: 'harvest',
      target: { target_type: 'plant', plant_id: plant.plant_id },
      parameters: {
        estimated_lbs: plant.accumulated_lbs,
        cut_number: plant.cut_number,
      },
      created_at: now,
      priority: 7,
      status: 'queued',
    });
  }

  return tasks;
}

/** Project when each living plant will next reach harvest threshold. */
export function estimateNextHarvestDates(
  plants: PlantState[],
  env: ConditionsResolver,
  catalog: Map<string, PlantSpecies>,
  maxDaysAhead: number = 90,
): Map<string, Date> {
  const result = new Map<string, Date>();
  const today = new Date();

  // Filter to living, non-harvestable plants
  const candidates = plants.filter(p => (p.lifecycle === 'growing' || p.lifecycle === 'stressed') && !p.is_harvestable);
  if (candidates.length === 0) return result;

  // Scan forward day-by-day, advancing all candidates together
  let current = candidates;
  for (let d = 1; d <= maxDaysAhead; d++) {
    const probe_date = new Date(today);
    probe_date.setDate(probe_date.getDate() + d);

    const day_result = tickDay(current, probe_date, env, catalog);
    current = day_result.plants;

    // Check which plants became harvestable or died
    const still_scanning: PlantState[] = [];
    for (const plant of current) {
      if (result.has(plant.plant_id)) {
        still_scanning.push(plant);
        continue;
      }
      if (plant.is_harvestable) {
        result.set(plant.plant_id, probe_date);
      }
      if (plant.lifecycle !== 'dead' && !plant.is_harvestable) {
        still_scanning.push(plant);
      }
    }
    current = still_scanning;
    if (current.length === 0) break;
  }

  return result;
}
