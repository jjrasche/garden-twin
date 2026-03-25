/**
 * Tests for the unified pipeline: GardenState → DaySnapshot[]
 *
 * initPlantStates: GardenState plants → PlantState[] (with survival filter)
 * simulateFromState: GardenState → DaySnapshot[] (per-day sim)
 * bucketHarvests: DaySnapshot[] → WeeklyHarvest[] (reporting query)
 */

import { describe, test, expect } from 'vitest';
import {
  simulateSeason,
  PRODUCTION_PLAN,
  GR_HISTORICAL,
  type WeeklyHarvest,
} from '../../src/core/calculators/ProductionTimeline';
import { initPlantStates } from '../../src/core/engine/initPlantStates';
import { simulateFromState, type DaySnapshot } from '../../src/core/engine/simulate';
import { bucketHarvests } from '../../src/core/calculators/ProductionTimeline';
import { createGardenStateFromPlan } from '../../src/core/data/sampleGarden';
import { GARDEN_SPECIES_MAP } from '../../src/core/data/species';
import { KALE_RED_RUSSIAN } from '../../src/core/data/species/kale-red-russian';
import { LETTUCE_BSS } from '../../src/core/data/species/lettuce-bss';

// =============================================================================
// initPlantStates
// =============================================================================

describe('initPlantStates', () => {
  test('converts GardenState plants to PlantState[] with correct ids', () => {
    const gardenState = createGardenStateFromPlan(PRODUCTION_PLAN);
    const plants = initPlantStates(gardenState.plants, GARDEN_SPECIES_MAP, GR_HISTORICAL, new Date('2025-11-24'));

    expect(plants.length).toBeGreaterThan(0);

    // Every plant has a valid plant_id and subcell_id
    for (const p of plants) {
      expect(p.plant_id).toBeTruthy();
      expect(p.subcell_id).toBeTruthy();
      expect(p.species_id).toBeTruthy();
      // Surviving plants start at 'seed'; eliminated ones start at 'done'
      expect(['seed', 'done']).toContain(p.stage);
      expect(p.accumulated_dev).toBe(0);
      expect(p.accumulated_gdd).toBe(0);
      expect(p.accumulated_lbs).toBe(0);
    }
  });

  test('applies germination x establishment survival filter', () => {
    const gardenState = createGardenStateFromPlan(PRODUCTION_PLAN);
    const plants = initPlantStates(gardenState.plants, GARDEN_SPECIES_MAP, GR_HISTORICAL, new Date('2025-11-24'));

    // All plants are included; eliminated ones are marked dead
    expect(plants.length).toBe(gardenState.plants.length);
    const alive = plants.filter(p => p.lifecycle !== 'dead');
    const dead = plants.filter(p => p.lifecycle === 'dead');
    expect(alive.length).toBeLessThan(plants.length);
    expect(alive.length).toBeGreaterThan(0);
    expect(dead.every(p => p.stage === 'done')).toBe(true);
  });

  test('daily_potential is non-zero for harvestable species', () => {
    const gardenState = createGardenStateFromPlan(PRODUCTION_PLAN);
    const plants = initPlantStates(gardenState.plants, GARDEN_SPECIES_MAP, GR_HISTORICAL, new Date('2025-11-24'));

    // Find a kale plant — it should have non-zero daily_potential
    const kale = plants.find(p => p.species_id === 'kale_red_russian');
    expect(kale).toBeDefined();
    expect(kale!.daily_potential).toBeGreaterThan(0);

    // Companion plants (marigold, nasturtium, calendula) have daily_potential = 0
    const marigold = plants.find(p => p.species_id === 'marigold_french');
    if (marigold) {
      expect(marigold.daily_potential).toBe(0);
    }
  });
});

// =============================================================================
// simulateFromState
// =============================================================================

describe('simulateFromState', () => {
  test('returns one DaySnapshot per day in dateRange', () => {
    // Small date range for speed
    const gardenState = createGardenStateFromPlan(PRODUCTION_PLAN);
    const snapshots = simulateFromState(
      gardenState,
      GARDEN_SPECIES_MAP,
      GR_HISTORICAL,
      { start: new Date('2025-06-01'), end: new Date('2025-06-07') },
    );

    expect(snapshots).toHaveLength(7); // June 1-7 inclusive
    for (const snap of snapshots) {
      expect(snap.date).toBeInstanceOf(Date);
      expect(snap.plants.length).toBeGreaterThan(0);
      expect(Array.isArray(snap.events)).toBe(true);
    }
  });

  test('harvest_ready events appear in snapshots', () => {
    const gardenState = createGardenStateFromPlan(PRODUCTION_PLAN);
    const snapshots = simulateFromState(
      gardenState,
      GARDEN_SPECIES_MAP,
      GR_HISTORICAL,
      { start: new Date('2026-04-14'), end: new Date('2026-11-24') },
    );

    const all_events = snapshots.flatMap(s => s.events);
    const harvest_events = all_events.filter(e => e.type === 'harvest_ready');
    expect(harvest_events.length).toBeGreaterThan(0);
  });

  test('snapshot plant count is non-zero throughout season', () => {
    const gardenState = createGardenStateFromPlan(PRODUCTION_PLAN);
    const snapshots = simulateFromState(
      gardenState,
      GARDEN_SPECIES_MAP,
      GR_HISTORICAL,
      { start: new Date('2026-06-01'), end: new Date('2026-06-14') },
    );

    for (const snap of snapshots) {
      expect(snap.plants.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// bucketHarvests
// =============================================================================

describe('bucketHarvests', () => {
  test('sums harvest_ready events into 7-day windows', () => {
    const gardenState = createGardenStateFromPlan(PRODUCTION_PLAN);
    const snapshots = simulateFromState(
      gardenState,
      GARDEN_SPECIES_MAP,
      GR_HISTORICAL,
      { start: new Date('2026-04-14'), end: new Date('2026-11-24') },
    );

    const weeks = bucketHarvests(snapshots, GARDEN_SPECIES_MAP);
    expect(weeks.length).toBeGreaterThan(0);

    // Each week has a week_start and total_lbs
    for (const week of weeks) {
      expect(week.week_start).toBeInstanceOf(Date);
      expect(typeof week.total_lbs).toBe('number');
    }

    // At least some weeks should have production
    const producing = weeks.filter(w => w.total_lbs > 0);
    expect(producing.length).toBeGreaterThan(0);
  });

  test('groups kale harvests under Kale, not Unknown', () => {
    const gardenState = createGardenStateFromPlan(PRODUCTION_PLAN);
    const snapshots = simulateFromState(
      gardenState,
      GARDEN_SPECIES_MAP,
      GR_HISTORICAL,
      { start: new Date('2026-04-14'), end: new Date('2026-11-24') },
    );

    const weeks = bucketHarvests(snapshots, GARDEN_SPECIES_MAP);
    const all_groups = new Set<string>();
    for (const week of weeks) {
      for (const group of Object.keys(week.lbs_by_group)) {
        all_groups.add(group);
      }
    }

    expect(all_groups.has('Kale')).toBe(true);
    expect(all_groups.has('Unknown')).toBe(false);
  });
});

// =============================================================================
// End-to-end regression
// =============================================================================

describe('end-to-end regression', () => {
  test('simulateSeason total is stable', () => {
    const weeks = simulateSeason(PRODUCTION_PLAN, GR_HISTORICAL);
    const total = weeks.reduce((s, w) => s + w.total_lbs, 0);
    // ~471 lbs: demand-driven harvest (harvest_ready + quality-decline events).
    expect(total).toBeCloseTo(471, -1);
  });
});
