import { describe, test, expect } from 'vitest';
import { YieldCalculator } from '../../src/core/calculators/YieldCalculator';
import { CORN_WAPSIE_VALLEY, TOMATO_BETTER_BOY } from '../../src/core/data/plantSpecies';
import { SubcellConditions } from '../../src/core/types';

describe('YieldCalculator', () => {
  const calculator = new YieldCalculator();

  describe('optimal conditions', () => {
    test('calculates baseline yield with all modifiers at 1.0', () => {
      const conditions: SubcellConditions = {
        sun_hours: 8,   // Optimal: 1.0×
        soil: {
          N_ppm: 50,    // Optimal: 1.0×
          P_ppm: 30,    // Optimal: 1.0×
          K_ppm: 120,   // Optimal: 1.0×
          pH: 6.5,      // Optimal: 1.0×
          compaction_psi: 0, // Optimal: 1.0×
          organic_matter_pct: 5,
        },
        type: 'planting',
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        0.67 // Optimal spacing
      );

      // baseline 0.25 × all 1.0 modifiers × 0.9 success = 0.225
      expect(yield_lbs).toBeCloseTo(0.225, 3);
    });

    test('tomato baseline yield', () => {
      const conditions: SubcellConditions = {
        sun_hours: 8,
        soil: {
          N_ppm: 50,
          P_ppm: 30,
          K_ppm: 120,
          pH: 6.2,
          compaction_psi: 0,
          organic_matter_pct: 5,
        },
        type: 'planting',
      };

      const yield_lbs = calculator.calculate(
        TOMATO_BETTER_BOY,
        conditions,
        0.25
      );

      // baseline 15 × all 1.0 modifiers × 0.85 success = 12.75
      expect(yield_lbs).toBeCloseTo(12.75, 2);
    });
  });

  describe('sun modifier', () => {
    test('reduces yield with partial shade', () => {
      const conditions: SubcellConditions = {
        sun_hours: 6,   // Partial shade: 0.7×
        soil: {
          N_ppm: 50,
          P_ppm: 30,
          K_ppm: 120,
          pH: 6.5,
          compaction_psi: 0,
          organic_matter_pct: 5,
        },
        type: 'planting',
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        0.67
      );

      // 0.25 × 0.7 (sun) × 0.9 (success) = 0.1575
      expect(yield_lbs).toBeCloseTo(0.1575, 3);
    });

    test('severely reduces yield with heavy shade', () => {
      const conditions: SubcellConditions = {
        sun_hours: 4,   // Heavy shade: 0.3×
        soil: {
          N_ppm: 50,
          P_ppm: 30,
          K_ppm: 120,
          pH: 6.5,
          compaction_psi: 0,
          organic_matter_pct: 5,
        },
        type: 'planting',
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        0.67
      );

      // 0.25 × 0.3 (sun) × 0.9 (success) = 0.0675
      expect(yield_lbs).toBeCloseTo(0.0675, 3);
    });
  });

  describe('soil nutrient modifiers', () => {
    test('increases yield with high nitrogen', () => {
      const conditions: SubcellConditions = {
        sun_hours: 8,
        soil: {
          N_ppm: 100,   // High: 1.3×
          P_ppm: 30,
          K_ppm: 120,
          pH: 6.5,
          compaction_psi: 0,
          organic_matter_pct: 5,
        },
        type: 'planting',
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        0.67
      );

      // 0.25 × 1.3 (N) × 0.9 (success) = 0.2925
      expect(yield_lbs).toBeCloseTo(0.2925, 3);
    });

    test('reduces yield with low nitrogen', () => {
      const conditions: SubcellConditions = {
        sun_hours: 8,
        soil: {
          N_ppm: 20,    // Low: 0.6×
          P_ppm: 30,
          K_ppm: 120,
          pH: 6.5,
          compaction_psi: 0,
          organic_matter_pct: 5,
        },
        type: 'planting',
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        0.67
      );

      // 0.25 × 0.6 (N) × 0.9 (success) = 0.135
      expect(yield_lbs).toBeCloseTo(0.135, 3);
    });

    test('reduces yield with poor pH', () => {
      const conditions: SubcellConditions = {
        sun_hours: 8,
        soil: {
          N_ppm: 50,
          P_ppm: 30,
          K_ppm: 120,
          pH: 5.5,      // Poor pH: 0.7×
          compaction_psi: 0,
          organic_matter_pct: 5,
        },
        type: 'planting',
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        0.67
      );

      // 0.25 × 0.7 (pH) × 0.9 (success) = 0.1575
      expect(yield_lbs).toBeCloseTo(0.1575, 3);
    });

    test('reduces yield with soil compaction', () => {
      const conditions: SubcellConditions = {
        sun_hours: 8,
        soil: {
          N_ppm: 50,
          P_ppm: 30,
          K_ppm: 120,
          pH: 6.5,
          compaction_psi: 400, // Compacted: 0.7×
          organic_matter_pct: 5,
        },
        type: 'planting',
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        0.67
      );

      // 0.25 × 0.7 (compaction) × 0.9 (success) = 0.1575
      expect(yield_lbs).toBeCloseTo(0.1575, 3);
    });
  });

  describe('spacing modifier', () => {
    test('increases yield with wide spacing', () => {
      const conditions: SubcellConditions = {
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
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        0.3  // Wide spacing: 1.2×
      );

      // 0.25 × 1.2 (spacing) × 0.9 (success) = 0.27
      expect(yield_lbs).toBeCloseTo(0.27, 3);
    });

    test('reduces yield with crowding', () => {
      const conditions: SubcellConditions = {
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
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        2.0  // Crowded: 0.4×
      );

      // 0.25 × 0.4 (spacing) × 0.9 (success) = 0.09
      expect(yield_lbs).toBeCloseTo(0.09, 3);
    });
  });

  describe('compound modifiers', () => {
    test('multiplies all modifiers correctly', () => {
      const conditions: SubcellConditions = {
        sun_hours: 6,    // 0.7×
        soil: {
          N_ppm: 20,     // 0.6×
          P_ppm: 10,     // 0.7×
          K_ppm: 50,     // 0.7×
          pH: 7.5,       // 0.9×
          compaction_psi: 200, // 0.9×
          organic_matter_pct: 5,
        },
        type: 'planting',
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        1.0  // 0.8×
      );

      // 0.25 × 0.7 × 0.6 × 0.7 × 0.7 × 0.9 × 0.9 × 0.8 × 0.9 (success)
      // = 0.25 × 0.132 × 0.9 = 0.0297
      expect(yield_lbs).toBeCloseTo(0.0297, 3);
    });
  });

  describe('edge cases', () => {
    test('returns zero for pathway subcells', () => {
      const conditions: SubcellConditions = {
        sun_hours: 8,
        soil: {
          N_ppm: 50,
          P_ppm: 30,
          K_ppm: 120,
          pH: 6.5,
          compaction_psi: 0,
          organic_matter_pct: 5,
        },
        type: 'pathway',  // Not plantable
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        0.67
      );

      expect(yield_lbs).toBe(0);
    });

    test('handles interpolation between breakpoints', () => {
      const conditions: SubcellConditions = {
        sun_hours: 7,    // Between 6 (0.7) and 8 (1.0): interpolate to 0.85
        soil: {
          N_ppm: 50,
          P_ppm: 30,
          K_ppm: 120,
          pH: 6.5,
          compaction_psi: 0,
          organic_matter_pct: 5,
        },
        type: 'planting',
      };

      const yield_lbs = calculator.calculate(
        CORN_WAPSIE_VALLEY,
        conditions,
        0.67
      );

      // 0.25 × 0.85 (sun interpolated) × 0.9 (success) = 0.19125
      expect(yield_lbs).toBeCloseTo(0.19125, 3);
    });
  });
});
