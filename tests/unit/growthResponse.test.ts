/**
 * GrowthResponse tests — declarative modifier curves replacing hardcoded fields.
 *
 * Tests the GrowthResponse schema validation and the new computeGrowthModifier
 * that iterates GrowthResponse[] instead of named modifier fields.
 */

import { describe, test, expect } from 'vitest';
import { GrowthResponseSchema } from '../../src/core/types/PlantSpecies';
import { computeGrowthModifier, computeSurvivalModifier } from '../../src/core/calculators/yieldModel';
import type { GrowthResponse } from '../../src/core/types/PlantSpecies';

// =============================================================================
// GrowthResponse schema validation
// =============================================================================

describe('GrowthResponseSchema', () => {
  test('validates a growth_rate response', () => {
    const result = GrowthResponseSchema.safeParse({
      factor: 'sun_hours',
      curve: { 4: 0.3, 6: 0.8, 8: 1.0, 10: 1.0 },
      effect: 'growth_rate',
    });
    expect(result.success).toBe(true);
  });

  test('validates a population_survival response', () => {
    const result = GrowthResponseSchema.safeParse({
      factor: 'photoperiod_h',
      curve: { 13: 1.0, 14: 0.6, 15: 0.1, 16: 0.0 },
      effect: 'population_survival',
      name: 'bolt',
    });
    expect(result.success).toBe(true);
  });

  test('rejects invalid effect', () => {
    const result = GrowthResponseSchema.safeParse({
      factor: 'sun_hours',
      curve: { 4: 0.3 },
      effect: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  test('requires factor and curve', () => {
    expect(GrowthResponseSchema.safeParse({ effect: 'growth_rate' }).success).toBe(false);
    expect(GrowthResponseSchema.safeParse({ factor: 'sun', effect: 'growth_rate' }).success).toBe(false);
  });
});

// =============================================================================
// computeGrowthModifier — iterates GrowthResponse[] for growth_rate
// =============================================================================

describe('computeGrowthModifier', () => {
  const responses: GrowthResponse[] = [
    { factor: 'sun_hours', curve: { 4: 0.3, 8: 1.0 }, effect: 'growth_rate' },
    { factor: 'temperature_f', curve: { 50: 0.2, 75: 1.0, 95: 0.3 }, effect: 'growth_rate' },
    // population_survival should be ignored by computeGrowthModifier
    { factor: 'photoperiod_h', curve: { 13: 1.0, 16: 0.0 }, effect: 'population_survival', name: 'bolt' },
  ];

  test('multiplies all growth_rate curves', () => {
    const conditions = { sun_hours: 8, temperature_f: 75 };
    // sun=1.0, temp=1.0 → product=1.0
    expect(computeGrowthModifier(responses, conditions)).toBeCloseTo(1.0);
  });

  test('partial conditions reduce modifier', () => {
    const conditions = { sun_hours: 6, temperature_f: 75 };
    // sun=interpolate(4:0.3, 8:1.0, at 6)=0.65, temp=1.0 → 0.65
    expect(computeGrowthModifier(responses, conditions)).toBeCloseTo(0.65);
  });

  test('ignores population_survival curves', () => {
    const conditions = { sun_hours: 8, temperature_f: 75, photoperiod_h: 16 };
    // Only growth_rate curves matter, not bolt
    expect(computeGrowthModifier(responses, conditions)).toBeCloseTo(1.0);
  });

  test('missing condition value defaults to 1.0 (no penalty)', () => {
    const conditions = { sun_hours: 8 };
    // temperature_f not provided → skip that curve (1.0 default)
    expect(computeGrowthModifier(responses, conditions)).toBeCloseTo(1.0);
  });

  test('empty response array returns 1.0', () => {
    expect(computeGrowthModifier([], {})).toBe(1.0);
  });
});

// =============================================================================
// computeSurvivalModifier — iterates GrowthResponse[] for population_survival
// =============================================================================

describe('computeSurvivalModifier', () => {
  const responses: GrowthResponse[] = [
    { factor: 'sun_hours', curve: { 4: 0.3, 8: 1.0 }, effect: 'growth_rate' },
    { factor: 'photoperiod_h', curve: { 13: 1.0, 14: 0.6, 15: 0.1, 16: 0.0 }, effect: 'population_survival', name: 'bolt' },
  ];

  test('returns survival fraction from population_survival curves', () => {
    const conditions = { photoperiod_h: 14 };
    expect(computeSurvivalModifier(responses, conditions)).toBeCloseTo(0.6);
  });

  test('ignores growth_rate curves', () => {
    const conditions = { sun_hours: 4, photoperiod_h: 13 };
    // Only survival curves: bolt at 13h = 1.0
    expect(computeSurvivalModifier(responses, conditions)).toBeCloseTo(1.0);
  });

  test('returns 1.0 with no survival curves', () => {
    const growthOnly: GrowthResponse[] = [
      { factor: 'sun_hours', curve: { 4: 0.3, 8: 1.0 }, effect: 'growth_rate' },
    ];
    expect(computeSurvivalModifier(growthOnly, {})).toBe(1.0);
  });

  test('missing condition value defaults to 1.0', () => {
    expect(computeSurvivalModifier(responses, {})).toBe(1.0);
  });
});
