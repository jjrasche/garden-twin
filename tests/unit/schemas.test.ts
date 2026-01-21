import { describe, test, expect } from 'vitest';
import {
  SubcellSchema,
  PlantSpeciesSchema,
  GardenSchema,
  ProjectionSchema,
  PlanSchema,
  createSubcellId,
  computeSubcellAggregation,
  calculateTotalSubcells,
} from '../../src/core/types';
import { getGardenDimensions } from '../../src/core/types/Garden';

describe('Zod Schema Validation', () => {
  describe('SubcellSchema', () => {
    test('validates correct subcell', () => {
      const validSubcell = {
        id: 'sub_0_0',
        position: { x_in: 0, y_in: 0 },
        computed: { cell_x_ft: 0, cell_y_ft: 0, zone_x: 0, zone_y: 0 },
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
          type: 'planting' as const,
        },
      };

      const result = SubcellSchema.safeParse(validSubcell);
      expect(result.success).toBe(true);
    });

    test('rejects invalid sun_hours', () => {
      const invalidSubcell = {
        id: 'sub_0_0',
        position: { x_in: 0, y_in: 0 },
        computed: { cell_x_ft: 0, cell_y_ft: 0, zone_x: 0, zone_y: 0 },
        conditions: {
          sun_hours: 25, // Invalid: > 24
          soil: {
            N_ppm: 50,
            P_ppm: 30,
            K_ppm: 120,
            pH: 6.5,
            compaction_psi: 0,
            organic_matter_pct: 5,
          },
          type: 'planting' as const,
        },
      };

      const result = SubcellSchema.safeParse(invalidSubcell);
      expect(result.success).toBe(false);
    });

    test('rejects invalid pH', () => {
      const invalidSubcell = {
        id: 'sub_0_0',
        position: { x_in: 0, y_in: 0 },
        computed: { cell_x_ft: 0, cell_y_ft: 0, zone_x: 0, zone_y: 0 },
        conditions: {
          sun_hours: 8,
          soil: {
            N_ppm: 50,
            P_ppm: 30,
            K_ppm: 120,
            pH: 15, // Invalid: > 14
            compaction_psi: 0,
            organic_matter_pct: 5,
          },
          type: 'planting' as const,
        },
      };

      const result = SubcellSchema.safeParse(invalidSubcell);
      expect(result.success).toBe(false);
    });
  });

  describe('PlantSpeciesSchema', () => {
    test('validates corn species', () => {
      const cornSpecies = {
        id: 'corn_test',
        name: 'Test Corn',
        plants_per_sq_ft: 0.67,
        height_ft: 8,
        days_to_first_harvest: 89,
        days_harvest_window: 14,
        baseline_lbs_per_plant: 0.25,
        success_rate: 0.9,
        modifiers: {
          sun: { '4': 0.3, '8': 1.0 },
          soil: {
            N_ppm: { '20': 0.6, '50': 1.0 },
            P_ppm: { '10': 0.7, '30': 1.0 },
            K_ppm: { '50': 0.7, '120': 1.0 },
            pH: { '5.5': 0.7, '6.5': 1.0 },
            compaction_psi: { '0': 1.0, '400': 0.7 },
          },
          spacing_plants_per_sq_ft: { '0.3': 1.2, '0.67': 1.0 },
        },
        nutrition_per_lb: {
          calories: 1550,
          protein_g: 39,
          carbs_g: 334,
          fat_g: 21,
          fiber_g: 33,
        },
        icon: { emoji: '🌽' },
        tasks: [{ name: 'planting', timing_days: [0], hours_per_plant: 0.01 }],
        seed_cost_per_plant: 0.15,
        data_confidence: 'high' as const,
        sources: [
          {
            claim: 'yield',
            citation: 'Test Source',
            url: 'https://example.com',
          },
        ],
      };

      const result = PlantSpeciesSchema.safeParse(cornSpecies);
      expect(result.success).toBe(true);
    });

    test('rejects invalid success_rate', () => {
      const invalidSpecies = {
        id: 'test',
        name: 'Test',
        plants_per_sq_ft: 1,
        height_ft: 5,
        days_to_first_harvest: 60,
        days_harvest_window: 10,
        baseline_lbs_per_plant: 1,
        success_rate: 1.5, // Invalid: > 1
        modifiers: {
          sun: { '8': 1.0 },
          soil: {
            N_ppm: { '50': 1.0 },
            P_ppm: { '30': 1.0 },
            K_ppm: { '120': 1.0 },
            pH: { '6.5': 1.0 },
            compaction_psi: { '0': 1.0 },
          },
          spacing_plants_per_sq_ft: { '1': 1.0 },
        },
        nutrition_per_lb: {
          calories: 100,
          protein_g: 10,
          carbs_g: 20,
          fat_g: 5,
          fiber_g: 5,
        },
        icon: { emoji: '🌱' },
        tasks: [],
        seed_cost_per_plant: 0.1,
        data_confidence: 'high' as const,
        sources: [],
      };

      const result = PlantSpeciesSchema.safeParse(invalidSpecies);
      expect(result.success).toBe(false);
    });
  });

  describe('GardenSchema', () => {
    test('validates minimal garden', () => {
      const garden = {
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

      const result = GardenSchema.safeParse(garden);
      expect(result.success).toBe(true);
    });

    test('rejects invalid latitude', () => {
      const garden = {
        id: 'test-garden',
        location: {
          lat: 91, // Invalid: > 90
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

      const result = GardenSchema.safeParse(garden);
      expect(result.success).toBe(false);
    });
  });

  describe('PlanSchema', () => {
    test('validates empty plan', () => {
      const plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [],
      };

      const result = PlanSchema.safeParse(plan);
      expect(result.success).toBe(true);
    });

    test('validates plan with plantings', () => {
      const plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [
          {
            subcell_id: 'sub_0_0',
            species_id: 'corn',
            planting_date: '2025-05-01',
          },
        ],
      };

      const result = PlanSchema.safeParse(plan);
      expect(result.success).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    test('createSubcellId creates correct format', () => {
      expect(createSubcellId(0, 0)).toBe('sub_0_0');
      expect(createSubcellId(123, 456)).toBe('sub_123_456');
    });

    test('computeSubcellAggregation calculates correctly', () => {
      // Subcell at (0, 0) inches
      expect(computeSubcellAggregation(0, 0)).toEqual({
        cell_x_ft: 0,
        cell_y_ft: 0,
        zone_x: 0,
        zone_y: 0,
      });

      // Subcell at (15, 30) inches
      expect(computeSubcellAggregation(15, 30)).toEqual({
        cell_x_ft: 1,  // floor(15/12) = 1
        cell_y_ft: 2,  // floor(30/12) = 2
        zone_x: 0,     // floor(15/120) = 0
        zone_y: 0,     // floor(30/120) = 0
      });

      // Subcell at (125, 250) inches
      expect(computeSubcellAggregation(125, 250)).toEqual({
        cell_x_ft: 10,  // floor(125/12) = 10
        cell_y_ft: 20,  // floor(250/12) = 20
        zone_x: 1,      // floor(125/120) = 1
        zone_y: 2,      // floor(250/120) = 2
      });
    });

    test('calculateTotalSubcells calculates correctly', () => {
      // 10×10 ft garden with 3-inch subcells
      // 120 inches / 3 = 40 subcells per dimension
      // 40 × 40 = 1600 subcells
      expect(calculateTotalSubcells(10, 10, 3)).toBe(1600);

      // 40×100 ft garden
      // 480 × 1200 inches = 576,000 sq in
      // 160 × 400 = 64,000 subcells
      expect(calculateTotalSubcells(40, 100, 3)).toBe(64000);
    });
  });

  describe('Garden Helper Functions', () => {
    test('getGardenDimensions calculates all dimensions', () => {
      const grid = {
        width_ft: 40,
        length_ft: 100,
        subcell_size_in: 3,
        total_subcells: 64000,
      };

      const dims = getGardenDimensions(grid);

      expect(dims.width.ft).toBe(40);
      expect(dims.width.in).toBe(480);
      expect(dims.width.subcells).toBe(160);
      expect(dims.width.cells).toBe(40);
      expect(dims.width.zones).toBe(4);

      expect(dims.length.ft).toBe(100);
      expect(dims.length.in).toBe(1200);
      expect(dims.length.subcells).toBe(400);
      expect(dims.length.cells).toBe(100);
      expect(dims.length.zones).toBe(10);

      expect(dims.total_area_sq_ft).toBe(4000);
    });
  });
});
