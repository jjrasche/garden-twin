/**
 * Unit tests for the rule condition evaluator.
 *
 * Tests evaluateRule (enabled check + delegation) and evaluateCondition
 * (the expression parser that handles property paths, comparisons, and/or).
 */

import { describe, test, expect } from 'vitest';
import { evaluateRule, evaluateCondition, buildConditionsContext, type RuleContext } from '../../src/core/engine/evaluateRule';
import type { TaskRule } from '../../src/core/types/Rules';
import type { PlantState } from '../../src/core/types/PlantState';

// ── Test Fixtures ───────────────────────────────────────────────────────────

function makePlant(overrides: Partial<PlantState> = {}): PlantState {
  return {
    plant_id: 'plant_test_1',
    species_id: 'kale_red_russian',
    subcell_id: 'sub_100_50',
    planted_date: '2026-04-15',
    stage: 'vegetative',
    accumulated_dev: 100,
    accumulated_gdd: 200,
    accumulated_lbs: 0.5,
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

// ── evaluateCondition: comparisons ──────────────────────────────────────────

describe('evaluateCondition', () => {
  test('number less-than comparison against plant field', () => {
    const ctx: RuleContext = { plant: makePlant({ accumulated_lbs: 0.3 }) };
    expect(evaluateCondition('plant.accumulated_lbs < 0.5', ctx)).toBe(true);
    expect(evaluateCondition('plant.accumulated_lbs < 0.2', ctx)).toBe(false);
  });

  test('number greater-than comparison', () => {
    const ctx: RuleContext = { plant: makePlant({ stress: { drought_days: 4, waterlog_days: 0, heat_days: 0 } }) };
    expect(evaluateCondition('plant.stress.drought_days > 3', ctx)).toBe(true);
    expect(evaluateCondition('plant.stress.drought_days > 5', ctx)).toBe(false);
  });

  test('equality with string literal (single quotes)', () => {
    const ctx: RuleContext = { plant: makePlant({ stage: 'flowering' }) };
    expect(evaluateCondition("plant.stage == 'flowering'", ctx)).toBe(true);
    expect(evaluateCondition("plant.stage == 'vegetative'", ctx)).toBe(false);
  });

  test('equality with string literal (double quotes)', () => {
    const ctx: RuleContext = { plant: makePlant({ lifecycle: 'stressed' }) };
    expect(evaluateCondition('plant.lifecycle == "stressed"', ctx)).toBe(true);
  });

  test('boolean equality', () => {
    const ctx: RuleContext = { plant: makePlant({ is_harvestable: true }) };
    expect(evaluateCondition('plant.is_harvestable == true', ctx)).toBe(true);
    expect(evaluateCondition('plant.is_harvestable == false', ctx)).toBe(false);
  });

  test('not-equal comparison', () => {
    const ctx: RuleContext = { plant: makePlant({ lifecycle: 'growing' }) };
    expect(evaluateCondition("plant.lifecycle != 'dead'", ctx)).toBe(true);
    expect(evaluateCondition("plant.lifecycle != 'growing'", ctx)).toBe(false);
  });

  test('less-than-or-equal and greater-than-or-equal', () => {
    const ctx: RuleContext = { plant: makePlant({ vigor: 0.5 }) };
    expect(evaluateCondition('plant.vigor <= 0.5', ctx)).toBe(true);
    expect(evaluateCondition('plant.vigor >= 0.5', ctx)).toBe(true);
    expect(evaluateCondition('plant.vigor <= 0.4', ctx)).toBe(false);
    expect(evaluateCondition('plant.vigor >= 0.6', ctx)).toBe(false);
  });

  test('conditions context (environment data)', () => {
    const ctx: RuleContext = {
      conditions: { soil_moisture_pct_fc: 35, temperature_f: 85 },
    };
    expect(evaluateCondition('conditions.soil_moisture_pct_fc < 40', ctx)).toBe(true);
    expect(evaluateCondition('conditions.temperature_f > 80', ctx)).toBe(true);
  });

  test('bare truthy check', () => {
    expect(evaluateCondition('true', {})).toBe(true);
    expect(evaluateCondition('false', {})).toBe(false);
  });

  test('bare property truthy check', () => {
    const ctx: RuleContext = { plant: makePlant({ is_harvestable: true }) };
    expect(evaluateCondition('plant.is_harvestable', ctx)).toBe(true);
  });

  test('undefined property path returns false', () => {
    const ctx: RuleContext = { plant: makePlant() };
    expect(evaluateCondition('plant.nonexistent_field > 5', ctx)).toBe(false);
  });

  test('missing root returns false', () => {
    expect(evaluateCondition('unknown.field == 5', {})).toBe(false);
  });
});

// ── evaluateCondition: logical operators ────────────────────────────────────

describe('evaluateCondition logical operators', () => {
  test('and: both true', () => {
    const ctx: RuleContext = { plant: makePlant({ is_harvestable: true, lifecycle: 'growing' }) };
    expect(evaluateCondition("plant.is_harvestable == true and plant.lifecycle == 'growing'", ctx)).toBe(true);
  });

  test('and: one false', () => {
    const ctx: RuleContext = { plant: makePlant({ is_harvestable: false, lifecycle: 'growing' }) };
    expect(evaluateCondition("plant.is_harvestable == true and plant.lifecycle == 'growing'", ctx)).toBe(false);
  });

  test('or: one true', () => {
    const ctx: RuleContext = { plant: makePlant({ lifecycle: 'stressed' }) };
    expect(evaluateCondition("plant.lifecycle == 'dead' or plant.lifecycle == 'stressed'", ctx)).toBe(true);
  });

  test('or: both false', () => {
    const ctx: RuleContext = { plant: makePlant({ lifecycle: 'growing' }) };
    expect(evaluateCondition("plant.lifecycle == 'dead' or plant.lifecycle == 'stressed'", ctx)).toBe(false);
  });

  // Documents the known limitation: left-to-right evaluation, no precedence
  test('mixed and/or evaluates left-to-right (no precedence)', () => {
    const ctx: RuleContext = {
      conditions: { temperature_f: 90, soil_moisture_pct_fc: 50 },
      plant: makePlant({ lifecycle: 'growing' }),
    };
    // "false or true and true" → left-to-right: (false or true) and true → true
    // NOT: false or (true and true) → true (same result here but different semantics)
    expect(evaluateCondition(
      "plant.lifecycle == 'dead' or conditions.temperature_f > 80 and conditions.soil_moisture_pct_fc < 60",
      ctx,
    )).toBe(true);
  });
});

// ── evaluateRule: enabled gating ────────────────────────────────────────────

describe('evaluateRule', () => {
  test('delegates to condition evaluation', () => {
    const rule = makeRule({ condition: 'plant.is_harvestable == true' });
    const ctx: RuleContext = { plant: makePlant({ is_harvestable: true }) };
    expect(evaluateRule(rule, ctx)).toBe(true);
  });

  test('returns false when condition not met', () => {
    const rule = makeRule({ condition: 'plant.is_harvestable == true' });
    const ctx: RuleContext = { plant: makePlant({ is_harvestable: false }) };
    expect(evaluateRule(rule, ctx)).toBe(false);
  });
});

// ── buildConditionsContext ───────────────────────────────────────────────────

describe('buildConditionsContext', () => {
  test('maps ConditionsResolver output to flat record', () => {
    const mockEnv = {
      source_type: 'historical' as const,
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
        sunshine_hours: 8,
        solar_radiation_mj: 18,
      }),
      getWeeklyConditions: () => [],
    };

    const conditions = buildConditionsContext(mockEnv, new Date('2026-07-01'));
    expect(conditions.temperature_f).toBe(78);
    expect(conditions.temperature_low_f).toBe(55);
    expect(conditions.soil_temp_f).toBe(62);
    expect(conditions.photoperiod_h).toBe(14.5);
    expect(conditions.soil_moisture_pct_fc).toBe(70);
    expect(conditions.sunshine_hours).toBe(8);
    expect(conditions.solar_radiation_mj).toBe(18);
  });
});
