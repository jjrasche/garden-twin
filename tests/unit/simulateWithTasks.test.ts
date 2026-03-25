/**
 * Integration test for simulateWithTasks — full lifecycle through task system.
 *
 * Runs a minimal garden (2 lettuce plants) through ~80 simulated days.
 * Verifies: growth → harvest task generation → resolution → CAC exhaustion
 * → senescent → pulled. Tests that all pieces wire together correctly.
 */

import { describe, test, expect } from 'vitest';
import { simulateWithTasks } from '../../src/core/engine/simulate';
import type { SimulationContext } from '../../src/core/engine/simulate';
import type { GardenState, PlantInstance } from '../../src/core/types/GardenState';
import type { PlantSpecies } from '../../src/core/types/PlantSpecies';
import type { LifecycleSpec } from '../../src/core/types/LifecycleSpec';
import type { ConditionsResolver } from '../../src/core/environment/types';
import { LETTUCE_BSS } from '../../src/core/data/species/lettuce-bss';
import { LETTUCE_BSS_LIFECYCLE } from '../../src/core/data/lifecycle/lettuce-bss.lifecycle';
import { DEFAULT_RULES } from '../../src/core/types/Rules';

// ── Test Fixtures ───────────────────────────────────────────────────────────

const CATALOG = new Map<string, PlantSpecies>([
  [LETTUCE_BSS.id, LETTUCE_BSS],
]);

const LIFECYCLES = new Map<string, LifecycleSpec>([
  [LETTUCE_BSS_LIFECYCLE.species_id, LETTUCE_BSS_LIFECYCLE],
]);

/** Stable warm conditions — lettuce grows steadily. */
const WARM_ENV: ConditionsResolver = {
  source_type: 'historical',
  location: 'Grand Rapids, MI',
  avg_last_frost: new Date('2026-05-10'),
  avg_first_frost: new Date('2026-10-05'),
  avg_hard_frost: new Date('2026-10-20'),
  getConditions: () => ({
    avg_high_f: 72,
    avg_low_f: 52,
    soil_temp_f: 60,
    photoperiod_h: 14,
    soil_moisture_pct_fc: 70,
    sunshine_hours: 8,
  }),
  getWeeklyConditions: () => [],
};

function makeLettucePlant(id: string): PlantInstance {
  return {
    plant_id: id,
    species_id: 'lettuce_bss',
    root_subcell_id: `sub_100_${50 + parseInt(id.split('_')[1]!) * 6}`,
    occupied_subcells: [`sub_100_${50 + parseInt(id.split('_')[1]!) * 6}`],
    planted_date: '2026-05-15',
    harvest_strategy_id: 'lettuce_cut',
    current_stage: 'seed',
    accumulated_gdd: 0,
    last_observed: '2026-05-15T00:00:00Z',
    position: { x: 100, y: id === 'lettuce_1' ? 50 : 56 },
  };
}

function makeGardenState(plants: PlantInstance[]): GardenState {
  return {
    state_id: 'test_state',
    schema_version: '1.0',
    timestamp: '2026-05-15T00:00:00Z',
    type: 'projected',
    garden_id: 'test_garden',
    location: { name: 'Grand Rapids, MI', lat: 42.96, lon: -85.66, timezone: 'America/Detroit', usda_zone: '6a' },
    grid: { width_ft: 30, length_ft: 100, subcell_size_in: 3 },
    plants,
    subcells: [],
    created_at: '2026-05-15T00:00:00Z',
    updated_at: '2026-05-15T00:00:00Z',
  };
}

// ── Integration Test ────────────────────────────────────────────────────────

