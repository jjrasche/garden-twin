import { describe, test, expect, beforeEach } from 'vitest';
import {
  saveGarden,
  loadGarden,
  savePlan,
  loadPlan,
  getLastSaved,
  clearAll,
  estimateStorageSize,
  exportToJSON,
  importFromJSON,
  QuotaExceededError,
} from '../../src/ui/services/localStorageService';
import type { Garden, Plan } from '@core/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      // Simulate quota exceeded for very large values
      if (value.length > 1000000) {
        const error = new DOMException('QuotaExceededError');
        error.name = 'QuotaExceededError';
        error.code = 22;
        throw error;
      }
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
  writable: true,
});

describe('localStorageService', () => {
  const sampleGarden: Garden = {
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

  const samplePlan: Plan = {
    id: 'test-plan',
    garden_id: 'test-garden',
    created_at: '2025-01-01T00:00:00Z',
    plantings: [
      {
        subcell_id: 'sub_0_0',
        species_id: 'corn_wapsie_valley',
        planting_date: '2025-05-01',
      },
    ],
  };

  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('saveGarden', () => {
    test('saves garden to localStorage', () => {
      saveGarden(sampleGarden);

      const stored = localStorage.getItem('garden-twin:garden');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.id).toBe('test-garden');
      expect(parsed.location.city).toBe('Boston');
    });

    test('updates last saved timestamp', () => {
      saveGarden(sampleGarden);

      const lastSaved = localStorage.getItem('garden-twin:last-saved');
      expect(lastSaved).not.toBeNull();

      const timestamp = new Date(lastSaved!);
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('loadGarden', () => {
    test('loads garden from localStorage', () => {
      saveGarden(sampleGarden);

      const loaded = loadGarden();
      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe('test-garden');
      expect(loaded?.location.city).toBe('Boston');
    });

    test('returns null when no garden is stored', () => {
      const loaded = loadGarden();
      expect(loaded).toBeNull();
    });

    test('returns null when JSON is invalid', () => {
      localStorage.setItem('garden-twin:garden', 'invalid json');

      const loaded = loadGarden();
      expect(loaded).toBeNull();
    });
  });

  describe('savePlan', () => {
    test('saves plan to localStorage', () => {
      savePlan(samplePlan);

      const stored = localStorage.getItem('garden-twin:plan');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.id).toBe('test-plan');
      expect(parsed.plantings.length).toBe(1);
    });
  });

  describe('loadPlan', () => {
    test('loads plan from localStorage', () => {
      savePlan(samplePlan);

      const loaded = loadPlan();
      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe('test-plan');
      expect(loaded?.plantings.length).toBe(1);
    });

    test('returns null when no plan is stored', () => {
      const loaded = loadPlan();
      expect(loaded).toBeNull();
    });
  });

  describe('getLastSaved', () => {
    test('returns last saved timestamp', () => {
      saveGarden(sampleGarden);

      const lastSaved = getLastSaved();
      expect(lastSaved).not.toBeNull();
      expect(lastSaved).toBeInstanceOf(Date);
      expect(lastSaved!.getTime()).toBeGreaterThan(Date.now() - 1000);
    });

    test('returns null when no timestamp is stored', () => {
      const lastSaved = getLastSaved();
      expect(lastSaved).toBeNull();
    });
  });

  describe('clearAll', () => {
    test('removes all stored data', () => {
      saveGarden(sampleGarden);
      savePlan(samplePlan);

      clearAll();

      expect(loadGarden()).toBeNull();
      expect(loadPlan()).toBeNull();
      expect(getLastSaved()).toBeNull();
    });
  });

  describe('estimateStorageSize', () => {
    test('returns 0 for empty storage', () => {
      const size = estimateStorageSize();
      expect(size).toBe(0);
    });

    test('estimates size correctly', () => {
      saveGarden(sampleGarden);

      const size = estimateStorageSize();
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('exportToJSON', () => {
    test('exports garden and plan to JSON string', () => {
      saveGarden(sampleGarden);
      savePlan(samplePlan);

      const json = exportToJSON();
      const parsed = JSON.parse(json);

      expect(parsed.garden.id).toBe('test-garden');
      expect(parsed.plan.id).toBe('test-plan');
      expect(parsed.exportedAt).toBeDefined();
    });

    test('handles missing data', () => {
      const json = exportToJSON();
      const parsed = JSON.parse(json);

      expect(parsed.garden).toBeNull();
      expect(parsed.plan).toBeNull();
    });
  });

  describe('importFromJSON', () => {
    test('imports garden and plan from JSON string', () => {
      const json = JSON.stringify({
        garden: sampleGarden,
        plan: samplePlan,
      });

      importFromJSON(json);

      const loadedGarden = loadGarden();
      const loadedPlan = loadPlan();

      expect(loadedGarden?.id).toBe('test-garden');
      expect(loadedPlan?.id).toBe('test-plan');
    });

    test('throws error for invalid JSON', () => {
      expect(() => importFromJSON('invalid json')).toThrow('Invalid JSON format');
    });

    test('handles partial import (garden only)', () => {
      const json = JSON.stringify({
        garden: sampleGarden,
      });

      importFromJSON(json);

      const loadedGarden = loadGarden();
      expect(loadedGarden?.id).toBe('test-garden');
    });
  });
});
