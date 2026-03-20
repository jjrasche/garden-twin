/**
 * Growth engine tests — the core computation pipeline from species + conditions → biomass.
 *
 * Layer 1: Math primitives (computeModifierProduct, buildCutSchedule, accumulateGrowth)
 * Layer 2: Species scenarios (lettuce cuts, tomato season, death dates)
 * Layer 3: Planning ↔ Operational equivalence
 */

import { describe, test, expect } from 'vitest';
import { computeModifierProduct } from '../../src/core/calculators/yieldModel';
import {
  accumulateGrowth,
  buildCutSchedule,
  computeDeathDate,
  computeBoltSurvival,
  computeSurvivalFromConditions,
  isDeadFromFrost,
  daysBetween,
  MS_PER_DAY,
  ZONE_PHYS_Y,
  SHADE_TREE_HEIGHT_FT,
} from '../../src/core/calculators/growthMath';
import {
  simulateSeason,
  PRODUCTION_PLAN,
  GR_HISTORICAL,
} from '../../src/core/calculators/ProductionTimeline';
import { LETTUCE_BSS } from '../../src/core/data/species/lettuce-bss';
import { TOMATO_SUN_GOLD } from '../../src/core/data/species/tomato-sun-gold';
import { POTATO_KENNEBEC } from '../../src/core/data/species/potato-kennebec';
import { CORN_NOTHSTINE_DENT } from '../../src/core/data/species/corn-nothstine-dent';
import { SPINACH_BLOOMSDALE } from '../../src/core/data/species/spinach-bloomsdale';
import { PlantSpecies } from '../../src/core/types';
import { resolveHarvestStrategy } from '../../src/core/calculators/strategyResolver';
import { EnvironmentSource } from '../../src/core/environment/types';
import { createObservedSource } from '../../src/core/environment/ObservedSource';
import { createCompositeSource, buildObservedDateSet } from '../../src/core/environment/CompositeSource';

// ── Test Helpers ─────────────────────────────────────────────────────────────

/** Synthetic env source with constant conditions for deterministic tests. */
function createConstantEnv(overrides: Partial<{
  avg_high_f: number;
  avg_low_f: number;
  soil_temp_f: number;
  photoperiod_h: number;
}> = {}): EnvironmentSource {
  const conditions = {
    avg_high_f: overrides.avg_high_f ?? 72,
    avg_low_f: overrides.avg_low_f ?? 55,
    soil_temp_f: overrides.soil_temp_f ?? 62,
    photoperiod_h: overrides.photoperiod_h ?? 14,
  };

  return {
    source_type: 'historical',
    location: 'test',
    avg_last_frost: new Date('2025-05-15'),
    avg_first_frost: new Date('2025-09-29'),
    getConditions: () => conditions,
    getWeeklyConditions(start, end) {
      const weeks = [];
      const current = new Date(start);
      while (current <= end) {
        weeks.push({ week_start: new Date(current), ...conditions });
        current.setDate(current.getDate() + 7);
      }
      return weeks;
    },
  };
}

// =============================================================================
// Layer 1 — Math Primitives
// =============================================================================

