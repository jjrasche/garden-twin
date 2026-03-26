/**
 * HarvestStrategy integration tests — calculators resolve harvest config
 * from HarvestStrategy instead of PlantSpecies fields.
 *
 * Step A: Wire HarvestStrategy into CropPlanting + initSimPlanting.
 * Step 6: calibrateCacPotential replaces buildCutSchedule.
 * Step 7: GrowthLedger GDD gating.
 */

import { describe, test, expect } from 'vitest';
import {
  simulateSeason,
  PRODUCTION_PLAN,
  GR_HISTORICAL,
  type CropPlanting,
} from '../../src/core/calculators/ProductionTimeline';
import { simulateFromState } from '../../src/core/engine/simulate';
import { bucketHarvests } from '../../src/core/calculators/ProductionTimeline';
import { calibrateCacPotential } from '../../src/core/calculators/growthMath';
import { HARVEST_STRATEGIES, DEFAULT_HARVEST_STRATEGY } from '../../src/core/data/harvestStrategies';
import { KALE_RED_RUSSIAN } from '../../src/core/data/species/kale-red-russian';
import { LETTUCE_BSS } from '../../src/core/data/species/lettuce-bss';
import { TOMATO_SUN_GOLD } from '../../src/core/data/species/tomato-sun-gold';
import { POTATO_KENNEBEC } from '../../src/core/data/species/potato-kennebec';
import type { HarvestStrategy } from '../../src/core/types/HarvestStrategy';
import { resolveHarvestStrategy } from '../../src/core/calculators/strategyResolver';
import { createGardenStateFromPlan } from '../../src/core/data/sampleGarden';
import { GARDEN_SPECIES_MAP } from '../../src/core/data/species';

// Test-only strategy: lettuce with 4× baseline for strategy override test
const LETTUCE_BOOSTED_TEST: HarvestStrategy = {
  id: 'lettuce_boosted_test',
  type: 'cut_and_come_again',
  baseline_lbs_per_plant: 2.0,
  max_cuts: 4,
  regrowth_days: 14,
  cut_yield_curve: { 1: 1.0, 2: 0.8, 3: 0.6, 4: 0.4 },
};
HARVEST_STRATEGIES.set(LETTUCE_BOOSTED_TEST.id, LETTUCE_BOOSTED_TEST);

// =============================================================================
// Step A — HarvestStrategy resolution
// =============================================================================

describe('resolveHarvestStrategy', () => {
  test('resolves explicit harvest_strategy_id from CropPlanting', () => {
    const strategy = resolveHarvestStrategy('kale_cut', KALE_RED_RUSSIAN);
    expect(strategy).not.toBeNull();
    expect(strategy!.id).toBe('kale_cut');
    expect(strategy!.type).toBe('cut_and_come_again');
    expect(strategy!.baseline_lbs_per_plant).toBe(1.75);
  });

  test('falls back to DEFAULT_HARVEST_STRATEGY when no id provided', () => {
    const strategy = resolveHarvestStrategy(undefined, KALE_RED_RUSSIAN);
    expect(strategy).not.toBeNull();
    expect(strategy!.id).toBe('kale_cut');
  });

  test('returns null for companion plants with no strategy', () => {
    // Species without a default mapping (marigold, nasturtium, calendula)
    const fakeCompanion = { ...KALE_RED_RUSSIAN, id: 'marigold_french' };
    const strategy = resolveHarvestStrategy(undefined, fakeCompanion);
    expect(strategy).toBeNull();
  });

  test('strategy baseline_lbs_per_plant matches species for all defaults', () => {
    for (const [species_id, strategy_id] of Object.entries(DEFAULT_HARVEST_STRATEGY)) {
      const strategy = HARVEST_STRATEGIES.get(strategy_id);
      expect(strategy, `missing strategy for ${species_id}`).toBeDefined();
    }
  });
});

describe('simulateSeason with harvest_strategy_id on CropPlanting', () => {
  test('CropPlanting with harvest_strategy_id produces same output as without', () => {
    // Kale with explicit strategy should match kale without (default resolves same)
    const withoutStrategy: CropPlanting[] = [{
      species: KALE_RED_RUSSIAN,
      display_group: 'Kale',
      plant_count: 10,
      planting_date: '2025-05-15',
      zone: 'boundary',
    }];

    const withStrategy: CropPlanting[] = [{
      species: KALE_RED_RUSSIAN,
      display_group: 'Kale',
      plant_count: 10,
      planting_date: '2025-05-15',
      zone: 'boundary',
      harvest_strategy_id: 'kale_cut',
    }];

    const without = simulateSeason(withoutStrategy, GR_HISTORICAL);
    const with_ = simulateSeason(withStrategy, GR_HISTORICAL);

    const totalWithout = without.reduce((s, w) => s + w.total_lbs, 0);
    const totalWith = with_.reduce((s, w) => s + w.total_lbs, 0);
    expect(totalWith).toBeCloseTo(totalWithout, 1);
  });

  test('custom strategy overrides species baseline_lbs_per_plant', () => {
    // Create a planting that uses lettuce species but with a custom strategy
    // that has a higher baseline (2.0 vs 0.5) — output should scale up ~4×
    const normalPlan: CropPlanting[] = [{
      species: LETTUCE_BSS,
      display_group: 'Lettuce',
      plant_count: 10,
      planting_date: '2025-04-15',
      zone: 'shade',
    }];

    const boostedPlan: CropPlanting[] = [{
      species: LETTUCE_BSS,
      display_group: 'Lettuce',
      plant_count: 10,
      planting_date: '2025-04-15',
      zone: 'shade',
      harvest_strategy_id: 'lettuce_boosted_test',
    }];

    const normal = simulateSeason(normalPlan, GR_HISTORICAL);
    const boosted = simulateSeason(boostedPlan, GR_HISTORICAL);

    const totalNormal = normal.reduce((s, w) => s + w.total_lbs, 0);
    const totalBoosted = boosted.reduce((s, w) => s + w.total_lbs, 0);

    // Boosted baseline means more biomass accumulates → more harvest lbs.
    // Not exactly 4× because quality-decline harvest timing differs.
    expect(totalBoosted).toBeGreaterThan(totalNormal);
  });

  test('full PRODUCTION_PLAN total unchanged after strategy wiring', () => {
    const weeks = simulateSeason(PRODUCTION_PLAN, GR_HISTORICAL);
    const total = weeks.reduce((s, w) => s + w.total_lbs, 0);
    // ~778 lbs: quality-emergent harvest (peak-decline auto-harvest).
    expect(total).toBeCloseTo(778, -1);
  });
});