describe('simulateWithTasks end-to-end', () => {
  test('demand-driven harvest: no harvest tasks in projection, quality-decline as safety net', () => {
    const gardenState = makeGardenState([
      makeLettucePlant('lettuce_1'),
      makeLettucePlant('lettuce_2'),
      makeLettucePlant('lettuce_3'),
    ]);

    const ctx: SimulationContext & { lifecycles: Map<string, LifecycleSpec> } = {
      catalog: CATALOG,
      env: WARM_ENV,
      dateRange: {
        start: new Date('2026-05-15'),
        end: new Date('2026-08-15'),
      },
      lifecycles: LIFECYCLES,
      rules: DEFAULT_RULES,
    };

    const snapshots = simulateWithTasks(gardenState, ctx);
    expect(snapshots.length).toBeGreaterThan(0);

    // No harvest tasks in projection — harvest is demand-driven via orders
    const harvestTasks = snapshots
      .flatMap(s => s.tasks ?? [])
      .filter(t => t.type === 'harvest');
    expect(harvestTasks.length).toBe(0);

    // Quality-decline forced harvest still fires as safety net
    const harvestEvents = snapshots.flatMap(s => s.events).filter(e => e.type === 'harvested');
    expect(harvestEvents.length).toBeGreaterThan(0);

    // Plants accumulate biomass as projected inventory before quality-decline triggers
    const midSeason = snapshots[Math.floor(snapshots.length / 3)]!;
    const harvestable = midSeason.plants.filter(p => p.is_harvestable);
    expect(harvestable.length).toBeGreaterThan(0);
    expect(harvestable.some(p => p.accumulated_lbs > 0)).toBe(true);
  });

  test('task generation includes season tasks when provided', () => {
    const gardenState = makeGardenState([makeLettucePlant('lettuce_1')]);

    const seasonTask = {
      task_id: 'season_fence_check',
      type: 'inspect' as const,
      target: { target_type: 'garden' as const },
      created_at: '2026-01-01T00:00:00Z',
      priority: 3,
      status: 'queued' as const,
      due_by: '2026-05-20T23:59:59Z',
    };

    const ctx: SimulationContext & { lifecycles: Map<string, LifecycleSpec> } = {
      catalog: CATALOG,
      env: WARM_ENV,
      dateRange: {
        start: new Date('2026-05-15'),
        end: new Date('2026-05-25'),
      },
      lifecycles: LIFECYCLES,
      seasonTasks: [seasonTask],
    };

    const snapshots = simulateWithTasks(gardenState, ctx);

    // The season task should appear on May 20
    const may20 = snapshots.find(s =>
      s.date.toISOString().slice(0, 10) === '2026-05-20',
    );
    expect(may20).toBeDefined();
    expect(may20!.tasks).toBeDefined();

    const fenceTask = may20!.tasks!.find(t => t.task_id === 'season_fence_check');
    expect(fenceTask).toBeDefined();
    expect(fenceTask!.status).toBe('completed');
  });

  test('maintenance tasks (water, thin) still appear in projection', () => {
    const gardenState = makeGardenState([
      makeLettucePlant('lettuce_1'),
    ]);

    const dryEnv: ConditionsResolver = {
      ...WARM_ENV,
      getConditions: () => ({
        avg_high_f: 72,
        avg_low_f: 52,
        soil_temp_f: 60,
        photoperiod_h: 14,
        soil_moisture_pct_fc: 30,  // triggers water rule
        sunshine_hours: 8,
      }),
    };

    const ctx: SimulationContext & { lifecycles: Map<string, LifecycleSpec> } = {
      catalog: CATALOG,
      env: dryEnv,
      dateRange: {
        start: new Date('2026-05-15'),
        end: new Date('2026-05-25'),
      },
      lifecycles: LIFECYCLES,
      rules: DEFAULT_RULES,
    };

    const snapshots = simulateWithTasks(gardenState, ctx);
    const allTasks = snapshots.flatMap(s => s.tasks ?? []);

    // Water tasks should fire from rules (soil_moisture < 40%)
    const waterTasks = allTasks.filter(t => t.type === 'water');
    expect(waterTasks.length).toBeGreaterThan(0);

    // No harvest tasks in maintenance-only projection
    const harvestTasks = allTasks.filter(t => t.type === 'harvest');
    expect(harvestTasks.length).toBe(0);
  });

  test('rule-generated tasks appear when conditions met', () => {
    const gardenState = makeGardenState([makeLettucePlant('lettuce_1')]);

    const dryEnv: ConditionsResolver = {
      ...WARM_ENV,
      getConditions: () => ({
        avg_high_f: 72,
        avg_low_f: 52,
        soil_temp_f: 60,
        photoperiod_h: 14,
        soil_moisture_pct_fc: 30,  // Below 40% threshold → triggers water rule
        sunshine_hours: 8,
      }),
    };

    const ctx: SimulationContext & { lifecycles: Map<string, LifecycleSpec> } = {
      catalog: CATALOG,
      env: dryEnv,
      dateRange: {
        start: new Date('2026-05-15'),
        end: new Date('2026-05-17'),  // Just 2 days
      },
      lifecycles: LIFECYCLES,
      rules: DEFAULT_RULES,
    };

    const snapshots = simulateWithTasks(gardenState, ctx);
    const allTasks = snapshots.flatMap(s => s.tasks ?? []);
    const waterTasks = allTasks.filter(t => t.type === 'water');

    // water_when_dry rule should fire (soil_moisture_pct_fc: 30 < 40)
    expect(waterTasks.length).toBeGreaterThan(0);
  });
});