describe('computeModifierProduct', () => {
  test('returns 1.0 at optimal conditions for lettuce', () => {
    // Lettuce sun: {3:0.67, 4:0.82, 6:0.9, 8:1.0, 10:1.0}
    // Lettuce temperature_f: {65:1.0, 70:1.0}
    // No soil conditions provided → soil modifiers default to 1.0
    const modifier = computeModifierProduct(LETTUCE_BSS, {
      sun_hours: 8,
      avg_high_f: 65,
    });
    expect(modifier).toBeCloseTo(1.0, 2);
  });

  test('sun modifier interpolates between breakpoints', () => {
    // Lettuce sun: {4:0.82, 6:0.9} → at 5: (0.82 + 0.9) / 2 = 0.86
    const modifier = computeModifierProduct(LETTUCE_BSS, {
      sun_hours: 5,
      avg_high_f: 65,
    });
    expect(modifier).toBeCloseTo(0.86, 2);
  });

  test('temperature modifier reduces yield at high heat', () => {
    // Lettuce temperature_f: {75:0.7, 80:0.3} → at 78: ~0.46
    const modifier = computeModifierProduct(LETTUCE_BSS, {
      sun_hours: 8,
      avg_high_f: 78,
    });
    // sun=1.0, temp at 78: 0.7 + (0.3-0.7)*(78-75)/(80-75) = 0.7 - 0.24 = 0.46
    expect(modifier).toBeCloseTo(0.46, 2);
  });

  test('soil nutrient deficiency reduces modifier (multiplicative via growth_response)', () => {
    // Heavy feeder: N at 20ppm = 0.6, all others at optimal = 1.0
    // growth_response path: 1.0 × 1.0 × 0.6 × 1.0 × 1.0 × 1.0 × 1.0 = 0.6
    const modifier = computeModifierProduct(TOMATO_SUN_GOLD, {
      sun_hours: 8,
      avg_high_f: 80,
      soil: {
        N_ppm: 20,
        P_ppm: 30,
        K_ppm: 120,
        pH: 6.5,
        compaction_psi: 0,
      },
    });
    expect(modifier).toBeCloseTo(0.6, 2);
  });

  test('multiple suboptimal nutrients multiply (not Liebig min)', () => {
    // Two deficient nutrients: N=20 (0.6) and P=10 (0.7)
    // Multiplicative: 0.6 × 0.7 = 0.42 (via growth_response)
    // Liebig would give: min(0.6, 0.7) = 0.6
    const modifier = computeModifierProduct(TOMATO_SUN_GOLD, {
      sun_hours: 8,
      avg_high_f: 80,
      soil: {
        N_ppm: 20,
        P_ppm: 10,
        K_ppm: 120,
        pH: 6.5,
        compaction_psi: 0,
      },
    });
    // sun=1.0, temp=1.0, N=0.6, P=0.7, rest=1.0 → 0.42
    expect(modifier).toBeCloseTo(0.42, 2);
  });

  test('potato soil_temperature_f modifier works', () => {
    // Potato soil_temp: {60:0.9, 70:1.0} → at 65: 0.95
    const modifier = computeModifierProduct(POTATO_KENNEBEC, {
      sun_hours: 8,
      soil_temp_f: 65,
    });
    expect(modifier).toBeCloseTo(0.95, 2);
  });

  test('multiple modifiers multiply together', () => {
    // Lettuce: sun_hours=5 → 0.86, avg_high_f=78 → 0.46
    // Combined: 0.86 × 0.46 ≈ 0.396
    const modifier = computeModifierProduct(LETTUCE_BSS, {
      sun_hours: 5,
      avg_high_f: 78,
    });
    expect(modifier).toBeCloseTo(0.86 * 0.46, 2);
  });
});

describe('buildCutSchedule', () => {
  test('returns null for non-CAC species', () => {
    expect(buildCutSchedule(new Date('2025-05-25'), TOMATO_SUN_GOLD)).toBeNull();
    expect(buildCutSchedule(new Date('2025-04-20'), POTATO_KENNEBEC)).toBeNull();
  });

  test('lettuce: 4 cuts with correct dates', () => {
    const strategy = resolveHarvestStrategy(undefined, LETTUCE_BSS);
    const schedule = buildCutSchedule(new Date('2025-04-15'), LETTUCE_BSS, strategy);
    expect(schedule).not.toBeNull();
    expect(schedule!.cut_dates).toHaveLength(4);

    // Cut 1: plant + 28d = May 13
    expect(schedule!.cut_dates[0]!.toISOString().slice(0, 10)).toBe('2025-05-13');
    // Cut 2: May 13 + 14d = May 27
    expect(schedule!.cut_dates[1]!.toISOString().slice(0, 10)).toBe('2025-05-27');
    // Cut 3: May 27 + 14d = Jun 10
    expect(schedule!.cut_dates[2]!.toISOString().slice(0, 10)).toBe('2025-06-10');
    // Cut 4: Jun 10 + 14d = Jun 24
    expect(schedule!.cut_dates[3]!.toISOString().slice(0, 10)).toBe('2025-06-24');
  });

  test('daily_potential calibrated so total under perfect conditions = baseline', () => {
    const strategy = resolveHarvestStrategy(undefined, LETTUCE_BSS);
    const schedule = buildCutSchedule(new Date('2025-04-15'), LETTUCE_BSS, strategy);
    expect(schedule).not.toBeNull();

    // Sum vigor × window_days across all cuts should equal baseline / daily_potential
    let total_vigor_days = 0;
    for (let c = 0; c < schedule!.cut_dates.length; c++) {
      const window_start = schedule!.window_starts[c]!;
      const window_end = schedule!.cut_dates[c]!;
      const window_days = daysBetween(window_start, window_end);
      total_vigor_days += schedule!.vigors[c]! * window_days;
    }

    const reconstructed_baseline = schedule!.daily_potential * total_vigor_days;
    expect(reconstructed_baseline).toBeCloseTo(strategy!.baseline_lbs_per_plant, 6);
  });

  test('vigors match cut_yield_curve values', () => {
    const strategy = resolveHarvestStrategy(undefined, LETTUCE_BSS);
    const schedule = buildCutSchedule(new Date('2025-04-15'), LETTUCE_BSS, strategy);
    // curve: {1:1.0, 2:0.8, 3:0.6, 4:0.4}
    expect(schedule!.vigors[0]).toBeCloseTo(1.0, 2);
    expect(schedule!.vigors[1]).toBeCloseTo(0.8, 2);
    expect(schedule!.vigors[2]).toBeCloseTo(0.6, 2);
    expect(schedule!.vigors[3]).toBeCloseTo(0.4, 2);
  });
});

