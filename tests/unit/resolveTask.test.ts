/**
 * Unit tests for task resolution.
 *
 * Tests resolveTask: harvest delegates to harvestPlant, thinning is labor-only,
 * and informational tasks return no state changes.
 */

import { describe, test, expect } from 'vitest';
import { resolveTask } from '../../src/core/engine/resolveTask';
import type { Task } from '../../src/core/types/Task';
import type { PlantState } from '../../src/core/types/PlantState';
import type { PlantSpecies } from '../../src/core/types/PlantSpecies';
import { KALE_RED_RUSSIAN } from '../../src/core/data/species/kale-red-russian';
import { LETTUCE_BSS } from '../../src/core/data/species/lettuce-bss';

// ── Test Fixtures ───────────────────────────────────────────────────────────

const CATALOG = new Map<string, PlantSpecies>([
  [KALE_RED_RUSSIAN.id, KALE_RED_RUSSIAN],
  [LETTUCE_BSS.id, LETTUCE_BSS],
]);

function makePlant(overrides: Partial<PlantState> = {}): PlantState {
  return {
    plant_id: 'plant_1',
    species_id: 'kale_red_russian',
    subcell_id: 'sub_100_50',
    planted_date: '2026-04-15',
    stage: 'harvest',
    accumulated_dev: 500,
    accumulated_gdd: 600,
    accumulated_lbs: 0.25,
    harvest_strategy_id: 'kale_cut',
    cut_number: 0,
    vigor: 0.95,
    daily_potential: 0.02,
    stress: { drought_days: 0, waterlog_days: 0, heat_days: 0 },
    bolt_resistance: 0.6,
    lifecycle: 'growing',
    is_harvestable: true,
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    task_id: 'task_test_1',
    type: 'inspect',
    target: { target_type: 'plant', plant_id: 'plant_1' },
    created_at: '2026-07-01T00:00:00Z',
    priority: 5,
    status: 'queued',
    ...overrides,
  };
}

const EMPTY_CATALOG = new Map<string, PlantSpecies>();

// ── Harvest resolution ──────────────────────────────────────────────────────

describe('resolveTask harvest', () => {
  test('harvest task resets accumulated_lbs and advances cut_number', () => {
    const plants = [
      makePlant({ plant_id: 'p1', accumulated_lbs: 0.25, is_harvestable: true, cut_number: 0 }),
      makePlant({ plant_id: 'p2', accumulated_lbs: 0, is_harvestable: false }),
    ];
    const task = makeTask({
      type: 'harvest',
      target: { target_type: 'plant', plant_id: 'p1' },
    });

    const result = resolveTask(task, plants, CATALOG);
    expect(result.plants).toBeDefined();

    const harvested = result.plants!.find(p => p.plant_id === 'p1')!;
    expect(harvested.accumulated_lbs).toBe(0);
    expect(harvested.cut_number).toBe(1);
    expect(harvested.is_harvestable).toBe(false);

    // Other plants unchanged
    const other = result.plants!.find(p => p.plant_id === 'p2')!;
    expect(other.accumulated_lbs).toBe(0);
  });

  test('harvest task does nothing if target plant not found', () => {
    const plants = [makePlant({ plant_id: 'p1' })];
    const task = makeTask({
      type: 'harvest',
      target: { target_type: 'plant', plant_id: 'p_missing' },
    });

    const result = resolveTask(task, plants, CATALOG);
    expect(result.plants).toBeUndefined();
  });

  test('harvest at max_cuts transitions to senescent (CAC exhaustion)', () => {
    // Lettuce has max_cuts: 4 in lettuce_cut strategy
    const plants = [makePlant({
      plant_id: 'p1',
      species_id: 'lettuce_bss',
      harvest_strategy_id: 'lettuce_cut',
      cut_number: 3,
      is_harvestable: true,
    })];
    const task = makeTask({
      type: 'harvest',
      target: { target_type: 'plant', plant_id: 'p1' },
    });

    const result = resolveTask(task, plants, CATALOG);
    expect(result.plants).toBeDefined();

    const exhausted = result.plants!.find(p => p.plant_id === 'p1')!;
    expect(exhausted.cut_number).toBe(4);
    expect(exhausted.lifecycle).toBe('senescent');
  });
});

// ── Thinning resolution (labor-only in sim) ─────────────────────────────────

describe('resolveTask thin', () => {
  test('thinning is labor-only: no state mutation in simulation', () => {
    const plants = [
      makePlant({ plant_id: 'p1' }),
      makePlant({ plant_id: 'p2' }),
    ];
    const task = makeTask({
      type: 'thin',
      target: { target_type: 'plant', plant_id: 'p1' },
      parameters: { species_id: 'corn_dent' },
    });

    const result = resolveTask(task, plants, EMPTY_CATALOG);
    expect(result.plants).toBeUndefined();
  });
});

// ── Informational tasks ─────────────────────────────────────────────────────

describe('resolveTask informational', () => {
  test('inspect task returns no state change', () => {
    const result = resolveTask(makeTask({ type: 'inspect' }), [makePlant()], EMPTY_CATALOG);
    expect(result.plants).toBeUndefined();
  });

  test('water task returns no state change (conditions-driven)', () => {
    const result = resolveTask(makeTask({ type: 'water' }), [makePlant()], EMPTY_CATALOG);
    expect(result.plants).toBeUndefined();
  });

  test('weed task returns no state change', () => {
    const result = resolveTask(makeTask({ type: 'weed' }), [makePlant()], EMPTY_CATALOG);
    expect(result.plants).toBeUndefined();
  });

  test('build task returns no state change', () => {
    const result = resolveTask(makeTask({ type: 'build' }), [makePlant()], EMPTY_CATALOG);
    expect(result.plants).toBeUndefined();
  });
});
