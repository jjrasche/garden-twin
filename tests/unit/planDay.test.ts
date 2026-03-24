/**
 * Integration test for planDay — merges all 3 task sources and deduplicates.
 *
 * Tests that lifecycle, season, and rule sources compose correctly
 * and that deduplication prevents duplicate tasks.
 */

import { describe, test, expect } from 'vitest';
import { planDay } from '../../src/core/engine/operationalPlanner';
import type { PlantState } from '../../src/core/types/PlantState';
import type { PlantSpecies } from '../../src/core/types/PlantSpecies';
import type { Task } from '../../src/core/types/Task';
import type { TaskRule } from '../../src/core/types/Rules';
import type { LifecycleSpec } from '../../src/core/types/LifecycleSpec';
import type { ConditionsResolver } from '../../src/core/environment/types';

// ── Test Fixtures ───────────────────────────────────────────────────────────

function makePlant(overrides: Partial<PlantState> = {}): PlantState {
  return {
    plant_id: 'plant_1',
    species_id: 'kale_red_russian',
    subcell_id: 'sub_100_50',
    planted_date: '2026-04-15',
    stage: 'vegetative',
    accumulated_dev: 100,
    accumulated_gdd: 200,
    accumulated_lbs: 0,
    harvest_strategy_id: 'kale_cut',
    cut_number: 0,
    vigor: 0.95,
    daily_potential: 0.02,
    stress: { drought_days: 0, waterlog_days: 0, heat_days: 0 },
    bolt_resistance: 0.6,
    lifecycle: 'growing',
    is_harvestable: false,
    ...overrides,
  };
}

const MOCK_ENV: ConditionsResolver = {
  source_type: 'historical',
  location: 'Grand Rapids, MI',
  avg_last_frost: new Date('2026-05-10'),
  avg_first_frost: new Date('2026-10-05'),
  avg_hard_frost: new Date('2026-10-20'),
  getConditions: () => ({
    avg_high_f: 78,
    avg_low_f: 55,
    soil_temp_f: 62,
    photoperiod_h: 14.5,
    soil_moisture_pct_fc: 70,
  }),
  getWeeklyConditions: () => [],
};

const TEST_DATE = new Date('2026-07-01');

// Empty lifecycles and catalog — lifecycle source won't fire, but season + rules will
const EMPTY_LIFECYCLES = new Map<string, LifecycleSpec>();
const EMPTY_CATALOG = new Map<string, PlantSpecies>();

/** Build date-keyed index from Task[] for planDay's seasonTaskIndex param. */
function indexByDate(tasks: Task[]): Map<string, Task[]> {
  const index = new Map<string, Task[]>();
  for (const task of tasks) {
    const dateKey = task.due_by?.slice(0, 10);
    if (!dateKey) continue;
    const bucket = index.get(dateKey);
    if (bucket) bucket.push(task);
    else index.set(dateKey, [task]);
  }
  return index;
}

// ── Season task filtering ───────────────────────────────────────────────────

describe('planDay season tasks', () => {
  test('includes season tasks matching the date', () => {
    const seasonTasks: Task[] = [
      {
        task_id: 'season_fence_walk',
        type: 'inspect',
        target: { target_type: 'garden' },
        created_at: '2026-01-01T00:00:00Z',
        priority: 3,
        status: 'queued',
        due_by: '2026-07-01T23:59:59Z',
      },
      {
        task_id: 'season_bed_prep',
        type: 'prepare',
        target: { target_type: 'garden' },
        created_at: '2026-01-01T00:00:00Z',
        priority: 7,
        status: 'queued',
        due_by: '2026-07-15T23:59:59Z', // Different date — should NOT appear
      },
    ];

    const result = planDay({
      plants: [makePlant()],
      date: TEST_DATE,
      env: MOCK_ENV,
      catalog: EMPTY_CATALOG,
      lifecycles: EMPTY_LIFECYCLES,
      existingTasks: [],
      seasonTaskIndex: indexByDate(seasonTasks),
    });

    expect(result.newTasks).toHaveLength(1);
    expect(result.newTasks[0]!.task_id).toBe('season_fence_walk');
  });

  test('excludes season tasks from other dates', () => {
    const seasonTasks: Task[] = [{
      task_id: 'season_tomorrow',
      type: 'build',
      target: { target_type: 'infrastructure', infrastructure_id: 'fence' },
      created_at: '2026-01-01T00:00:00Z',
      priority: 7,
      status: 'queued',
      due_by: '2026-07-02T23:59:59Z',
    }];

    const result = planDay({
      plants: [],
      date: TEST_DATE,
      env: MOCK_ENV,
      catalog: EMPTY_CATALOG,
      lifecycles: EMPTY_LIFECYCLES,
      existingTasks: [],
      seasonTaskIndex: indexByDate(seasonTasks),
    });

    expect(result.newTasks).toHaveLength(0);
  });
});