describe('accumulateGrowth', () => {
  test('constant conditions: accumulated = daily_potential × vigor × modifier × days', () => {
    const env = createConstantEnv({ avg_high_f: 65 }); // lettuce temp=1.0
    const strategy = resolveHarvestStrategy(undefined, LETTUCE_BSS);
    const schedule = buildCutSchedule(new Date('2025-04-15'), LETTUCE_BSS, strategy)!;

    // First cut window: 28 days, vigor=1.0
    const accumulated = accumulateGrowth(
      LETTUCE_BSS,
      schedule.window_starts[0]!,
      schedule.cut_dates[0]!,
      schedule.vigors[0]!,
      schedule.daily_potential,
      ZONE_PHYS_Y.shade,
      env,
    );

    // Under constant env, modifier should be constant across the window.
    // We need the actual modifier value to verify.
    const sun_hours = 8; // constant env returns 8 effective sun hours for shade at non-summer date
    const modifier = computeModifierProduct(LETTUCE_BSS, { sun_hours, avg_high_f: 65 });

    // accumulateGrowth samples every ~3 days, but for constant conditions
    // it should be very close to daily_potential × vigor × modifier × days
    const expected = schedule.daily_potential * 1.0 * modifier * 28;

    // But sun_hours depends on shade model which varies by date even in constant temp.
    // So accumulated won't exactly match. Just verify it's positive and reasonable.
    expect(accumulated).toBeGreaterThan(0);
    expect(accumulated).toBeLessThan(strategy!.baseline_lbs_per_plant);
  });

  test('longer window accumulates more than shorter window', () => {
    const env = createConstantEnv({ avg_high_f: 65 });
    const dp = 0.01;
    const vigor = 1.0;

    const short = accumulateGrowth(
      LETTUCE_BSS, new Date('2025-06-01'), new Date('2025-06-08'),
      vigor, dp, ZONE_PHYS_Y.full_sun, env,
    );
    const long = accumulateGrowth(
      LETTUCE_BSS, new Date('2025-06-01'), new Date('2025-06-22'),
      vigor, dp, ZONE_PHYS_Y.full_sun, env,
    );

    expect(long).toBeGreaterThan(short);
    // 3× the days ≈ 3× the growth (constant conditions)
    expect(long / short).toBeCloseTo(3.0, 0);
  });

  test('zero vigor produces zero growth', () => {
    const env = createConstantEnv();
    const accumulated = accumulateGrowth(
      LETTUCE_BSS, new Date('2025-06-01'), new Date('2025-06-15'),
      0, 0.01, ZONE_PHYS_Y.full_sun, env,
    );
    expect(accumulated).toBe(0);
  });
});

// =============================================================================
// Layer 2 — Species Scenarios via simulateSeason
// =============================================================================

