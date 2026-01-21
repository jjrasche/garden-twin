import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useGardenStore } from '../../src/ui/store/gardenStore';
import type { Garden, Plan, PlantSpecies } from '@core/types';
import { CORN_WAPSIE_VALLEY } from '../../src/core/data/plantSpecies';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('GardenStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useGardenStore.getState().reset();
    localStorageMock.clear();
  });

  describe('initial state', () => {
    test('starts with null garden and plan', () => {
      const state = useGardenStore.getState();
      expect(state.garden).toBeNull();
      expect(state.plan).toBeNull();
      expect(state.projection).toBeNull();
    });

    test('starts with empty species map', () => {
      const state = useGardenStore.getState();
      expect(state.speciesMap.size).toBe(0);
    });

    test('starts with zone zoom level', () => {
      const state = useGardenStore.getState();
      expect(state.zoomLevel).toBe('zone');
    });

    test('starts with default viewport', () => {
      const state = useGardenStore.getState();
      expect(state.viewport).toEqual({
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      });
    });
  });

  describe('setGarden', () => {
    test('updates garden state', () => {
      const garden: Garden = {
        id: 'test-garden',
        location: {
          lat: 42.3601,
          lon: -71.0589,
          city: 'Boston',
          timezone: 'America/New_York',
        },
        grid: {
          width_ft: 10,
          length_ft: 10,
          subcell_size_in: 3,
          total_subcells: 400,
        },
        subcells: [],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      useGardenStore.getState().setGarden(garden);

      const state = useGardenStore.getState();
      expect(state.garden).toEqual(garden);
    });
  });

  describe('setPlan', () => {
    test('updates plan state', () => {
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [],
      };

      useGardenStore.getState().setPlan(plan);

      const state = useGardenStore.getState();
      expect(state.plan).toEqual(plan);
    });
  });

  describe('setSpecies', () => {
    test('converts array to map', () => {
      const species: PlantSpecies[] = [CORN_WAPSIE_VALLEY];

      useGardenStore.getState().setSpecies(species);

      const state = useGardenStore.getState();
      expect(state.speciesMap.size).toBe(1);
      expect(state.speciesMap.get('corn_wapsie_valley')).toEqual(CORN_WAPSIE_VALLEY);
    });

    test('handles multiple species', () => {
      const species: PlantSpecies[] = [
        CORN_WAPSIE_VALLEY,
        { ...CORN_WAPSIE_VALLEY, id: 'corn_2' },
      ];

      useGardenStore.getState().setSpecies(species);

      const state = useGardenStore.getState();
      expect(state.speciesMap.size).toBe(2);
      expect(state.speciesMap.has('corn_wapsie_valley')).toBe(true);
      expect(state.speciesMap.has('corn_2')).toBe(true);
    });
  });

  describe('setZoom', () => {
    test('updates zoom level', () => {
      useGardenStore.getState().setZoom('cell');

      const state = useGardenStore.getState();
      expect(state.zoomLevel).toBe('cell');
    });
  });

  describe('setPan', () => {
    test('updates viewport offset', () => {
      useGardenStore.getState().setPan(100, 200);

      const state = useGardenStore.getState();
      expect(state.viewport.offsetX).toBe(100);
      expect(state.viewport.offsetY).toBe(200);
      expect(state.viewport.scale).toBe(1); // Scale unchanged
    });
  });

  describe('setScale', () => {
    test('updates viewport scale', () => {
      useGardenStore.getState().setScale(2.5);

      const state = useGardenStore.getState();
      expect(state.viewport.scale).toBe(2.5);
      expect(state.viewport.offsetX).toBe(0); // Offset unchanged
      expect(state.viewport.offsetY).toBe(0);
    });
  });

  describe('regenerateProjection', () => {
    test('returns null when garden is missing', () => {
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [],
      };

      useGardenStore.getState().setPlan(plan);
      useGardenStore.getState().setSpecies([CORN_WAPSIE_VALLEY]);

      const state = useGardenStore.getState();
      expect(state.projection).toBeNull();
    });

    test('returns null when plan is missing', () => {
      const garden: Garden = {
        id: 'test-garden',
        location: {
          lat: 42.3601,
          lon: -71.0589,
          city: 'Boston',
          timezone: 'America/New_York',
        },
        grid: {
          width_ft: 10,
          length_ft: 10,
          subcell_size_in: 3,
          total_subcells: 400,
        },
        subcells: [],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      useGardenStore.getState().setGarden(garden);
      useGardenStore.getState().setSpecies([CORN_WAPSIE_VALLEY]);

      const state = useGardenStore.getState();
      expect(state.projection).toBeNull();
    });

    test('returns null when species map is empty', () => {
      const garden: Garden = {
        id: 'test-garden',
        location: {
          lat: 42.3601,
          lon: -71.0589,
          city: 'Boston',
          timezone: 'America/New_York',
        },
        grid: {
          width_ft: 10,
          length_ft: 10,
          subcell_size_in: 3,
          total_subcells: 400,
        },
        subcells: [],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [],
      };

      useGardenStore.getState().setGarden(garden);
      useGardenStore.getState().setPlan(plan);

      const state = useGardenStore.getState();
      expect(state.projection).toBeNull();
    });

    test('generates projection with empty plan', () => {
      const garden: Garden = {
        id: 'test-garden',
        location: {
          lat: 42.3601,
          lon: -71.0589,
          city: 'Boston',
          timezone: 'America/New_York',
        },
        grid: {
          width_ft: 10,
          length_ft: 10,
          subcell_size_in: 3,
          total_subcells: 400,
        },
        subcells: [],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [],
      };

      useGardenStore.getState().setGarden(garden);
      useGardenStore.getState().setPlan(plan);
      useGardenStore.getState().setSpecies([CORN_WAPSIE_VALLEY]);

      const state = useGardenStore.getState();
      expect(state.projection).not.toBeNull();
      expect(state.projection?.totals.total_yield_lbs).toBe(0);
      expect(state.projection?.totals.total_labor_hours).toBe(0);
    });
  });

  describe('reset', () => {
    test('clears all state', () => {
      // Set some state
      useGardenStore.getState().setZoom('cell');
      useGardenStore.getState().setPan(100, 200);
      useGardenStore.getState().setScale(2.5);

      // Reset
      useGardenStore.getState().reset();

      const state = useGardenStore.getState();
      expect(state.garden).toBeNull();
      expect(state.plan).toBeNull();
      expect(state.projection).toBeNull();
      expect(state.speciesMap.size).toBe(0);
      expect(state.zoomLevel).toBe('zone');
      expect(state.viewport).toEqual({
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      });
    });
  });
});
