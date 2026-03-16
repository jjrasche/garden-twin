/**
 * GDD engine tests — development track (thermal time → stage transitions).
 *
 * Tests the pure GDD math and stage determination functions added in Phase 3.
 */

import { describe, test, expect } from 'vitest';
import {
  computeDailyGdd,
  determineStage,
  isHarvestableStage,
  accumulateGddOverRange,
} from '../../src/core/calculators/gddEngine';
import type { GddStages } from '../../src/core/calculators/gddEngine';

// =============================================================================
// computeDailyGdd
// =============================================================================

describe('computeDailyGdd', () => {
  test('standard calculation: (high + low) / 2 - base', () => {
    // (80 + 60) / 2 - 50 = 70 - 50 = 20
    expect(computeDailyGdd(80, 60, 50)).toBe(20);
  });

  test('returns 0 when mean is below base', () => {
    // (50 + 40) / 2 - 50 = 45 - 50 = -5 → 0
    expect(computeDailyGdd(50, 40, 50)).toBe(0);
  });

  test('returns 0 when mean equals base exactly', () => {
    // (60 + 40) / 2 - 50 = 50 - 50 = 0
    expect(computeDailyGdd(60, 40, 50)).toBe(0);
  });

  test('handles lettuce base temp (40°F)', () => {
    // (65 + 45) / 2 - 40 = 55 - 40 = 15
    expect(computeDailyGdd(65, 45, 40)).toBe(15);
  });

  test('hot day accumulates more GDD', () => {
    // (95 + 70) / 2 - 50 = 82.5 - 50 = 32.5
    expect(computeDailyGdd(95, 70, 50)).toBe(32.5);
  });
});

// =============================================================================
// determineStage
// =============================================================================

describe('determineStage', () => {
  const cornStages: GddStages = {
    vegetative: 435,
    flowering: 1020,
    fruiting: 1475,
    mature: 2100,
  };

  test('seed stage before vegetative threshold', () => {
    expect(determineStage(0, cornStages)).toBe('seed');
    expect(determineStage(200, cornStages)).toBe('seed');
    expect(determineStage(434, cornStages)).toBe('seed');
  });

  test('vegetative at threshold', () => {
    expect(determineStage(435, cornStages)).toBe('vegetative');
    expect(determineStage(800, cornStages)).toBe('vegetative');
  });

  test('flowering at threshold', () => {
    expect(determineStage(1020, cornStages)).toBe('flowering');
    expect(determineStage(1400, cornStages)).toBe('flowering');
  });

  test('fruiting at threshold', () => {
    expect(determineStage(1475, cornStages)).toBe('fruiting');
    expect(determineStage(2000, cornStages)).toBe('fruiting');
  });

  test('mature at threshold', () => {
    expect(determineStage(2100, cornStages)).toBe('harvest');
    expect(determineStage(2500, cornStages)).toBe('harvest');
  });

  test('works with lettuce stages (lower GDD)', () => {
    const lettuceStages: GddStages = {
      vegetative: 130,
      flowering: 1500,
      fruiting: 1500,
      mature: 1500,
    };
    expect(determineStage(100, lettuceStages)).toBe('seed');
    expect(determineStage(130, lettuceStages)).toBe('vegetative');
    // Lettuce harvested before flowering — flowering/fruiting/mature same threshold
    expect(determineStage(1500, lettuceStages)).toBe('harvest');
  });
});

// =============================================================================
// isHarvestableStage
// =============================================================================

describe('isHarvestableStage', () => {

  test('seed is not harvestable', () => {
    expect(isHarvestableStage('seed')).toBe(false);
  });

  test('vegetative is not harvestable', () => {
    expect(isHarvestableStage('vegetative')).toBe(false);
  });

  test('flowering is not harvestable', () => {
    expect(isHarvestableStage('flowering')).toBe(false);
  });

  test('fruiting is harvestable', () => {
    expect(isHarvestableStage('fruiting')).toBe(true);
  });

  test('harvest is harvestable', () => {
    expect(isHarvestableStage('harvest')).toBe(true);
  });

  test('done is not harvestable', () => {
    expect(isHarvestableStage('done')).toBe(false);
  });
});

// =============================================================================
// accumulateGddOverRange
// =============================================================================

describe('accumulateGddOverRange', () => {

  test('accumulates over multiple days', () => {
    // 5 days, each day mean temp 70, base 50 → 20 GDD/day → 100 total
    const dailyTemps = [
      { high_f: 80, low_f: 60 },
      { high_f: 80, low_f: 60 },
      { high_f: 80, low_f: 60 },
      { high_f: 80, low_f: 60 },
      { high_f: 80, low_f: 60 },
    ];
    expect(accumulateGddOverRange(dailyTemps, 50)).toBe(100);
  });

  test('cold days contribute zero', () => {
    const dailyTemps = [
      { high_f: 80, low_f: 60 }, // 20 GDD
      { high_f: 45, low_f: 35 }, // 0 GDD (mean 40 < base 50)
      { high_f: 80, low_f: 60 }, // 20 GDD
    ];
    expect(accumulateGddOverRange(dailyTemps, 50)).toBe(40);
  });

  test('empty range returns 0', () => {
    expect(accumulateGddOverRange([], 50)).toBe(0);
  });
});
