/**
 * Unified Growth Engine — regression tests + new state machine tests.
 *
 * Section A: Regression — old engine still matches simulateSeason.
 * Section B: New engine — tickPlant, tickDay, simulateGrowth (TDD).
 */

import { describe, test, expect } from 'vitest';
import {
  simulateSeason,
  PRODUCTION_PLAN,
  GR_HISTORICAL,
} from '../../src/core/calculators/ProductionTimeline';
import type { ConditionsResolver } from '../../src/core/environment';
import type { PlantState, GrowthEvent } from '../../src/core/types/PlantState';
import { createStressCounters } from '../../src/core/types/PlantState';
import { computeDevelopmentModifier } from '../../src/core/calculators/yieldModel';
import { tickPlant, tickDay } from '../../src/core/engine/tickDay';
import { simulateGrowth } from '../../src/core/engine/simulate';
import { SPINACH_BLOOMSDALE } from '../../src/core/data/species/spinach-bloomsdale';
import { TOMATO_SUN_GOLD } from '../../src/core/data/species/tomato-sun-gold';
import { CORN_NOTHSTINE_DENT } from '../../src/core/data/species/corn-nothstine-dent';
import { KALE_RED_RUSSIAN } from '../../src/core/data/species/kale-red-russian';
import { POTATO_KENNEBEC } from '../../src/core/data/species/potato-kennebec';
import type { PlantSpecies, GrowthResponse } from '../../src/core/types/PlantSpecies';

// ── Shared Helpers ───────────────────────────────────────────────────────────

