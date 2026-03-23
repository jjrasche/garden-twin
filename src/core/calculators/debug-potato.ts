/**
 * Debug: trace a single potato plant through 2020 to find why it dies.
 * Usage: npx tsx src/core/calculators/debug-potato.ts
 */

import { PRODUCTION_PLAN } from './ProductionTimeline';
import { createGrandRapidsHistorical } from '../environment/HistoricalSource';
import { initPlantStates } from '../engine/initPlantStates';
import { tickPlant } from '../engine/tickDay';
import { GARDEN_SPECIES_MAP } from '../data/species';
import type { PlantState } from '../types/PlantState';

const env = createGrandRapidsHistorical(2020);

// Expand just the potato planting
const potatoPlanting = PRODUCTION_PLAN.find(p => p.species.id === 'potato_kennebec')!;
const instances = [{
  plant_id: 'potato_debug_0',
  species_id: potatoPlanting.species.id,
  root_subcell_id: 'zone_full_sun',
  occupied_subcells: [] as string[],
  planted_date: potatoPlanting.planting_date,
  current_stage: 'seed' as const,
  accumulated_gdd: 0,
  last_observed: new Date().toISOString(),
}];

const catalog = GARDEN_SPECIES_MAP;
const plants = initPlantStates(instances, catalog, env, new Date('2026-10-01'));

let plant: PlantState = plants[0]!;
console.log('Initial state:', plant.lifecycle, 'stage:', plant.stage);
console.log('Planted:', plant.planted_date);
console.log('');

const startDate = new Date('2025-04-28'); // A few days before planting
const endDate = new Date('2025-10-15');  // Through fall frost
const day = new Date(startDate);

while (day <= endDate) {
  const result = tickPlant(plant, new Date(day), env, catalog);
  const oldLifecycle = plant.lifecycle;
  const oldStage = plant.stage;
  plant = result.plant;

  const cond = env.getConditions(day);
  const dateStr = day.toISOString().slice(0, 10);

  // Log transitions and key dates
  const stageChanged = plant.stage !== oldStage;
  const lifecycleChanged = plant.lifecycle !== oldLifecycle;
  const isColdDay = cond.avg_low_f < 32;

  if (stageChanged || lifecycleChanged || isColdDay || result.events.length > 0) {
    console.log(
      dateStr,
      'stage=' + plant.stage,
      'lifecycle=' + plant.lifecycle,
      'gdd=' + plant.accumulated_gdd.toFixed(0),
      'lbs=' + plant.accumulated_lbs.toFixed(3),
      'airLow=' + cond.avg_low_f.toFixed(1),
      'soilT=' + cond.soil_temp_f.toFixed(1),
      result.events.map(e => e.type + (('cause' in e) ? ':' + (e as any).cause : '')).join(' '),
      stageChanged ? '← STAGE CHANGE' : '',
      lifecycleChanged ? '← LIFECYCLE CHANGE' : '',
    );
  }

  if (plant.lifecycle === 'dead') {
    console.log('\n*** POTATO DIED on ' + dateStr + ' ***');
    console.log('Cause:', result.events.find(e => e.type === 'plant_died'));
    break;
  }

  day.setDate(day.getDate() + 1);
}

if (plant.lifecycle !== 'dead') {
  console.log('\nPotato survived through', endDate.toISOString().slice(0, 10));
  console.log('Final: stage=' + plant.stage, 'lifecycle=' + plant.lifecycle, 'gdd=' + plant.accumulated_gdd.toFixed(0));
}