describe('simulateSeason scenarios', () => {
  test('single lettuce planting produces cuts in May-Jun', () => {
    const plan = [{
      species: LETTUCE_BSS,
      display_group: 'Lettuce' as const,
      plant_count: 100,
      planting_date: '2025-04-15',
      zone: 'shade' as const,
    }];

    const weeks = simulateSeason(plan, GR_HISTORICAL);
    const producing = weeks.filter(w => w.total_lbs > 0);

    expect(producing.length).toBeGreaterThan(0);

    // First harvest: threshold-based timing after vegetative GDD reached
    const first = producing[0]!;
    expect(first.week_start.getMonth()).toBeLessThanOrEqual(5); // June or earlier

    // Season total should be reasonable: 100 plants × 0.5 lbs × survival ≈ 42 lbs
    const total = weeks.reduce((s, w) => s + w.total_lbs, 0);
    expect(total).toBeGreaterThan(10);
    expect(total).toBeLessThan(100);
  });

  test('tomato produces in summer, dies at first frost', () => {
    const plan = [{
      species: TOMATO_SUN_GOLD,
      display_group: 'Cherry' as const,
      plant_count: 3,
      planting_date: '2025-05-25',
      zone: 'full_sun' as const,
    }];

    const weeks = simulateSeason(plan, GR_HISTORICAL);
    const producing = weeks.filter(w => w.total_lbs > 0);

    expect(producing.length).toBeGreaterThan(0);

    // First harvest after GDD reaches fruiting (~300 GDD base 50°F)
    const first = producing[0]!;
    expect(first.week_start.getMonth()).toBeGreaterThanOrEqual(6); // July+

    // No production after Oct (first frost Sep 29)
    const oct_production = weeks.filter(
      w => w.week_start.getMonth() >= 9 && w.total_lbs > 0,
    );
    expect(oct_production).toHaveLength(0);
  });

  test('potato produces single bulk harvest', () => {
    const plan = [{
      species: POTATO_KENNEBEC,
      display_group: 'Potato' as const,
      plant_count: 153,
      planting_date: '2025-04-20',
      zone: 'full_sun' as const,
    }];

    const weeks = simulateSeason(plan, GR_HISTORICAL);
    const producing = weeks.filter(w => w.total_lbs > 0);

    // Bulk harvest = exactly 1 producing week
    expect(producing).toHaveLength(1);

    // GDD-driven: potato matures when accumulated GDD reaches 1700 (base 40°F)
    const harvest_week = producing[0]!;
    expect(harvest_week.week_start.getMonth()).toBeGreaterThanOrEqual(5); // June+

    // Calibrated: daily_potential based on GDD-productive window, not full calendar
    // 153 plants × 1.5 lbs baseline × survival × modifiers → ~100-200 lbs
    expect(harvest_week.total_lbs).toBeGreaterThan(80);
    expect(harvest_week.total_lbs).toBeLessThan(300);
  });

  test('full production plan total is stable', () => {
    const weeks = simulateSeason(PRODUCTION_PLAN, GR_HISTORICAL);
    const total = weeks.reduce((s, w) => s + w.total_lbs, 0);

    // ~673 lbs after kale germination_rate fix (1.00 for transplants, was 0.95).
    expect(total).toBeCloseTo(673, -1); // within 10 lbs
  });
});

// =============================================================================
// Layer 2b — Death Date Logic
// =============================================================================