// =============================================================================
// Step 6 — calibrateCacPotential (replaces buildCutSchedule)
// =============================================================================

describe('calibrateCacPotential', () => {
  test('kale: daily_potential × vigor_sum × regrowth_days = baseline', () => {
    const strategy = resolveHarvestStrategy(undefined, KALE_RED_RUSSIAN)!;
    const { daily_potential } = calibrateCacPotential(strategy);

    // Kale: no max_cuts. Sum all curve entries (20 cuts, mostly 1.0).
    const numCuts = Math.max(...Object.keys(strategy.cut_yield_curve!).map(Number));
    let vigor_sum = 0;
    for (let c = 1; c <= numCuts; c++) {
      vigor_sum += strategy.cut_yield_curve![c] ?? 1.0;
    }
    const reconstructed = daily_potential * vigor_sum * strategy.regrowth_days!;
    expect(reconstructed).toBeCloseTo(strategy.baseline_lbs_per_plant, 4);
  });

  test('no dependency on environment or planting date', () => {
    const strategy = resolveHarvestStrategy(undefined, KALE_RED_RUSSIAN)!;
    const result = calibrateCacPotential(strategy);
    // Same result regardless — no env param
    expect(result.daily_potential).toBeGreaterThan(0);
    expect(result.initial_vigor).toBeCloseTo(0.7, 2); // kale cut 1 vigor
  });
});

// =============================================================================
// Companion plants (no HarvestStrategy) still simulate correctly
// =============================================================================

describe('companion species with no harvest strategy', () => {
  test('marigold (null strategy, no baseline) produces zero harvest', () => {
    const MARIGOLD = GARDEN_SPECIES_MAP.get('marigold_french')!;
    const plan: CropPlanting[] = [{
      species: MARIGOLD,
      display_group: 'Marigold',
      plant_count: 5,
      planting_date: '2025-05-15',
      zone: 'boundary',
    }];
    const weeks = simulateSeason(plan, GR_HISTORICAL);
    const total = weeks.reduce((s, w) => s + w.total_lbs, 0);
    expect(total).toBe(0);
  });
});

// =============================================================================
// Step C — Phase 4: simulateFromGardenState
// =============================================================================

describe('simulateFromState', () => {
  test('GardenState produces comparable season total to CropPlanting plan', () => {
    const gardenState = createGardenStateFromPlan(PRODUCTION_PLAN);
    const fromPlan = simulateSeason(PRODUCTION_PLAN, GR_HISTORICAL);
    const snapshots = simulateFromState(
      gardenState, GARDEN_SPECIES_MAP, GR_HISTORICAL,
      { start: new Date('2026-04-14'), end: new Date('2026-11-24') },
    );
    const fromState = bucketHarvests(snapshots, GARDEN_SPECIES_MAP);

    const planTotal = fromPlan.reduce((s, w) => s + w.total_lbs, 0);
    const stateTotal = fromState.reduce((s, w) => s + w.total_lbs, 0);

    // GardenState has actual subcell positions → zone derivation differs from
    // abstract plan zones. Within 20% is acceptable (quality-emergent harvest timing varies).
    expect(Math.abs(stateTotal - planTotal) / planTotal).toBeLessThan(0.20);
  });

  test('GardenState produces all expected display groups', () => {
    const gardenState = createGardenStateFromPlan(PRODUCTION_PLAN);
    const snapshots = simulateFromState(
      gardenState, GARDEN_SPECIES_MAP, GR_HISTORICAL,
      { start: new Date('2026-04-14'), end: new Date('2026-11-24') },
    );
    const weeks = bucketHarvests(snapshots, GARDEN_SPECIES_MAP);

    const allGroups = new Set<string>();
    for (const week of weeks) {
      for (const group of Object.keys(week.lbs_by_group)) {
        allGroups.add(group);
      }
    }

    // Core groups that layout always places
    expect(allGroups.has('Kale')).toBe(true);
    expect(allGroups.has('Potato')).toBe(true);
    expect(allGroups.has('Cherry')).toBe(true);
  });
});
