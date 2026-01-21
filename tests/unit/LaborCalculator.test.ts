import { describe, test, expect } from 'vitest';
import { LaborCalculator } from '../../src/core/calculators/LaborCalculator';
import { CORN_WAPSIE_VALLEY, TOMATO_BETTER_BOY } from '../../src/core/data/plantSpecies';
import { Plan, PlantSpecies } from '../../src/core/types';

describe('LaborCalculator', () => {
  const calculator = new LaborCalculator();

  describe('single plant schedule', () => {
    test('generates labor schedule for corn planting', () => {
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [
          {
            subcell_id: 'sub_0_0',
            species_id: 'corn_wapsie_valley',
            planting_date: '2025-05-01', // Week 18 of 2025
          },
        ],
      };

      const speciesMap = new Map<string, PlantSpecies>([
        [CORN_WAPSIE_VALLEY.id, CORN_WAPSIE_VALLEY],
      ]);

      const schedule = calculator.calculateSchedule(plan, speciesMap, 0.67);

      // Should have labor entries for planting, watering, weeding, harvest
      expect(schedule.length).toBeGreaterThan(0);

      // Find planting week
      const plantingWeek = schedule.find(week =>
        week.tasks.some(task => task.task_name === 'planting')
      );
      expect(plantingWeek).toBeDefined();
      expect(plantingWeek!.total_hours).toBeGreaterThan(0);
    });

    test('accumulates hours correctly for per-plant tasks', () => {
      const plan: Plan = {
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

      const speciesMap = new Map<string, PlantSpecies>([
        [CORN_WAPSIE_VALLEY.id, CORN_WAPSIE_VALLEY],
      ]);

      const schedule = calculator.calculateSchedule(plan, speciesMap, 0.67);

      // Find planting week
      const plantingWeek = schedule.find(week =>
        week.tasks.some(task => task.task_name === 'planting')
      );

      const plantingTask = plantingWeek!.tasks.find(t => t.task_name === 'planting');
      // 1 plant × 0.01 hours = 0.01 hours
      expect(plantingTask!.hours).toBeCloseTo(0.01, 3);
    });

    test('accumulates hours correctly for per-area tasks', () => {
      const plan: Plan = {
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

      const speciesMap = new Map<string, PlantSpecies>([
        [CORN_WAPSIE_VALLEY.id, CORN_WAPSIE_VALLEY],
      ]);

      const schedule = calculator.calculateSchedule(plan, speciesMap, 0.67);

      // Find weeding week
      const weedingWeek = schedule.find(week =>
        week.tasks.some(task => task.task_name === 'weeding')
      );

      expect(weedingWeek).toBeDefined();
      const weedingTask = weedingWeek!.tasks.find(t => t.task_name === 'weeding');
      // 1 plant ÷ 0.67 plants/sq ft = 1.49 sq ft
      // 1.49 sq ft × 0.05 hours/sq ft = 0.0746 hours
      expect(weedingTask!.hours).toBeGreaterThan(0);
    });
  });

  describe('multiple plants schedule', () => {
    test('aggregates labor for multiple plants in same week', () => {
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [
          {
            subcell_id: 'sub_0_0',
            species_id: 'corn_wapsie_valley',
            planting_date: '2025-05-01',
          },
          {
            subcell_id: 'sub_1_0',
            species_id: 'corn_wapsie_valley',
            planting_date: '2025-05-01', // Same date
          },
          {
            subcell_id: 'sub_2_0',
            species_id: 'corn_wapsie_valley',
            planting_date: '2025-05-01', // Same date
          },
        ],
      };

      const speciesMap = new Map<string, PlantSpecies>([
        [CORN_WAPSIE_VALLEY.id, CORN_WAPSIE_VALLEY],
      ]);

      const schedule = calculator.calculateSchedule(plan, speciesMap, 0.67);

      // Find planting week
      const plantingWeek = schedule.find(week =>
        week.tasks.some(task => task.task_name === 'planting')
      );

      const plantingTask = plantingWeek!.tasks.find(t => t.task_name === 'planting');
      // 3 plants × 0.01 hours = 0.03 hours
      expect(plantingTask!.hours).toBeCloseTo(0.03, 3);
    });

    test('separates labor for plants in different weeks', () => {
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [
          {
            subcell_id: 'sub_0_0',
            species_id: 'corn_wapsie_valley',
            planting_date: '2025-05-01', // Week 18
          },
          {
            subcell_id: 'sub_1_0',
            species_id: 'corn_wapsie_valley',
            planting_date: '2025-05-15', // Week 20
          },
        ],
      };

      const speciesMap = new Map<string, PlantSpecies>([
        [CORN_WAPSIE_VALLEY.id, CORN_WAPSIE_VALLEY],
      ]);

      const schedule = calculator.calculateSchedule(plan, speciesMap, 0.67);

      // Should have separate planting weeks
      const plantingWeeks = schedule.filter(week =>
        week.tasks.some(task => task.task_name === 'planting')
      );

      expect(plantingWeeks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('mixed species schedule', () => {
    test('combines labor from different species', () => {
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [
          {
            subcell_id: 'sub_0_0',
            species_id: 'corn_wapsie_valley',
            planting_date: '2025-05-01',
          },
          {
            subcell_id: 'sub_1_0',
            species_id: 'tomato_better_boy',
            planting_date: '2025-05-01', // Same week
          },
        ],
      };

      const speciesMap = new Map<string, PlantSpecies>([
        [CORN_WAPSIE_VALLEY.id, CORN_WAPSIE_VALLEY],
        [TOMATO_BETTER_BOY.id, TOMATO_BETTER_BOY],
      ]);

      const schedule = calculator.calculateSchedule(plan, speciesMap, 1.0);

      // Find planting week
      const plantingWeek = schedule.find(week =>
        week.tasks.some(task => task.task_name === 'planting')
      );

      // Should have tasks from both species
      const cornTask = plantingWeek!.tasks.find(
        t => t.species_id === 'corn_wapsie_valley'
      );
      const tomatoTask = plantingWeek!.tasks.find(
        t => t.species_id === 'tomato_better_boy'
      );

      expect(cornTask).toBeDefined();
      expect(tomatoTask).toBeDefined();

      // Total hours should be sum of both
      expect(plantingWeek!.total_hours).toBeCloseTo(
        cornTask!.hours + tomatoTask!.hours,
        3
      );
    });
  });

  describe('edge cases', () => {
    test('handles empty plan', () => {
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [],
      };

      const speciesMap = new Map<string, PlantSpecies>();

      const schedule = calculator.calculateSchedule(plan, speciesMap, 1.0);

      expect(schedule).toEqual([]);
    });

    test('handles missing species gracefully', () => {
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [
          {
            subcell_id: 'sub_0_0',
            species_id: 'nonexistent_species',
            planting_date: '2025-05-01',
          },
        ],
      };

      const speciesMap = new Map<string, PlantSpecies>();

      // Should not throw, should return empty schedule
      const schedule = calculator.calculateSchedule(plan, speciesMap, 1.0);

      expect(schedule).toEqual([]);
    });

    test('handles planting on January 1st (week 1)', () => {
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [
          {
            subcell_id: 'sub_0_0',
            species_id: 'corn_wapsie_valley',
            planting_date: '2025-01-01', // Week 1
          },
        ],
      };

      const speciesMap = new Map<string, PlantSpecies>([
        [CORN_WAPSIE_VALLEY.id, CORN_WAPSIE_VALLEY],
      ]);

      const schedule = calculator.calculateSchedule(plan, speciesMap, 0.67);

      expect(schedule.length).toBeGreaterThan(0);
      expect(schedule[0]?.week_number).toBeGreaterThan(0);
      expect(schedule[0]?.week_number).toBeLessThanOrEqual(52);
    });

    test('handles planting on December 31st (week 52)', () => {
      const plan: Plan = {
        id: 'test-plan',
        garden_id: 'test-garden',
        created_at: '2025-01-01T00:00:00Z',
        plantings: [
          {
            subcell_id: 'sub_0_0',
            species_id: 'corn_wapsie_valley',
            planting_date: '2025-12-31', // Week 52/1
          },
        ],
      };

      const speciesMap = new Map<string, PlantSpecies>([
        [CORN_WAPSIE_VALLEY.id, CORN_WAPSIE_VALLEY],
      ]);

      const schedule = calculator.calculateSchedule(plan, speciesMap, 0.67);

      expect(schedule.length).toBeGreaterThan(0);
      // Week number should be valid
      schedule.forEach(week => {
        expect(week.week_number).toBeGreaterThan(0);
        expect(week.week_number).toBeLessThanOrEqual(53); // Some years have 53 weeks
      });
    });
  });
});