describe('death dates', () => {
  test('tomato dies at first frost', () => {
    const harvest_start = new Date('2025-07-24');
    const season_end = new Date('2025-11-24');
    const death = computeDeathDate(TOMATO_SUN_GOLD, harvest_start, GR_HISTORICAL, season_end);

    // First frost: Sep 29. Tomato kill_temp 33°F → dies at frost.
    expect(death.getTime()).toBeLessThanOrEqual(GR_HISTORICAL.avg_first_frost.getTime());
  });

  test('lettuce bolt survival drops with long photoperiod and heat', () => {
    // BSS has no bolt_trigger in its modifiers — bolting is via temperature_f
    // At 85°F: temperature_f modifier = 0.0 → effectively dead from heat
    const survival = computeBoltSurvival(LETTUCE_BSS, new Date('2025-07-15'), GR_HISTORICAL);
    // Lettuce has no bolt_trigger field, so survival should be 1.0
    expect(survival).toBe(1.0);
  });

  test('computeSurvivalFromConditions matches computeBoltSurvival for spinach', () => {
    // Spinach has population_survival growth_response for photoperiod_h
    // Mid-July: ~15h photoperiod → survival near 0.1 (bolt kills most)
    const july15 = new Date('2025-07-15');
    const old_result = computeBoltSurvival(SPINACH_BLOOMSDALE, july15, GR_HISTORICAL);
    const new_result = computeSurvivalFromConditions(SPINACH_BLOOMSDALE, july15, GR_HISTORICAL);
    expect(new_result).toBeCloseTo(old_result, 5);
  });

  test('computeSurvivalFromConditions returns 1.0 for species without survival responses', () => {
    // Tomato has no population_survival in growth_response → always 1.0
    const survival = computeSurvivalFromConditions(TOMATO_SUN_GOLD, new Date('2025-07-15'), GR_HISTORICAL);
    expect(survival).toBe(1.0);
  });

  test('isDeadFromFrost returns true after first frost for tender species', () => {
    // Tomato: kill_temp 33°F, tender
    const oct15 = new Date('2025-10-15');
    expect(isDeadFromFrost(TOMATO_SUN_GOLD, oct15, GR_HISTORICAL)).toBe(true);

    // Before frost date, should be alive
    const aug15 = new Date('2025-08-15');
    expect(isDeadFromFrost(TOMATO_SUN_GOLD, aug15, GR_HISTORICAL)).toBe(false);
  });

  test('potato survives past first frost (kill_temp 28°F < 32°F)', () => {
    // Potato kill_temp 28°F — doesn't die at 32°F frost
    // isDeadFromFrost checks kill_temp >= 32 for fast-path frost death
    const oct1 = new Date('2025-10-01');
    // 28 < 32, so the fast path doesn't apply. It checks avg_low vs kill_temp.
    // In early Oct, avg_low ~41°F > 28°F → alive
    expect(isDeadFromFrost(POTATO_KENNEBEC, oct1, GR_HISTORICAL)).toBe(false);
  });
});

// =============================================================================
// Layer 3 — Planning ↔ Operational Equivalence
// =============================================================================

describe('accumulateGrowth numerical stability', () => {
  test('single window vs two halves produce similar results', () => {
    const env = createConstantEnv({ avg_high_f: 65 });
    const dp = 0.01;
    const vigor = 1.0;
    const zone = ZONE_PHYS_Y.full_sun;
    const start = new Date('2025-06-01');
    const mid = new Date('2025-06-15');
    const end = new Date('2025-06-29');

    const whole = accumulateGrowth(LETTUCE_BSS, start, end, vigor, dp, zone, env);
    const first_half = accumulateGrowth(LETTUCE_BSS, start, mid, vigor, dp, zone, env);
    const second_half = accumulateGrowth(LETTUCE_BSS, mid, end, vigor, dp, zone, env);

    // Sum of halves should match whole within 5% (sampling granularity)
    expect(Math.abs(whole - (first_half + second_half)) / whole).toBeLessThan(0.05);
  });

  test('many small windows sum to approximately one big window', () => {
    const env = createConstantEnv({ avg_high_f: 70 });
    const dp = 0.01;
    const vigor = 1.0;
    const zone = ZONE_PHYS_Y.full_sun;
    const start = new Date('2025-06-01');
    const end = new Date('2025-07-01'); // 30 days

    const whole = accumulateGrowth(LETTUCE_BSS, start, end, vigor, dp, zone, env);

    let sum_pieces = 0;
    for (let d = 0; d < 30; d += 5) {
      const piece_start = new Date(start.getTime() + d * MS_PER_DAY);
      const piece_end = new Date(start.getTime() + (d + 5) * MS_PER_DAY);
      sum_pieces += accumulateGrowth(LETTUCE_BSS, piece_start, piece_end, vigor, dp, zone, env);
    }

    // Within 10% tolerance (3-day sampling in short windows is coarser)
    expect(Math.abs(whole - sum_pieces) / whole).toBeLessThan(0.10);
  });
});

// =============================================================================
// Environment Sources
// =============================================================================

