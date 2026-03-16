/**
 * Phase 2 schema migration tests.
 *
 * Verifies the GardenState shape after removing environment, summary,
 * sun_hours, moisture_pct and adding accumulated_gdd, measurements,
 * harvest_strategy_id to PlantInstance.
 */

import { describe, test, expect } from 'vitest';
import { createSampleGardenState } from '../../src/core/data/sampleGarden';
import { PlantInstanceSchema, GardenStateSchema } from '../../src/core/types/GardenState';
import { HarvestStrategySchema } from '../../src/core/types/HarvestStrategy';
import {
  HARVEST_STRATEGIES,
  DEFAULT_HARVEST_STRATEGY,
  HARVEST_CORN_SHELL_DRY,
  HARVEST_KALE_CUT,
  HARVEST_TOMATO_PASTE_CAN,
} from '../../src/core/data/harvestStrategies';
import { applyObservations, getZoneStats } from '../../src/core/queries/gardenState';
import { getVarianceFromExpected } from '../../src/core/types/GardenState';
import type { PlantInstance } from '../../src/core/types/GardenState';
import type { Observation } from '../../src/core/types/Observation';

// =============================================================================
// GardenState shape
// =============================================================================

describe('GardenState shape (Phase 2)', () => {
  const state = createSampleGardenState();

  test('has no environment property', () => {
    expect(state).not.toHaveProperty('environment');
  });

  test('has no summary property', () => {
    expect(state).not.toHaveProperty('summary');
  });

  test('has plants and subcells', () => {
    expect(state.plants.length).toBeGreaterThan(0);
    expect(state.subcells.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// SubcellState shape
// =============================================================================

describe('SubcellState shape (Phase 2)', () => {
  const state = createSampleGardenState();

  test('subcells have no sun_hours', () => {
    for (const subcell of state.subcells.slice(0, 20)) {
      expect(subcell).not.toHaveProperty('sun_hours');
    }
  });

  test('subcells have no moisture_pct in soil', () => {
    for (const subcell of state.subcells.slice(0, 20)) {
      expect(subcell.soil).not.toHaveProperty('moisture_pct');
    }
  });

  test('subcells retain soil baseline', () => {
    const subcell = state.subcells[0];
    expect(subcell.soil).toHaveProperty('N_ppm');
    expect(subcell.soil).toHaveProperty('pH');
    expect(subcell.soil).toHaveProperty('organic_matter_pct');
  });

  test('shade zones retain shade_map', () => {
    const shaded = state.subcells.find(s => s.shade_map !== undefined);
    expect(shaded).toBeDefined();
    expect(shaded!.shade_map).toHaveProperty('summer');
    expect(shaded!.shade_map).toHaveProperty('winter');
  });
});

// =============================================================================
// PlantInstance shape
// =============================================================================

describe('PlantInstance shape (Phase 2)', () => {
  const state = createSampleGardenState();
  const plant = state.plants[0];

  test('has accumulated_gdd', () => {
    expect(plant).toHaveProperty('accumulated_gdd');
    expect(plant.accumulated_gdd).toBe(0);
  });

  test('has measurements with height_cm', () => {
    expect(plant.measurements).toBeDefined();
    expect(plant.measurements!.height_cm).toBe(0);
  });

  test('has no top-level height_cm', () => {
    expect(plant).not.toHaveProperty('height_cm');
  });

  test('has no top-level fruit_count', () => {
    expect(plant).not.toHaveProperty('fruit_count');
  });

  test('schema validates new fields', () => {
    const result = PlantInstanceSchema.safeParse({
      plant_id: 'test_1',
      species_id: 'corn_nothstine_dent',
      root_subcell_id: 'sub_0_0',
      occupied_subcells: ['sub_0_0'],
      planted_date: '2026-05-15',
      harvest_strategy_id: 'corn_shell_dry',
      current_stage: 'seed',
      accumulated_gdd: 150.5,
      measurements: { height_cm: 30, leaf_count: 8 },
      last_observed: '2026-06-01T12:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  test('schema rejects negative accumulated_gdd', () => {
    const result = PlantInstanceSchema.safeParse({
      plant_id: 'test_1',
      species_id: 'corn_nothstine_dent',
      root_subcell_id: 'sub_0_0',
      occupied_subcells: ['sub_0_0'],
      planted_date: '2026-05-15',
      current_stage: 'seed',
      accumulated_gdd: -10,
      last_observed: '2026-06-01T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// HarvestStrategy
// =============================================================================

describe('HarvestStrategy', () => {
  test('all 7 strategies parse against schema', () => {
    for (const [id, strategy] of HARVEST_STRATEGIES) {
      const result = HarvestStrategySchema.safeParse(strategy);
      expect(result.success, `${id} failed validation`).toBe(true);
    }
  });

  test('HARVEST_STRATEGIES map has 7 entries', () => {
    expect(HARVEST_STRATEGIES.size).toBe(7);
  });

  test('DEFAULT_HARVEST_STRATEGY maps to valid strategy IDs', () => {
    for (const [speciesId, strategyId] of Object.entries(DEFAULT_HARVEST_STRATEGY)) {
      expect(
        HARVEST_STRATEGIES.has(strategyId),
        `${speciesId} → ${strategyId} not in HARVEST_STRATEGIES`,
      ).toBe(true);
    }
  });

  test('cut_and_come_again strategies have required fields', () => {
    expect(HARVEST_KALE_CUT.max_cuts).toBe(8);
    expect(HARVEST_KALE_CUT.regrowth_days).toBe(14);
    expect(HARVEST_KALE_CUT.cut_yield_curve).toBeDefined();
  });

  test('bulk strategies have maturity_indicator', () => {
    expect(HARVEST_CORN_SHELL_DRY.maturity_indicator).toBe('husk_dry');
  });

  test('continuous strategies have pick_frequency_days', () => {
    expect(HARVEST_TOMATO_PASTE_CAN.pick_frequency_days).toBe(3);
  });

  test('processing activity attached to paste tomato strategy', () => {
    expect(HARVEST_TOMATO_PASTE_CAN.processing).toBeDefined();
    expect(HARVEST_TOMATO_PASTE_CAN.processing!.length).toBe(1);
    expect(HARVEST_TOMATO_PASTE_CAN.processing![0].activity_id).toBe('can_marinara');
  });
});

// =============================================================================
// applyObservations writes to measurements
// =============================================================================

describe('applyObservations', () => {
  test('writes height_cm into measurements', () => {
    const state = createSampleGardenState();
    const plantId = state.plants[0].plant_id;

    const obs: Observation = {
      observation_id: 'obs_1',
      timestamp: '2026-07-01T12:00:00Z',
      plant_id: plantId,
      height_cm: 45.2,
      source: 'robot',
      method: 'vision',
      confidence: 0.9,
    };

    const updated = applyObservations(state, [obs]);
    const updatedPlant = updated.plants.find(p => p.plant_id === plantId)!;

    expect(updatedPlant.measurements!.height_cm).toBe(45.2);
  });

  test('writes fruit_count into measurements', () => {
    const state = createSampleGardenState();
    const plantId = state.plants[0].plant_id;

    const obs: Observation = {
      observation_id: 'obs_2',
      timestamp: '2026-07-01T12:00:00Z',
      plant_id: plantId,
      fruit_count: 12,
      source: 'robot',
      method: 'vision',
      confidence: 0.85,
    };

    const updated = applyObservations(state, [obs]);
    const updatedPlant = updated.plants.find(p => p.plant_id === plantId)!;

    expect(updatedPlant.measurements!.fruit_count).toBe(12);
  });

  test('preserves existing measurements when adding new ones', () => {
    const state = createSampleGardenState();
    const plantId = state.plants[0].plant_id;

    const obs1: Observation = {
      observation_id: 'obs_3',
      timestamp: '2026-07-01T12:00:00Z',
      plant_id: plantId,
      height_cm: 30,
      source: 'robot',
      method: 'vision',
      confidence: 0.9,
    };

    const state2 = applyObservations(state, [obs1]);

    const obs2: Observation = {
      observation_id: 'obs_4',
      timestamp: '2026-07-02T12:00:00Z',
      plant_id: plantId,
      fruit_count: 5,
      source: 'robot',
      method: 'vision',
      confidence: 0.9,
    };

    const state3 = applyObservations(state2, [obs2]);
    const plant = state3.plants.find(p => p.plant_id === plantId)!;

    expect(plant.measurements!.height_cm).toBe(30);
    expect(plant.measurements!.fruit_count).toBe(5);
  });
});

// =============================================================================
// getVarianceFromExpected reads from measurements
// =============================================================================

describe('getVarianceFromExpected', () => {
  test('computes variance from measurements', () => {
    const actual: PlantInstance = {
      plant_id: 'p1', species_id: 's1',
      root_subcell_id: 'sub_0_0', occupied_subcells: ['sub_0_0'],
      planted_date: '2026-05-15', current_stage: 'vegetative',
      accumulated_gdd: 200, measurements: { height_cm: 36 },
      last_observed: '2026-06-15T12:00:00Z',
    };
    const expected: PlantInstance = {
      plant_id: 'p1', species_id: 's1',
      root_subcell_id: 'sub_0_0', occupied_subcells: ['sub_0_0'],
      planted_date: '2026-05-15', current_stage: 'vegetative',
      accumulated_gdd: 200, measurements: { height_cm: 30 },
      last_observed: '2026-06-15T12:00:00Z',
    };

    const variance = getVarianceFromExpected(actual, expected);
    expect(variance).toBeCloseTo(20, 1);
  });

  test('returns 0 when expected measurement is 0', () => {
    const actual: PlantInstance = {
      plant_id: 'p1', species_id: 's1',
      root_subcell_id: 'sub_0_0', occupied_subcells: ['sub_0_0'],
      planted_date: '2026-05-15', current_stage: 'seed',
      accumulated_gdd: 0, measurements: { height_cm: 0 },
      last_observed: '2026-05-15T12:00:00Z',
    };

    const variance = getVarianceFromExpected(actual, actual);
    expect(variance).toBe(0);
  });
});

// =============================================================================
// getZoneStats no longer returns avgMoisture
// =============================================================================

describe('getZoneStats', () => {
  test('returns plantCount, healthyCount, emptySubcells without avgMoisture', () => {
    const state = createSampleGardenState();
    const stats = getZoneStats(state, 0, 0);

    expect(stats).toHaveProperty('plantCount');
    expect(stats).toHaveProperty('healthyCount');
    expect(stats).toHaveProperty('emptySubcells');
    expect(stats).not.toHaveProperty('avgMoisture');
  });
});
