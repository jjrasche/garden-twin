/**
 * Quality model tests.
 *
 * Quality = flavor × maturity (biomass ratio curve).
 * Maturity starts at 0 (no biomass), peaks at optimal_harvest_lbs,
 * and declines as plant overgrows. Quality is a grading signal, not a harvest gate.
 */

import { describe, test, expect } from 'vitest';
import {
  computeBiomassRatio,
  computeMaturityFactor,
  computeQuality,
} from '../../src/core/calculators/qualityModel';
import { LETTUCE_BSS } from '../../src/core/data/species/lettuce-bss';
import { POTATO_KENNEBEC } from '../../src/core/data/species/potato-kennebec';
import { KALE_RED_RUSSIAN } from '../../src/core/data/species/kale-red-russian';

// ── Biomass Ratio ───────────────────────────────────────────────────────────

describe('computeBiomassRatio', () => {
  test('returns 0 when no biomass', () => {
    expect(computeBiomassRatio(0, 0.25)).toBe(0);
  });

  test('returns 1.0 at optimal harvest point', () => {
    expect(computeBiomassRatio(0.25, 0.25)).toBeCloseTo(1.0);
  });

  test('returns > 1.0 when overgrown past optimal', () => {
    expect(computeBiomassRatio(0.50, 0.25)).toBeCloseTo(2.0);
  });

  test('returns 0.5 when halfway to optimal', () => {
    expect(computeBiomassRatio(0.125, 0.25)).toBeCloseTo(0.5);
  });
});

// ── Maturity Factor ────────────────────────────────────────────────────────

describe('computeMaturityFactor', () => {
  // New kale maturity curve (starts at 0)
  const kaleCurve = { 0: 0, 0.15: 0.3, 0.4: 0.7, 0.7: 0.9, 1.0: 1.0, 1.5: 0.8, 2.0: 0.6, 3.0: 0.2 };

  test('returns 0 maturity at zero biomass', () => {
    expect(computeMaturityFactor(0, kaleCurve)).toBe(0);
  });

  test('returns peak maturity at ratio 1.0 (optimal size)', () => {
    expect(computeMaturityFactor(1.0, kaleCurve)).toBeCloseTo(1.0);
  });

  test('returns rising maturity as plant grows toward optimal', () => {
    expect(computeMaturityFactor(0.4, kaleCurve)).toBeCloseTo(0.7);
  });

  test('declines as plant overgrows past optimal', () => {
    expect(computeMaturityFactor(2.0, kaleCurve)).toBeCloseTo(0.6);
    expect(computeMaturityFactor(3.0, kaleCurve)).toBeCloseTo(0.2);
  });

  test('interpolates between curve points', () => {
    const maturity = computeMaturityFactor(1.5, kaleCurve);
    expect(maturity).toBeCloseTo(0.8);
  });
});

// ── Compute Quality (integration) ───────────────────────────────────────────

describe('computeQuality', () => {
  const warmConditions = { temperature_f: 65, soil_temp_f: 60, photoperiod_h: 14, sun_hours: 8 };
  const hotConditions = { temperature_f: 85, soil_temp_f: 75, photoperiod_h: 15, sun_hours: 10 };

  test('quality is near-zero at very low biomass (maturity curve starts at 0)', () => {
    const result = computeQuality(LETTUCE_BSS, warmConditions, 0.001);
    expect(result.quality_score).toBeLessThan(0.05);
    expect(result.flavor_score).toBeGreaterThan(0);
  });

  test('quality rises with biomass as maturity increases', () => {
    const tiny = computeQuality(LETTUCE_BSS, warmConditions, 0.01);
    const baby = computeQuality(LETTUCE_BSS, warmConditions, 0.05);
    const mid = computeQuality(LETTUCE_BSS, warmConditions, 0.10);
    expect(baby.quality_score).toBeGreaterThan(tiny.quality_score);
    expect(mid.quality_score).toBeGreaterThan(baby.quality_score);
  });

  test('quality peaks at optimal biomass with good flavor', () => {
    const result = computeQuality(LETTUCE_BSS, warmConditions, 0.15);
    expect(result.quality_score).toBeGreaterThan(0.5);
    expect(result.maturity).toBeCloseTo(1.0);
    expect(result.biomass_ratio).toBeCloseTo(1.0);
  });

  test('quality declines as plant overgrows past optimal', () => {
    const atOptimal = computeQuality(LETTUCE_BSS, warmConditions, 0.15);
    const overgrown = computeQuality(LETTUCE_BSS, warmConditions, 0.30);
    expect(overgrown.quality_score).toBeLessThan(atOptimal.quality_score);
    expect(overgrown.maturity).toBeLessThan(atOptimal.maturity);
    expect(overgrown.biomass_ratio).toBeCloseTo(2.0);
  });

  test('quality degrades with bad conditions (hot lettuce = bitter)', () => {
    const good = computeQuality(LETTUCE_BSS, warmConditions, 0.15);
    const bad = computeQuality(LETTUCE_BSS, hotConditions, 0.15);
    expect(bad.quality_score).toBeLessThan(good.quality_score);
    expect(bad.flavor_score).toBeLessThan(good.flavor_score);
  });

  test('potato quality stays high across wide biomass range', () => {
    const conditions = { temperature_f: 70, soil_temp_f: 60, photoperiod_h: 14, sun_hours: 8 };
    const atSmall = computeQuality(POTATO_KENNEBEC, conditions, 1.0);
    const atOptimal = computeQuality(POTATO_KENNEBEC, conditions, 1.5);
    const overgrown = computeQuality(POTATO_KENNEBEC, conditions, 3.0);

    expect(atSmall.quality_score).toBeGreaterThan(0.5);
    expect(atOptimal.quality_score).toBeGreaterThan(0.7);
    expect(overgrown.quality_score).toBeLessThan(atOptimal.quality_score);
  });

  test('kale quality at baby vs optimal vs overgrown', () => {
    const conditions = { temperature_f: 65, soil_temp_f: 60, photoperiod_h: 14, sun_hours: 8 };
    const baby = computeQuality(KALE_RED_RUSSIAN, conditions, 0.08);
    const optimal = computeQuality(KALE_RED_RUSSIAN, conditions, 0.25);
    const overgrown = computeQuality(KALE_RED_RUSSIAN, conditions, 0.75);

    expect(baby.quality_score).toBeGreaterThan(0);
    expect(optimal.quality_score).toBeGreaterThan(baby.quality_score);
    expect(overgrown.quality_score).toBeLessThan(optimal.quality_score);
  });
});