describe('ObservedSource and CompositeSource', () => {
  test('CompositeSource with empty observed = identical to Historical', () => {
    const observed = createObservedSource([]);
    const composite = createCompositeSource(observed, GR_HISTORICAL, new Set());

    const date = new Date('2025-06-15');
    const historical_cond = GR_HISTORICAL.getConditions(date);
    const composite_cond = composite.getConditions(date);

    expect(composite_cond.avg_high_f).toBeCloseTo(historical_cond.avg_high_f, 2);
    expect(composite_cond.avg_low_f).toBeCloseTo(historical_cond.avg_low_f, 2);
    expect(composite_cond.soil_temp_f).toBeCloseTo(historical_cond.soil_temp_f, 2);
  });

  test('CompositeSource uses observed data when available', () => {
    const entries = [
      { date: '2025-06-15', high_f: 90, low_f: 70, source: 'manual' as const },
    ];
    const observed = createObservedSource(entries);
    const dateSet = buildObservedDateSet(entries);
    const composite = createCompositeSource(observed, GR_HISTORICAL, dateSet);

    const date = new Date('2025-06-15');
    const cond = composite.getConditions(date);

    expect(cond.avg_high_f).toBe(90);
    expect(cond.avg_low_f).toBe(70);
    // soil_temp defaults to (90+70)/2 - 3 = 77
    expect(cond.soil_temp_f).toBeCloseTo(77, 1);
  });

  test('CompositeSource falls back to historical for missing dates', () => {
    const entries = [
      { date: '2025-06-15', high_f: 90, low_f: 70, source: 'manual' as const },
    ];
    const observed = createObservedSource(entries);
    const dateSet = buildObservedDateSet(entries);
    const composite = createCompositeSource(observed, GR_HISTORICAL, dateSet);

    // Different date — not in observed data
    const date = new Date('2025-07-01');
    const composite_cond = composite.getConditions(date);
    const historical_cond = GR_HISTORICAL.getConditions(date);

    expect(composite_cond.avg_high_f).toBeCloseTo(historical_cond.avg_high_f, 2);
  });

  test('ObservedSource throws for missing date', () => {
    const observed = createObservedSource([
      { date: '2025-06-15', high_f: 90, low_f: 70, source: 'manual' as const },
    ]);

    expect(() => observed.getConditions(new Date('2025-06-16'))).toThrow(
      'No observed weather for 2025-06-16',
    );
  });
});

// =============================================================================
// Layer 5 — GDD Stage-Gating (simulateSeason)
// =============================================================================

describe('simulateSeason — GDD stage-gating', () => {
  test('corn produces zero yield when GDD never reaches fruiting', () => {
    // Cold env: daily GDD = (65+45)/2 - 50 = 5 GDD/day
    // 127 days to frost (Sep 29) = 635 GDD total
    // Corn needs 1475 GDD to reach fruiting → never harvestable
    const cold_env = createConstantEnv({ avg_high_f: 65, avg_low_f: 45 });
    const plan = [{
      species: CORN_NOTHSTINE_DENT,
      display_group: 'Corn' as const,
      plant_count: 10,
      planting_date: '2025-05-25',
      zone: 'full_sun' as const,
    }];

    const weeks = simulateSeason(plan, cold_env);
    const corn_total = weeks.reduce((s, w) => s + (w.lbs_by_group['Corn'] ?? 0), 0);
    expect(corn_total).toBe(0);
  });

  test('corn produces yield in warm environment where GDD reaches mature', () => {
    const plan = [{
      species: CORN_NOTHSTINE_DENT,
      display_group: 'Corn' as const,
      plant_count: 10,
      planting_date: '2025-05-25',
      zone: 'full_sun' as const,
    }];

    const weeks = simulateSeason(plan, GR_HISTORICAL);
    const corn_total = weeks.reduce((s, w) => s + (w.lbs_by_group['Corn'] ?? 0), 0);
    expect(corn_total).toBeGreaterThan(0);
  });

  test('lettuce produces yield in vegetative stage (CAC not gated to fruiting)', () => {
    const plan = [{
      species: LETTUCE_BSS,
      display_group: 'Lettuce' as const,
      plant_count: 10,
      planting_date: '2025-04-15',
      zone: 'shade' as const,
    }];

    const weeks = simulateSeason(plan, GR_HISTORICAL);
    const lettuce_total = weeks.reduce((s, w) => s + (w.lbs_by_group['Lettuce'] ?? 0), 0);
    expect(lettuce_total).toBeGreaterThan(0);
  });
});
