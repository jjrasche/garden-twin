/**
 * Peak-decline auto-harvest tests.
 *
 * shouldAutoHarvest fires when quality drops below peak * decline_trigger,
 * but only if peak was meaningful (>= must_harvest_floor).
 */

import { describe, test, expect } from 'vitest';
import { shouldAutoHarvest } from '../../src/core/engine/simulate';
import type { PlantState } from '../../src/core/types/PlantState';

function makePlant(overrides: Partial<PlantState> = {}): PlantState {
  return {
    plant_id: 'plant_1',
    species_id: 'lettuce_bss',
    subcell_id: 'sub_100_50',
    planted_date: '2026-04-15',
    stage: 'vegetative',
    accumulated_dev: 100,
    accumulated_gdd: 200,
    accumulated_lbs: 0.15,
    harvest_strategy_id: 'lettuce_cut',
    cut_number: 0,
    vigor: 1.0,
    daily_potential: 0.01,
    stress: { drought_days: 0, waterlog_days: 0, heat_days: 0 },
    bolt_resistance: 0.6,
    lifecycle: 'growing',
    is_harvestable: true,
    peak_quality_score: 0.85,
    quality_score: 0.70,
    ...overrides,
  };
}

const FLOOR = 0.1;
const TRIGGER = 0.85;

describe('shouldAutoHarvest', () => {
  test('fires when quality drops below peak * decline_trigger', () => {
    // peak 0.85, trigger 0.85 → threshold 0.7225. quality 0.70 < 0.7225
    const plant = makePlant({ peak_quality_score: 0.85, quality_score: 0.70 });
    expect(shouldAutoHarvest(plant, FLOOR, TRIGGER)).toBe(true);
  });

  test('does not fire when quality is still near peak', () => {
    // peak 0.85, threshold 0.7225. quality 0.80 > 0.7225
    const plant = makePlant({ peak_quality_score: 0.85, quality_score: 0.80 });
    expect(shouldAutoHarvest(plant, FLOOR, TRIGGER)).toBe(false);
  });

  test('does not fire when peak is below must_harvest_floor', () => {
    // peak 0.05 < floor 0.1 → no auto-harvest even with decline
    const plant = makePlant({ peak_quality_score: 0.05, quality_score: 0.02 });
    expect(shouldAutoHarvest(plant, FLOOR, TRIGGER)).toBe(false);
  });

  test('does not fire when plant is not harvestable', () => {
    const plant = makePlant({ is_harvestable: false });
    expect(shouldAutoHarvest(plant, FLOOR, TRIGGER)).toBe(false);
  });

  test('does not fire for dead plants', () => {
    const plant = makePlant({ lifecycle: 'dead' });
    expect(shouldAutoHarvest(plant, FLOOR, TRIGGER)).toBe(false);
  });

  test('does not fire for pulled plants', () => {
    const plant = makePlant({ lifecycle: 'pulled' });
    expect(shouldAutoHarvest(plant, FLOOR, TRIGGER)).toBe(false);
  });

  test('fires at exact threshold boundary', () => {
    // peak 1.0, trigger 0.85 → threshold 0.85. quality 0.849 < 0.85
    const plant = makePlant({ peak_quality_score: 1.0, quality_score: 0.849 });
    expect(shouldAutoHarvest(plant, FLOOR, TRIGGER)).toBe(true);
  });

  test('does not fire at exact threshold value', () => {
    // peak 1.0, trigger 0.85 → threshold 0.85. quality 0.85 = 0.85 (not less than)
    const plant = makePlant({ peak_quality_score: 1.0, quality_score: 0.85 });
    expect(shouldAutoHarvest(plant, FLOOR, TRIGGER)).toBe(false);
  });

  test('works with heat-stressed low peak', () => {
    // Hot weather: peak only reached 0.25, floor is 0.1
    // 0.25 >= 0.1 so peak check passes. quality 0.20 < 0.25 * 0.85 = 0.2125
    const plant = makePlant({ peak_quality_score: 0.25, quality_score: 0.20 });
    expect(shouldAutoHarvest(plant, FLOOR, TRIGGER)).toBe(true);
  });
});
