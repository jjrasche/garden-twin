/**
 * Projected inventory tests.
 *
 * getAvailableHarvest reads simulation snapshots and returns
 * what's available to sell on a given date.
 */

import { describe, test, expect } from 'vitest';
import { getAvailableHarvest, getInventoryForecast } from '../../src/core/calculators/Inventory';
import type { DaySnapshot } from '../../src/core/engine/simulate';
import type { PlantState } from '../../src/core/types/PlantState';

// ── Fixtures ────────────────────────────────────────────────────────────────

function makePlant(id: string, speciesId: string, harvestable: boolean, accLbs: number): PlantState {
  return {
    plant_id: id,
    species_id: speciesId,
    planted_date: '2026-05-01',
    stage: harvestable ? 'harvest' : 'vegetative',
    lifecycle: 'growing',
    is_harvestable: harvestable,
    is_dead: false,
    accumulated_lbs: accLbs,
    accumulated_gdd: 500,
    cut_number: 0,
    vigor: 1.0,
    daily_potential: 0.01,
    harvest_strategy_id: 'test',
    stress: { drought_days: 0, heat_days: 0, waterlog_days: 0 },
  } as PlantState;
}

function makeSnapshot(date: string, plants: PlantState[]): DaySnapshot {
  return {
    date: new Date(date),
    plants,
    events: [],
  };
}

const SNAPSHOTS: DaySnapshot[] = [
  makeSnapshot('2026-07-01', [
    makePlant('p1', 'potato_kennebec', false, 0),
    makePlant('k1', 'kale_red_russian', true, 0.5),
    makePlant('k2', 'kale_red_russian', true, 0.3),
    makePlant('t1', 'tomato_sun_gold', false, 0),
  ]),
  makeSnapshot('2026-07-15', [
    makePlant('p1', 'potato_kennebec', true, 1.8),
    makePlant('k1', 'kale_red_russian', true, 0.4),
    makePlant('k2', 'kale_red_russian', false, 0.1),  // Not harvestable yet
    makePlant('t1', 'tomato_sun_gold', true, 0.8),
  ]),
  makeSnapshot('2026-08-01', [
    makePlant('p1', 'potato_kennebec', true, 1.8),
    makePlant('k1', 'kale_red_russian', true, 0.6),
    makePlant('k2', 'kale_red_russian', true, 0.5),
    makePlant('t1', 'tomato_sun_gold', true, 1.2),
  ]),
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe('getAvailableHarvest', () => {
  test('returns harvestable species with estimated lbs on a specific date', () => {
    const available = getAvailableHarvest(SNAPSHOTS, new Date('2026-07-15'));

    expect(available.length).toBe(3); // potato, kale k1, and sun gold (kale k2 not harvestable)

    const potato = available.find(a => a.species_id === 'potato_kennebec');
    expect(potato).toBeDefined();
    expect(potato!.available_lbs).toBeCloseTo(1.8);
    expect(potato!.harvestable_plant_count).toBe(1);

    const tomato = available.find(a => a.species_id === 'tomato_sun_gold');
    expect(tomato).toBeDefined();
    expect(tomato!.available_lbs).toBeCloseTo(0.8);
  });

  test('aggregates multiple harvestable plants of same species', () => {
    const available = getAvailableHarvest(SNAPSHOTS, new Date('2026-08-01'));

    const kale = available.find(a => a.species_id === 'kale_red_russian');
    expect(kale).toBeDefined();
    expect(kale!.available_lbs).toBeCloseTo(1.1); // 0.6 + 0.5
    expect(kale!.harvestable_plant_count).toBe(2);
  });

  test('returns empty array when no plants are harvestable', () => {
    const available = getAvailableHarvest(SNAPSHOTS, new Date('2026-06-01'));
    // No snapshot for this date — should find nearest or return empty
    expect(available.length).toBe(0);
  });

  test('finds nearest snapshot when exact date not available', () => {
    const available = getAvailableHarvest(SNAPSHOTS, new Date('2026-07-14'));
    // Should use July 1 snapshot (nearest before July 14)
    const kale = available.find(a => a.species_id === 'kale_red_russian');
    expect(kale).toBeDefined();
    expect(kale!.available_lbs).toBeCloseTo(0.8); // 0.5 + 0.3
  });
});

describe('getInventoryForecast', () => {
  test('returns weekly availability for the next N weeks', () => {
    const forecast = getInventoryForecast(SNAPSHOTS, new Date('2026-07-01'), 5);

    expect(forecast.length).toBe(5);
    expect(forecast[0].date.toISOString().slice(0, 10)).toBe('2026-07-01');

    // First week: only kale harvestable
    expect(forecast[0].species.some(s => s.species_id === 'kale_red_russian')).toBe(true);
    expect(forecast[0].species.some(s => s.species_id === 'potato_kennebec')).toBe(false);
  });

  test('shows increasing availability as more crops mature', () => {
    const forecast = getInventoryForecast(SNAPSHOTS, new Date('2026-07-01'), 5);

    const week1Species = forecast[0].species.length;
    const lastWeekSpecies = forecast[forecast.length - 1].species.length;

    // Later weeks should have same or more species available
    expect(lastWeekSpecies).toBeGreaterThanOrEqual(week1Species);
  });
});
