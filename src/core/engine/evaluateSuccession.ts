/**
 * Succession evaluation — detects when a predecessor crop is done and
 * conditions are right to plant the successor in the same zone.
 *
 * Leaf function: evaluates trigger against predecessor PlantState[].
 * Called once per day in the simulation loop after harvest.
 */

import type { PlantState } from '../types/PlantState';
import type { PlantInstance } from '../types/GardenState';
import type { ConditionsResolver } from '../environment/types';
import type { SuccessionTrigger } from '../types/Succession';
import { evaluateConditionGate } from '../types/Succession';
import type { SuccessorSpec, DisplayGroup } from '../calculators/ProductionTimeline';
import type { SunZone } from '../calculators/growthMath';

/** Track an active succession that hasn't fired yet. */
export interface ActiveSuccession {
  predecessorPlantIds: Set<string>;
  successor: SuccessorSpec;
  zone: SunZone;
  zone_id: string;
  triggered: boolean;
  plantingDate?: Date;
}

/** Evaluate whether a succession trigger has fired. */
export function evaluateSuccessionTrigger(
  trigger: SuccessionTrigger,
  predecessorPlants: PlantState[],
  conditions: Record<string, number>,
): boolean {
  if (predecessorPlants.length === 0) return false;

  // Count plants that have freed their space: dead OR pulled (bolted + cleared)
  const doneCount = predecessorPlants.filter(p => p.lifecycle === 'dead' || p.lifecycle === 'pulled').length;
  const donePct = doneCount / predecessorPlants.length;
  if (donePct < trigger.predecessor_death_pct) return false;

  if (trigger.conditions) {
    for (const gate of trigger.conditions) {
      if (!evaluateConditionGate(gate, conditions)) return false;
    }
  }

  return true;
}

/** Create PlantInstances for a successor crop. */
export function materializeSuccessor(
  successor: SuccessorSpec,
  plantingDate: Date,
  zone: SunZone,
): PlantInstance[] {
  const baseDate = new Date(plantingDate);
  const stagger = successor.stagger_days ?? 0;
  const instances: PlantInstance[] = [];

  for (let i = 0; i < successor.plant_count; i++) {
    const offsetDays = stagger > 0
      ? Math.floor(i * stagger / successor.plant_count)
      : 0;
    const date = new Date(baseDate);
    date.setDate(date.getDate() + offsetDays);
    const dateStr = date.toISOString().slice(0, 10);

    instances.push({
      plant_id: `${successor.species.id}_${successor.display_group}_succ_${dateStr}_${i}`,
      species_id: successor.species.id,
      root_subcell_id: `zone_${zone}`,
      occupied_subcells: [],
      planted_date: dateStr,
      current_stage: 'seed',
      accumulated_gdd: 0,
      last_observed: new Date().toISOString(),
      harvest_strategy_id: successor.harvest_strategy_id,
    });
  }

  return instances;
}