// ── Rule integration ────────────────────────────────────────────────────────

describe('planDay rules', () => {
  test('rule-generated tasks appear in output', () => {
    const rules: TaskRule[] = [{
      rule_id: 'inspect_stressed',
      version: 1,
      name: 'Inspect stressed',
      condition: "plant.lifecycle == 'stressed'",
      task_type: 'inspect',
      priority: 7,
      target_type: 'plant',
      enabled: true,
    }];

    const plants = [
      makePlant({ plant_id: 'stressed_1', lifecycle: 'stressed' }),
      makePlant({ plant_id: 'healthy_1', lifecycle: 'growing' }),
    ];

    const result = planDay({
      plants,
      date: TEST_DATE,
      env: MOCK_ENV,
      catalog: EMPTY_CATALOG,
      lifecycles: EMPTY_LIFECYCLES,
      existingTasks: [],
      rules,
    });

    expect(result.newTasks).toHaveLength(1);
    expect(result.newTasks[0]!.parameters!.plant_id).toBe('stressed_1');
  });
});

// ── Deduplication ───────────────────────────────────────────────────────────

describe('planDay deduplication', () => {
  test('does not emit task if same type+target already exists in existingTasks', () => {
    const rules: TaskRule[] = [{
      rule_id: 'always_inspect',
      version: 1,
      name: 'Always inspect',
      condition: 'true',
      task_type: 'inspect',
      priority: 3,
      target_type: 'plant',
      enabled: true,
    }];

    const plants = [makePlant({ plant_id: 'p1' })];

    const existingTasks: Task[] = [{
      task_id: 'existing_inspect',
      type: 'inspect',
      target: { target_type: 'plant', plant_id: 'p1' },
      created_at: '2026-06-30T00:00:00Z',
      priority: 3,
      status: 'queued',
    }];

    const result = planDay({
      plants,
      date: TEST_DATE,
      env: MOCK_ENV,
      catalog: EMPTY_CATALOG,
      lifecycles: EMPTY_LIFECYCLES,
      existingTasks,
      rules,
    });

    expect(result.newTasks).toHaveLength(0);
  });
});

// ── All sources together ────────────────────────────────────────────────────

describe('planDay multi-source', () => {
  test('totalEvaluated counts candidates from all sources', () => {
    const seasonTasks: Task[] = [{
      task_id: 'season_1',
      type: 'build',
      target: { target_type: 'garden' },
      created_at: '2026-01-01T00:00:00Z',
      priority: 7,
      status: 'queued',
      due_by: '2026-07-01T23:59:59Z',
    }];

    const rules: TaskRule[] = [{
      rule_id: 'always',
      version: 1,
      name: 'Always fire',
      condition: 'true',
      task_type: 'inspect',
      priority: 3,
      target_type: 'plant',
      enabled: true,
    }];

    const result = planDay({
      plants: [makePlant()],
      date: TEST_DATE,
      env: MOCK_ENV,
      catalog: EMPTY_CATALOG,
      lifecycles: EMPTY_LIFECYCLES,
      existingTasks: [],
      seasonTaskIndex: indexByDate(seasonTasks),
      rules,
    });

    // 1 season + 1 rule = 2 candidates (lifecycle contributes 0 without matching specs)
    expect(result.totalEvaluated).toBe(2);
    expect(result.newTasks).toHaveLength(2);
  });
});
