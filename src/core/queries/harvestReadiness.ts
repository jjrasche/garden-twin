/**
 * Harvest readiness queries — generates Tasks from GrowthLedger state.
 */

import { Task, createTaskId, isDuplicateTask } from '../types/Task';
import { PlantSpecies } from '../types/PlantSpecies';
import { EnvironmentSource } from '../environment/types';
import { GrowthLedger, advanceLedger } from '../calculators/GrowthLedger';
import { MS_PER_DAY } from '../calculators/growthMath';

/** Generate harvest tasks for plants where is_ready_to_harvest is true. */
export function generateHarvestTasks(
  ledger: GrowthLedger,
  existingTasks: Task[],
): Task[] {
  const tasks: Task[] = [];
  const now = new Date().toISOString();

  for (const [plant_id, entry] of ledger) {
    if (!entry.is_ready_to_harvest || entry.is_dead) continue;

    const candidate = {
      type: 'harvest' as const,
      target: { target_type: 'plant' as const, plant_id },
    };

    if (isDuplicateTask(candidate, existingTasks)) continue;

    tasks.push({
      task_id: createTaskId('harvest'),
      type: 'harvest',
      target: { target_type: 'plant', plant_id },
      parameters: {
        estimated_lbs: entry.accumulated_lbs,
        cut_number: entry.cut_number,
      },
      created_at: now,
      priority: 7, // harvest is time-sensitive
      status: 'queued',
    });
  }

  return tasks;
}

/** Project when each living plant will next reach harvest threshold. */
export function estimateNextHarvestDates(
  ledger: GrowthLedger,
  env: EnvironmentSource,
  speciesMap: Map<string, PlantSpecies>,
  maxDaysAhead: number = 90,
): Map<string, Date> {
  const result = new Map<string, Date>();
  const today = new Date();

  for (const [plant_id, entry] of ledger) {
    if (entry.is_dead || entry.is_ready_to_harvest) continue;

    // Scan forward day-by-day to find when threshold is reached
    for (let d = 1; d <= maxDaysAhead; d++) {
      const probe_date = new Date(today.getTime() + d * MS_PER_DAY);
      const probed = advanceLedger(
        new Map([[plant_id, entry]]),
        probe_date, env, speciesMap,
      );
      const probed_entry = probed.get(plant_id);
      if (probed_entry?.is_ready_to_harvest) {
        result.set(plant_id, probe_date);
        break;
      }
      if (probed_entry?.is_dead) break;
    }
  }

  return result;
}
