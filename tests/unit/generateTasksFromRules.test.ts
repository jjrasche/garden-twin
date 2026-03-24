/**
 * Unit tests for rule-based task generation.
 *
 * Tests generateTasksFromRules: per-plant evaluation, zone-level evaluation,
 * cooldown respect, and task structure.
 */

import { describe, test, expect } from 'vitest';
import { generateTasksFromRules } from '../../src/core/engine/generateTasksFromRules';
import type { TaskRule } from '../../src/core/types/Rules';
import type { PlantState } from '../../src/core/types/PlantState';
import type { Task } from '../../src/core/types/Task';
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

function makeRule(overrides: Partial<TaskRule> = {}): TaskRule {
  return {
    rule_id: 'test_rule',
    version: 1,
    name: 'Test rule',
    condition: 'true',
    task_type: 'inspect',
    priority: 5,
    target_type: 'plant',
    enabled: true,
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

// ── Per-plant rule evaluation ───────────────────────────────────────────────

describe('generateTasksFromRules', () => {
  test('emits one task per alive plant when plant-level rule fires', () => {
    const plants = [
      makePlant({ plant_id: 'p1', is_harvestable: true }),
      makePlant({ plant_id: 'p2', is_harvestable: true }),
      makePlant({ plant_id: 'p3', is_harvestable: false }),
    ];
    const rules = [makeRule({
      rule_id: 'harvest_ready',
      condition: 'plant.is_harvestable == true',
      task_type: 'harvest',
      target_type: 'plant',
    })];

    const tasks = generateTasksFromRules(rules, plants, TEST_DATE, MOCK_ENV, []);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]!.type).toBe('harvest');
    expect(tasks[0]!.target).toEqual({ target_type: 'plant', plant_id: 'p1' });
    expect(tasks[1]!.target).toEqual({ target_type: 'plant', plant_id: 'p2' });
  });

  test('skips dead/pulled/senescent plants', () => {
    const plants = [
      makePlant({ plant_id: 'alive', lifecycle: 'growing' }),
      makePlant({ plant_id: 'dead', lifecycle: 'dead' }),
      makePlant({ plant_id: 'pulled', lifecycle: 'pulled' }),
      makePlant({ plant_id: 'senescent', lifecycle: 'senescent' }),
    ];
    const rules = [makeRule({ condition: 'true', target_type: 'plant' })];

    const tasks = generateTasksFromRules(rules, plants, TEST_DATE, MOCK_ENV, []);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.parameters!.plant_id).toBe('alive');
  });

  test('skips disabled rules', () => {
    const plants = [makePlant()];
    const rules = [makeRule({ enabled: false, condition: 'true' })];

    const tasks = generateTasksFromRules(rules, plants, TEST_DATE, MOCK_ENV, []);
    expect(tasks).toHaveLength(0);
  });
});

// ── Zone/garden-level rules ─────────────────────────────────────────────────

describe('generateTasksFromRules zone-level', () => {
  test('zone rule emits one task regardless of plant count', () => {
    const plants = [makePlant(), makePlant({ plant_id: 'p2' }), makePlant({ plant_id: 'p3' })];
    const rules = [makeRule({
      rule_id: 'water_dry',
      condition: 'conditions.soil_moisture_pct_fc < 40',
      task_type: 'water',
      target_type: 'zone',
    })];

    const dryEnv: ConditionsResolver = {
      ...MOCK_ENV,
      getConditions: () => ({
        avg_high_f: 90, avg_low_f: 65, soil_temp_f: 70,
        photoperiod_h: 14.5, soil_moisture_pct_fc: 30,
      }),
    };

    const tasks = generateTasksFromRules(rules, plants, TEST_DATE, dryEnv, []);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.target).toEqual({ target_type: 'garden' });
  });

  test('zone rule does not fire when condition not met', () => {
    const rules = [makeRule({
      condition: 'conditions.soil_moisture_pct_fc < 40',
      target_type: 'zone',
    })];

    // Default MOCK_ENV has soil_moisture_pct_fc: 70
    const tasks = generateTasksFromRules(rules, [makePlant()], TEST_DATE, MOCK_ENV, []);
    expect(tasks).toHaveLength(0);
  });
});

// ── Cooldown ────────────────────────────────────────────────────────────────

describe('generateTasksFromRules cooldown', () => {
  test('skips plant if same task type completed within cooldown window', () => {
    const plants = [makePlant({ plant_id: 'p1', is_harvestable: true })];
    const rules = [makeRule({
      condition: 'plant.is_harvestable == true',
      task_type: 'harvest',
      target_type: 'plant',
      cooldown_days: 3,
    })];

    const recentlyCompleted: Task[] = [{
      task_id: 'old_harvest',
      type: 'harvest',
      target: { target_type: 'plant', plant_id: 'p1' },
      created_at: TEST_DATE.toISOString(),
      priority: 9,
      status: 'completed',
      completed_at: TEST_DATE.toISOString(),
    }];

    const tasks = generateTasksFromRules(rules, plants, TEST_DATE, MOCK_ENV, recentlyCompleted);
    expect(tasks).toHaveLength(0);
  });
});

// ── Task structure ──────────────────────────────────────────────────────────

describe('generateTasksFromRules task structure', () => {
  test('generated task has correct provenance fields', () => {
    const plants = [makePlant({ plant_id: 'p1', species_id: 'corn_dent' })];
    const rules = [makeRule({
      rule_id: 'drought_water',
      condition: 'true',
      task_type: 'water',
      priority: 9,
      labor_type: 'either',
      estimated_duration_minutes: 10,
    })];

    const tasks = generateTasksFromRules(rules, plants, TEST_DATE, MOCK_ENV, []);
    const task = tasks[0]!;

    expect(task.type).toBe('water');
    expect(task.priority).toBe(9);
    expect(task.labor_type).toBe('either');
    expect(task.estimated_duration_minutes).toBe(10);
    expect(task.status).toBe('queued');
    expect(task.generated_by_rule).toBe('rule:drought_water');
    expect(task.parameters!.rule_id).toBe('drought_water');
    expect(task.parameters!.species_id).toBe('corn_dent');
  });
});
