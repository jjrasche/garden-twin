/**
 * Quality model tests.
 *
 * Quality = f(flavor, biomass_readiness, freshness).
 * All three must be good for high quality.
 */

import { describe, test, expect } from 'vitest';
import {
  computeBiomassReadiness,
  computeFreshnessFactor,
  isHarvestable,
  computeQuality,
} from '../../src/core/calculators/qualityModel';
import { LETTUCE_BSS } from '../../src/core/data/species/lettuce-bss';
import { POTATO_KENNEBEC } from '../../src/core/data/species/potato-kennebec';
import { KALE_RED_RUSSIAN } from '../../src/core/data/species/kale-red-russian';

// ── Biomass Readiness ───────────────────────────────────────────────────────

describe('computeBiomassReadiness', () => {
  test('returns 0 when no biomass', () => {
    expect(computeBiomassReadiness(0, 0.05)).toBe(0);
  });

  test('returns 1.0 when at minimum harvest threshold', () => {
    expect(computeBiomassReadiness(0.05, 0.05)).toBeCloseTo(1.0);
  });

  test('returns > 1.0 when overgrown past threshold', () => {
    expect(computeBiomassReadiness(0.10, 0.05)).toBeCloseTo(2.0);
  });

  test('returns 0.5 when halfway to threshold', () => {
    expect(computeBiomassReadiness(0.025, 0.05)).toBeCloseTo(0.5);
  });
});

// ── Freshness Factor ────────────────────────────────────────────────────────

describe('computeFreshnessFactor', () => {
  const lettuceCurve = { 0: 1.0, 3: 0.8, 5: 0.4, 7: 0.1 };

  test('returns 1.0 at day 0 (just became harvestable)', () => {
    expect(computeFreshnessFactor(0, lettuceCurve)).toBeCloseTo(1.0);
  });

  test('decays according to species curve', () => {
    expect(computeFreshnessFactor(3, lettuceCurve)).toBeCloseTo(0.8);
    expect(computeFreshnessFactor(5, lettuceCurve)).toBeCloseTo(0.4);
  });

  test('interpolates between curve points', () => {
    const freshness = computeFreshnessFactor(4, lettuceCurve);
    expect(freshness).toBeGreaterThan(0.4);
    expect(freshness).toBeLessThan(0.8);
  });

  test('returns low value past end of curve', () => {
    expect(computeFreshnessFactor(10, lettuceCurve)).toBeLessThanOrEqual(0.1);
  });

  test('potato has slow decay (30+ days stable)', () => {
    const potatoCurve = { 0: 1.0, 14: 1.0, 30: 0.9, 45: 0.5 };
    expect(computeFreshnessFactor(14, potatoCurve)).toBeCloseTo(1.0);
    expect(computeFreshnessFactor(30, potatoCurve)).toBeCloseTo(0.9);
  });

  test('returns 1.0 when days is 0 regardless of curve', () => {
    expect(computeFreshnessFactor(0, { 0: 1.0, 1: 0.0 })).toBeCloseTo(1.0);
  });
});

// ── isHarvestable ───────────────────────────────────────────────────────────

describe('isHarvestable', () => {
  test('false when below minimum', () => {
    expect(isHarvestable(0.04, 0.05)).toBe(false);
  });

  test('true when at minimum', () => {
    expect(isHarvestable(0.05, 0.05)).toBe(true);
  });

  test('true when above minimum', () => {
    expect(isHarvestable(0.10, 0.05)).toBe(true);
  });
});

// ── Compute Quality (integration) ───────────────────────────────────────────

describe('computeQuality', () => {
  // Warm conditions for lettuce (good flavor ~0.65)
  const warmConditions = { temperature_f: 65, soil_temp_f: 60, photoperiod_h: 14, sun_hours: 8 };
  // Hot conditions for lettuce (bad flavor — bitter)
  const hotConditions = { temperature_f: 85, soil_temp_f: 75, photoperiod_h: 15, sun_hours: 10 };

  test('quality is 0 when biomass below minimum', () => {
    const result = computeQuality(LETTUCE_BSS, warmConditions, 0.01, 0.05, 0);
    expect(result.quality_score).toBe(0);
    expect(result.biomass_readiness).toBeLessThan(1.0);
  });

  test('quality is high when biomass ready + good flavor + fresh', () => {
    const result = computeQuality(LETTUCE_BSS, warmConditions, 0.06, 0.05, 0);
    expect(result.quality_score).toBeGreaterThan(0.5);
    expect(result.flavor_score).toBeGreaterThan(0.5);
    expect(result.freshness).toBeCloseTo(1.0);
  });

  test('quality degrades with days since harvestable', () => {
    const fresh = computeQuality(LETTUCE_BSS, warmConditions, 0.06, 0.05, 0);
    const aged = computeQuality(LETTUCE_BSS, warmConditions, 0.06, 0.05, 5);
    expect(aged.quality_score).toBeLessThan(fresh.quality_score);
    expect(aged.freshness).toBeLessThan(fresh.freshness);
  });

  test('quality degrades with bad conditions (hot lettuce = bitter)', () => {
    const good = computeQuality(LETTUCE_BSS, warmConditions, 0.06, 0.05, 0);
    const bad = computeQuality(LETTUCE_BSS, hotConditions, 0.06, 0.05, 0);
    expect(bad.quality_score).toBeLessThan(good.quality_score);
    expect(bad.flavor_score).toBeLessThan(good.flavor_score);
  });

  test('potato quality stays high for weeks after maturity', () => {
    const conditions = { temperature_f: 70, soil_temp_f: 60, photoperiod_h: 14, sun_hours: 8 };
    const day0 = computeQuality(POTATO_KENNEBEC, conditions, 1.5, 1.0, 0);
    const day14 = computeQuality(POTATO_KENNEBEC, conditions, 1.5, 1.0, 14);
    const day30 = computeQuality(POTATO_KENNEBEC, conditions, 1.5, 1.0, 30);

    expect(day0.quality_score).toBeGreaterThan(0.7);
    expect(day14.quality_score).toBeGreaterThan(0.7);  // Still high at 2 weeks
    expect(day30.quality_score).toBeGreaterThan(0.5);   // Starting to decline at 1 month
  });

  test('species without flavor curves gets quality from freshness alone', () => {
    // Companion plants or species with no flavor_response default to flavor 1.0
    const result = computeQuality(KALE_RED_RUSSIAN, warmConditions, 0.10, 0.08, 0);
    expect(result.quality_score).toBeGreaterThan(0);
    expect(result.flavor_score).toBeGreaterThan(0);
  });
});