function createConstantEnv(overrides: Partial<{
  avg_high_f: number;
  avg_low_f: number;
  soil_temp_f: number;
  photoperiod_h: number;
  soil_moisture_pct_fc: number;
}> = {}): ConditionsResolver {
  const conditions = {
    avg_high_f: overrides.avg_high_f ?? 72,
    avg_low_f: overrides.avg_low_f ?? 55,
    soil_temp_f: overrides.soil_temp_f ?? 62,
    photoperiod_h: overrides.photoperiod_h ?? 14,
    soil_moisture_pct_fc: overrides.soil_moisture_pct_fc ?? 80,
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

function createPlant(species: PlantSpecies, overrides: Partial<PlantState> = {}): PlantState {
  return {
    plant_id: overrides.plant_id ?? `${species.id}_0`,
    species_id: species.id,
    subcell_id: overrides.subcell_id ?? 'sub_600_180',
    planted_date: overrides.planted_date ?? '2025-05-01',
    stage: overrides.stage ?? 'seed',
    accumulated_dev: overrides.accumulated_dev ?? 0,
    accumulated_gdd: overrides.accumulated_gdd ?? 0,
    accumulated_lbs: overrides.accumulated_lbs ?? 0,
    harvest_strategy_id: overrides.harvest_strategy_id,
    cut_number: overrides.cut_number ?? 0,
    vigor: overrides.vigor ?? 1.0,
    daily_potential: overrides.daily_potential ?? 0.01,
    stress: overrides.stress ?? createStressCounters(),
    is_harvestable: overrides.is_harvestable ?? false,
    is_dead: overrides.is_dead ?? false,
  };
}

function speciesCatalog(...species: PlantSpecies[]): Map<string, PlantSpecies> {
  return new Map(species.map(s => [s.id, s]));
}

// =============================================================================
// Section A — Regression (simulateSeason pinned total)
// =============================================================================

describe('simulateSeason regression', () => {
  test('simulateSeason total is stable (~673 lbs)', () => {
    const weeks = simulateSeason(PRODUCTION_PLAN, GR_HISTORICAL);
    const total = weeks.reduce((s, w) => s + w.total_lbs, 0);
    // ~673 lbs after kale germination_rate fix (1.00 for transplants, was 0.95).
    expect(total).toBeCloseTo(673, -1);
  });

  test('all expected display groups produce yield', () => {
    const weeks = simulateSeason(PRODUCTION_PLAN, GR_HISTORICAL);
    const groups = new Set<string>();
    for (const w of weeks) {
      for (const g of Object.keys(w.lbs_by_group)) groups.add(g);
    }
    for (const expected of ['Lettuce', 'Spinach', 'Kale', 'Paste', 'Cherry', 'Potato', 'Corn']) {
      expect(groups.has(expected)).toBe(true);
    }
  });
});

// =============================================================================
// Section B — New Engine (TDD)
// =============================================================================

// ── B1: Development Modifier Math ────────────────────────────────────────────

describe('computeDevelopmentModifier', () => {
  test('returns 1.0 when no development_rate responses exist', () => {
    const responses: GrowthResponse[] = [
      { factor: 'sun_hours', curve: { 4: 0.5, 8: 1.0 }, effect: 'growth_rate' },
    ];
    const result = computeDevelopmentModifier(responses, { sun_hours: 6 }, 'vegetative');
    expect(result).toBe(1.0);
  });

  test('multiplies development_rate responses', () => {
    const responses: GrowthResponse[] = [
      { factor: 'photoperiod_h', curve: { 10: 0.5, 13: 1.0, 15: 2.0 }, effect: 'development_rate' },
    ];
    const result = computeDevelopmentModifier(responses, { photoperiod_h: 15 }, 'vegetative');
    expect(result).toBeCloseTo(2.0, 2);
  });

  test('respects active_stages — skips modifier when stage not listed', () => {
    const responses: GrowthResponse[] = [
      {
        factor: 'photoperiod_h',
        curve: { 10: 0.5, 13: 1.0, 15: 2.0 },
        effect: 'development_rate',
        active_stages: ['vegetative', 'flowering'],
      },
    ];
    // In seed stage: modifier should be 1.0 (skipped)
    expect(computeDevelopmentModifier(responses, { photoperiod_h: 15 }, 'seed')).toBe(1.0);
    // In vegetative stage: modifier = 2.0
    expect(computeDevelopmentModifier(responses, { photoperiod_h: 15 }, 'vegetative')).toBeCloseTo(2.0, 2);
  });

  test('applies modifier when active_stages is omitted (all stages)', () => {
    const responses: GrowthResponse[] = [
      { factor: 'photoperiod_h', curve: { 10: 0.5, 15: 2.0 }, effect: 'development_rate' },
    ];
    expect(computeDevelopmentModifier(responses, { photoperiod_h: 15 }, 'seed')).toBeCloseTo(2.0, 2);
  });
});

// ── B2: tickPlant State Machine ──────────────────────────────────────────────

describe('tickPlant — stage transitions', () => {
  test('corn advances seed → vegetative after sufficient GDD', () => {
    const env = createConstantEnv({ avg_high_f: 80, avg_low_f: 60 });
    // Daily GDD = (80+60)/2 - 50 = 20. Corn vegetative at 435 GDD → 22 days.
    const catalog = speciesCatalog(CORN_NOTHSTINE_DENT);
    const plant = createPlant(CORN_NOTHSTINE_DENT, { planted_date: '2025-05-25' });

    // Advance 25 days: 25 × 20 = 500 GDD → past vegetative (435)
    let current = plant;
    const allEvents: GrowthEvent[] = [];
    for (let d = 0; d < 25; d++) {
      const date = new Date('2025-05-25');
      date.setDate(date.getDate() + d);
      const result = tickPlant(current, date, env, catalog);
      current = result.plant;
      allEvents.push(...result.events);
    }

    expect(current.stage).toBe('vegetative');
    expect(current.accumulated_gdd).toBeCloseTo(500, -1);
    expect(allEvents.some(e => e.type === 'stage_changed' && e.to === 'vegetative')).toBe(true);
  });

  test('dead plant does not advance', () => {
    const env = createConstantEnv();
    const catalog = speciesCatalog(CORN_NOTHSTINE_DENT);
    const plant = createPlant(CORN_NOTHSTINE_DENT, { is_dead: true, stage: 'done' });

    const result = tickPlant(plant, new Date('2025-06-15'), env, catalog);
    expect(result.plant.accumulated_dev).toBe(0);
    expect(result.events).toHaveLength(0);
  });

  test('plant before planting date does not advance', () => {
    const env = createConstantEnv();
    const catalog = speciesCatalog(CORN_NOTHSTINE_DENT);
    const plant = createPlant(CORN_NOTHSTINE_DENT, { planted_date: '2025-06-01' });

    const result = tickPlant(plant, new Date('2025-05-15'), env, catalog);
    expect(result.plant.accumulated_dev).toBe(0);
  });
});

describe('tickPlant — frost kill', () => {
  test('tomato dies when low temp drops below kill_temp_f', () => {
    const env = createConstantEnv({ avg_high_f: 40, avg_low_f: 25 });
    const catalog = speciesCatalog(TOMATO_SUN_GOLD);
    const plant = createPlant(TOMATO_SUN_GOLD, {
      planted_date: '2025-05-25',
      stage: 'vegetative',
      accumulated_dev: 100,
      accumulated_gdd: 100,
    });

    const result = tickPlant(plant, new Date('2025-10-15'), env, catalog);
    expect(result.plant.is_dead).toBe(true);
    expect(result.plant.stage).toBe('done');
    expect(result.events.some(e => e.type === 'plant_died' && e.cause === 'frost')).toBe(true);
  });
});

describe('tickPlant — leafy bolt detection', () => {
  test('spinach dies from extreme photoperiod via population_survival', () => {
    // Spinach population_survival: { 15: 0.1, 16: 0.0 }. At 16h, survival = 0.
    const env = createConstantEnv({ avg_high_f: 72, avg_low_f: 55, photoperiod_h: 16 });
    const catalog = speciesCatalog(SPINACH_BLOOMSDALE);
    const plant = createPlant(SPINACH_BLOOMSDALE, {
      planted_date: '2025-04-01',
      stage: 'vegetative',
      accumulated_dev: 100,
    });

    const result = tickPlant(plant, new Date('2025-06-15'), env, catalog);
    expect(result.plant.stage).toBe('done');
    expect(result.plant.is_dead).toBe(true);
    expect(result.events.some(e => e.type === 'plant_died' && e.cause === 'population_collapse')).toBe(true);
  });
});

describe('tickPlant — development_rate modifier', () => {
  test('spinach under long days develops faster than under short days', () => {
    const catalog = speciesCatalog(SPINACH_BLOOMSDALE);

    const shortDayEnv = createConstantEnv({ avg_high_f: 65, avg_low_f: 45, photoperiod_h: 11 });
    const longDayEnv = createConstantEnv({ avg_high_f: 65, avg_low_f: 45, photoperiod_h: 15 });

    let short = createPlant(SPINACH_BLOOMSDALE, { planted_date: '2025-04-01', plant_id: 'short' });
    let long_ = createPlant(SPINACH_BLOOMSDALE, { planted_date: '2025-04-01', plant_id: 'long' });

    for (let d = 0; d < 10; d++) {
      const date = new Date('2025-04-01');
      date.setDate(date.getDate() + d);
      short = tickPlant(short, date, shortDayEnv, catalog).plant;
      long_ = tickPlant(long_, date, longDayEnv, catalog).plant;
    }

    // Both accumulate same raw GDD
    expect(short.accumulated_gdd).toBeCloseTo(long_.accumulated_gdd, 1);
    // Long-day plant accumulates more development units
    expect(long_.accumulated_dev).toBeGreaterThan(short.accumulated_dev);
  });
});

describe('tickPlant — potato short-day tuberization', () => {
  test('potato develops faster under short days than long days during fruiting', () => {
    const catalog = speciesCatalog(POTATO_KENNEBEC);

    const shortDayEnv = createConstantEnv({ avg_high_f: 70, avg_low_f: 50, photoperiod_h: 11 });
    const longDayEnv = createConstantEnv({ avg_high_f: 70, avg_low_f: 50, photoperiod_h: 15 });

    let short = createPlant(POTATO_KENNEBEC, {
      plant_id: 'short', planted_date: '2025-04-20', stage: 'flowering',
      accumulated_dev: 900, accumulated_gdd: 900,
    });
    let long_ = createPlant(POTATO_KENNEBEC, {
      plant_id: 'long', planted_date: '2025-04-20', stage: 'flowering',
      accumulated_dev: 900, accumulated_gdd: 900,
    });

    for (let d = 0; d < 10; d++) {
      const date = new Date('2025-07-15');
      date.setDate(date.getDate() + d);
      short = tickPlant(short, date, shortDayEnv, catalog).plant;
      long_ = tickPlant(long_, date, longDayEnv, catalog).plant;
    }

    expect(short.accumulated_gdd).toBeCloseTo(long_.accumulated_gdd, 1);
    expect(short.accumulated_dev).toBeGreaterThan(long_.accumulated_dev);
  });
});

describe('tickPlant — biomass accumulation', () => {
  test('fruiting tomato accumulates biomass', () => {
    const env = createConstantEnv({ avg_high_f: 80, avg_low_f: 60 });
    const catalog = speciesCatalog(TOMATO_SUN_GOLD);
    const plant = createPlant(TOMATO_SUN_GOLD, {
      planted_date: '2025-05-25',
      stage: 'fruiting',
      accumulated_dev: 800,
      accumulated_gdd: 800,
    });

    const result = tickPlant(plant, new Date('2025-08-01'), env, catalog);
    expect(result.plant.accumulated_lbs).toBeGreaterThan(0);
  });

  test('vegetative tomato does NOT accumulate biomass', () => {
    const env = createConstantEnv({ avg_high_f: 80, avg_low_f: 60 });
    const catalog = speciesCatalog(TOMATO_SUN_GOLD);
    const plant = createPlant(TOMATO_SUN_GOLD, {
      planted_date: '2025-05-25',
      stage: 'vegetative',
      accumulated_dev: 400,
      accumulated_gdd: 400,
    });

    const result = tickPlant(plant, new Date('2025-07-01'), env, catalog);
    expect(result.plant.accumulated_lbs).toBe(0);
  });

  test('vegetative kale (leafy CAC) DOES accumulate biomass', () => {
    const env = createConstantEnv({ avg_high_f: 65, avg_low_f: 50 });
    const catalog = speciesCatalog(KALE_RED_RUSSIAN);
    const plant = createPlant(KALE_RED_RUSSIAN, {
      planted_date: '2025-05-15',
      stage: 'vegetative',
      accumulated_dev: 100,
      accumulated_gdd: 100,
    });

    const result = tickPlant(plant, new Date('2025-06-15'), env, catalog);
    expect(result.plant.accumulated_lbs).toBeGreaterThan(0);
  });
});

describe('tickPlant — stress counters', () => {
  test('drought stress increments counter when soil moisture below threshold', () => {
    const env = createConstantEnv({ soil_moisture_pct_fc: 15 });
    const catalog = speciesCatalog(POTATO_KENNEBEC);
    const plant = createPlant(POTATO_KENNEBEC, {
      planted_date: '2025-04-20',
      stage: 'vegetative',
      accumulated_dev: 100,
      accumulated_gdd: 100,
    });

    const result = tickPlant(plant, new Date('2025-06-01'), env, catalog);
    expect(result.plant.stress.drought_days).toBeGreaterThan(0);
  });

  test('stress counter decays when condition is relieved', () => {
    const catalog = speciesCatalog(POTATO_KENNEBEC);
    const plant = createPlant(POTATO_KENNEBEC, {
      planted_date: '2025-04-20',
      stage: 'vegetative',
      accumulated_dev: 100,
      accumulated_gdd: 100,
      stress: { drought_days: 3, waterlog_days: 0, heat_days: 0 },
    });

    const env = createConstantEnv({ soil_moisture_pct_fc: 80 });
    const result = tickPlant(plant, new Date('2025-06-01'), env, catalog);
    expect(result.plant.stress.drought_days).toBeLessThan(3);
  });

  test('vigor penalty reduces biomass when stress exceeds days_to_damage', () => {
    // Potato: drought days_to_damage=4, days_to_death=10
    // Stressed plant starts at 7 drought days. Today's moisture is adequate (80%),
    // so counter decays to 6 — still above days_to_damage (4).
    // Vigor penalty = 1 - (6-4)/(10-4) = 0.67
    const catalog = speciesCatalog(POTATO_KENNEBEC);
    const env = createConstantEnv({ soil_moisture_pct_fc: 80 });

    const healthy_plant = createPlant(POTATO_KENNEBEC, {
      plant_id: 'healthy',
      planted_date: '2025-04-20',
      stage: 'fruiting',
      accumulated_dev: 1200,
      accumulated_gdd: 1200,
    });
    const stressed_plant = createPlant(POTATO_KENNEBEC, {
      plant_id: 'stressed',
      planted_date: '2025-04-20',
      stage: 'fruiting',
      accumulated_dev: 1200,
      accumulated_gdd: 1200,
      stress: { drought_days: 7, waterlog_days: 0, heat_days: 0 },
    });

    const healthy_result = tickPlant(healthy_plant, new Date('2025-08-01'), env, catalog);
    const stressed_result = tickPlant(stressed_plant, new Date('2025-08-01'), env, catalog);

    // Both grow (adequate moisture), but stressed plant grows less
    expect(healthy_result.plant.accumulated_lbs).toBeGreaterThan(0);
    expect(stressed_result.plant.accumulated_lbs).toBeGreaterThan(0);
    expect(stressed_result.plant.accumulated_lbs).toBeLessThan(healthy_result.plant.accumulated_lbs);
  });
});

// ── B3: tickDay orchestration ────────────────────────────────────────────────

describe('tickDay', () => {
  test('advances all plants and collects events', () => {
    const env = createConstantEnv({ avg_high_f: 80, avg_low_f: 60 });
    const catalog = speciesCatalog(CORN_NOTHSTINE_DENT, TOMATO_SUN_GOLD);

    const plants = [
      createPlant(CORN_NOTHSTINE_DENT, { plant_id: 'corn_0', planted_date: '2025-05-25' }),
      createPlant(TOMATO_SUN_GOLD, { plant_id: 'tomato_0', planted_date: '2025-05-25' }),
    ];

    const result = tickDay(plants, new Date('2025-06-15'), env, catalog);
    expect(result.plants).toHaveLength(2);
    expect(result.plants[0]!.accumulated_dev).toBeGreaterThan(0);
    expect(result.plants[1]!.accumulated_dev).toBeGreaterThan(0);
  });
});

// ── B4: simulateGrowth ───────────────────────────────────────────────────────

describe('simulateGrowth', () => {
  test('auto policy harvests kale and produces positive total', () => {
    const env = createConstantEnv({ avg_high_f: 65, avg_low_f: 50, photoperiod_h: 13 });
    const catalog = speciesCatalog(KALE_RED_RUSSIAN);

    const plants = Array.from({ length: 10 }, (_, i) =>
      createPlant(KALE_RED_RUSSIAN, { plant_id: `kale_${i}`, planted_date: '2025-05-15' }),
    );

    const result = simulateGrowth(plants, {
      start: new Date('2025-05-15'),
      end: new Date('2025-09-15'),
    }, env, catalog, 'auto');

    expect(result.total_harvested_lbs).toBeGreaterThan(0);
    expect(result.events.some(e => e.type === 'harvest_ready')).toBe(true);
  });

  test('manual policy emits harvest_ready but does not auto-harvest', () => {
    const env = createConstantEnv({ avg_high_f: 65, avg_low_f: 50, photoperiod_h: 13 });
    const catalog = speciesCatalog(KALE_RED_RUSSIAN);

    const plants = [
      createPlant(KALE_RED_RUSSIAN, { planted_date: '2025-05-15' }),
    ];

    const result = simulateGrowth(plants, {
      start: new Date('2025-05-15'),
      end: new Date('2025-09-15'),
    }, env, catalog, 'manual');

    expect(result.total_harvested_lbs).toBe(0);
    expect(result.events.some(e => e.type === 'harvest_ready')).toBe(true);
  });
});
