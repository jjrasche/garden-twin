import { describe, test, expect } from 'vitest';
import {
  getCellSubcells,
  getCellData,
  getZoneData,
} from '../../src/core/aggregators/utils';
import { Subcell } from '../../src/core/types';
import { createSubcellId, computeSubcellAggregation } from '../../src/core/types/Subcell';

describe('Aggregators', () => {
  // Helper to create a test subcell
  function createTestSubcell(x_in: number, y_in: number, hasPlant = false): Subcell {
    return {
      id: createSubcellId(x_in, y_in),
      position: { x_in, y_in },
      computed: computeSubcellAggregation(x_in, y_in),
      conditions: {
        sun_hours: 8,
        soil: {
          N_ppm: 50,
          P_ppm: 30,
          K_ppm: 120,
          pH: 6.5,
          compaction_psi: 0,
          organic_matter_pct: 5,
        },
        type: 'planting',
      },
      plant: hasPlant
        ? {
            individual_id: `plant_${x_in}_${y_in}`,
            species_id: 'corn_wapsie_valley',
            planted_date: '2025-05-01',
            expected_yield_lbs: 0.225,
          }
        : undefined,
    };
  }

  describe('getCellSubcells', () => {
    test('returns all 16 subcells for a 1×1 ft cell', () => {
      // Cell (0,0) contains subcells from (0,0) to (9,9) inches
      // With 3-inch subcells, that's 4×4 = 16 subcells
      const allSubcells: Subcell[] = [];
      for (let x = 0; x < 12; x += 3) {
        for (let y = 0; y < 12; y += 3) {
          allSubcells.push(createTestSubcell(x, y));
        }
      }

      const cellSubcells = getCellSubcells(allSubcells, 0, 0);

      expect(cellSubcells.length).toBe(16);
    });

    test('returns correct subcells for cell (1,0)', () => {
      // Cell (1,0) is at 12-24 inches x, 0-12 inches y
      const allSubcells: Subcell[] = [];
      for (let x = 0; x < 48; x += 3) {
        for (let y = 0; y < 12; y += 3) {
          allSubcells.push(createTestSubcell(x, y));
        }
      }

      const cellSubcells = getCellSubcells(allSubcells, 1, 0);

      expect(cellSubcells.length).toBe(16);
      // All should have x between 12 and 23 inches
      cellSubcells.forEach(s => {
        expect(s.position.x_in).toBeGreaterThanOrEqual(12);
        expect(s.position.x_in).toBeLessThan(24);
        expect(s.position.y_in).toBeGreaterThanOrEqual(0);
        expect(s.position.y_in).toBeLessThan(12);
      });
    });

    test('returns empty array for cell with no subcells', () => {
      const allSubcells: Subcell[] = [createTestSubcell(0, 0)];

      const cellSubcells = getCellSubcells(allSubcells, 5, 5);

      expect(cellSubcells).toEqual([]);
    });
  });

  describe('getCellData', () => {
    test('counts plants correctly', () => {
      const subcells: Subcell[] = [];
      // Create cell (0,0) with 4 plants
      for (let x = 0; x < 12; x += 3) {
        for (let y = 0; y < 12; y += 3) {
          subcells.push(createTestSubcell(x, y, x < 6 && y < 6)); // 4 plants in top-left quadrant
        }
      }

      const cellData = getCellData(subcells, 0, 0);

      expect(cellData.plant_counts['corn_wapsie_valley']).toBe(4);
      expect(cellData.total_subcells).toBe(16);
    });

    test('calculates average sun correctly', () => {
      const subcells: Subcell[] = [];
      for (let x = 0; x < 12; x += 3) {
        for (let y = 0; y < 12; y += 3) {
          const subcell = createTestSubcell(x, y);
          // Vary sun hours: first 8, rest 6
          subcell.conditions.sun_hours = x === 0 && y === 0 ? 8 : 6;
          subcells.push(subcell);
        }
      }

      const cellData = getCellData(subcells, 0, 0);

      // 1×8 + 15×6 = 98, 98/16 = 6.125
      expect(cellData.avg_sun).toBeCloseTo(6.125, 2);
    });

    test('identifies pathway cells', () => {
      const subcells: Subcell[] = [];
      for (let x = 0; x < 12; x += 3) {
        for (let y = 0; y < 12; y += 3) {
          const subcell = createTestSubcell(x, y);
          subcell.conditions.type = 'pathway';
          subcells.push(subcell);
        }
      }

      const cellData = getCellData(subcells, 0, 0);

      expect(cellData.is_pathway).toBe(true);
    });

    test('returns empty data for nonexistent cell', () => {
      const subcells: Subcell[] = [createTestSubcell(0, 0)];

      const cellData = getCellData(subcells, 10, 10);

      expect(cellData.total_subcells).toBe(0);
      expect(cellData.plant_counts).toEqual({});
    });
  });

  describe('getZoneData', () => {
    test('aggregates 100 cells (1600 subcells) into one zone', () => {
      // Zone (0,0) spans 0-120 inches in both dimensions
      const subcells: Subcell[] = [];
      for (let x = 0; x < 120; x += 3) {
        for (let y = 0; y < 120; y += 3) {
          subcells.push(createTestSubcell(x, y, Math.random() > 0.5));
        }
      }

      const zoneData = getZoneData(subcells, 0, 0);

      expect(zoneData.total_plants).toBeGreaterThan(0);
      expect(zoneData.total_plants).toBeLessThanOrEqual(1600); // Max 1600 subcells
      expect(zoneData.avg_sun).toBe(8); // All have sun_hours: 8
      expect(zoneData.plant_density).toBe(zoneData.total_plants / 100); // plants per sq ft
    });

    test('calculates plant density correctly', () => {
      const subcells: Subcell[] = [];
      // Create zone with exactly 50 plants
      let plantCount = 0;
      for (let x = 0; x < 120; x += 3) {
        for (let y = 0; y < 120; y += 3) {
          subcells.push(createTestSubcell(x, y, plantCount < 50));
          plantCount++;
        }
      }

      const zoneData = getZoneData(subcells, 0, 0);

      expect(zoneData.total_plants).toBe(50);
      // Zone is 10×10 ft = 100 sq ft
      expect(zoneData.plant_density).toBeCloseTo(0.5, 2); // 50 plants / 100 sq ft
    });

    test('handles empty zone', () => {
      const subcells: Subcell[] = [createTestSubcell(0, 0)];

      const zoneData = getZoneData(subcells, 5, 5);

      expect(zoneData.total_plants).toBe(0);
      expect(zoneData.plant_density).toBe(0);
    });
  });
});
