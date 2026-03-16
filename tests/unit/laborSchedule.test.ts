import { describe, it, expect } from 'vitest';
import { buildLaborSchedule, WeeklyLabor } from '../../src/core/calculators/LaborSchedule';
import { LifecycleSpec } from '../../src/core/types/LifecycleSpec';
import { CropPlanting } from '../../src/core/calculators/ProductionTimeline';
import { AMISH_PASTE_LIFECYCLE } from '../../src/core/data/lifecycle/tomato-amish-paste.lifecycle';
import { KALE_RED_RUSSIAN_LIFECYCLE } from '../../src/core/data/lifecycle/kale-red-russian.lifecycle';
import { POTATO_KENNEBEC_LIFECYCLE } from '../../src/core/data/lifecycle/potato-kennebec.lifecycle';
import { TOMATO_AMISH_PASTE } from '../../src/core/data/species/tomato-amish-paste';
import { KALE_RED_RUSSIAN } from '../../src/core/data/species/kale-red-russian';
import { POTATO_KENNEBEC } from '../../src/core/data/species/potato-kennebec';

const SEASON_START = new Date('2025-04-14');
const SEASON_END = new Date('2025-11-24');

function buildSpecs(...specs: LifecycleSpec[]): Map<string, LifecycleSpec> {
  const map = new Map<string, LifecycleSpec>();
  for (const s of specs) map.set(s.species_id, s);
  return map;
}

function createPlanting(species: any, group: string, count: number, date: string): CropPlanting {
  return { species, display_group: group, plant_count: count, planting_date: date, zone: 'full_sun' as any };
}

describe('LaborSchedule', () => {
  describe('buildLaborSchedule', () => {
    it('produces tasks for a single planting', () => {
      const plan = [createPlanting(KALE_RED_RUSSIAN, 'Kale', 10, '2025-05-15')];
      const specs = buildSpecs(KALE_RED_RUSSIAN_LIFECYCLE);
      const weeks = buildLaborSchedule(plan, specs, SEASON_START, SEASON_END);

      expect(weeks.length).toBeGreaterThan(0);

      const all_tasks = weeks.flatMap(w => w.tasks);
      const activity_names = new Set(all_tasks.map(t => t.activity_name));

      expect(activity_names.has('Start seeds indoors')).toBe(true);
      expect(activity_names.has('Transplant to garden')).toBe(true);
      expect(activity_names.has('Harvest leaves (cut)')).toBe(true);
    });

    it('schedules seed start before planting date', () => {
      const plan = [createPlanting(KALE_RED_RUSSIAN, 'Kale', 10, '2025-05-15')];
      const specs = buildSpecs(KALE_RED_RUSSIAN_LIFECYCLE);
      const weeks = buildLaborSchedule(plan, specs, SEASON_START, SEASON_END);

      const seed_tasks = weeks.flatMap(w => w.tasks).filter(t => t.activity_name === 'Start seeds indoors');
      expect(seed_tasks.length).toBe(1);

      // -42 days from May 15 = ~Apr 3
      expect(seed_tasks[0]!.date.getTime()).toBeLessThan(new Date('2025-05-01').getTime());
    });

    it('computes duration from per-plant + fixed', () => {
      const plan = [createPlanting(KALE_RED_RUSSIAN, 'Kale', 100, '2025-05-15')];
      const specs = buildSpecs(KALE_RED_RUSSIAN_LIFECYCLE);
      const weeks = buildLaborSchedule(plan, specs, SEASON_START, SEASON_END);

      const transplant = weeks.flatMap(w => w.tasks).find(t => t.activity_name === 'Transplant to garden');
      expect(transplant).toBeDefined();
      // 100 plants × 1 min + 15 min fixed = 115 min
      expect(transplant!.duration_minutes).toBe(115);
    });

    it('repeats recurring activities until end condition', () => {
      const plan = [createPlanting(KALE_RED_RUSSIAN, 'Kale', 10, '2025-05-15')];
      const specs = buildSpecs(KALE_RED_RUSSIAN_LIFECYCLE);
      const weeks = buildLaborSchedule(plan, specs, SEASON_START, SEASON_END);

      const harvests = weeks.flatMap(w => w.tasks).filter(t => t.activity_name === 'Harvest leaves (cut)');
      // Kale harvest every 14 days from day 50 (Jul 4) to season end (Nov 24) = ~10 cuts
      expect(harvests.length).toBeGreaterThanOrEqual(8);
      expect(harvests.length).toBeLessThanOrEqual(12);
    });

    it('generates processing tasks for paste tomatoes', () => {
      const plan = [createPlanting(TOMATO_AMISH_PASTE, 'Paste', 11, '2025-05-25')];
      const specs = buildSpecs(AMISH_PASTE_LIFECYCLE);
      const weeks = buildLaborSchedule(plan, specs, SEASON_START, SEASON_END);

      const canning = weeks.flatMap(w => w.tasks).filter(t => t.activity_name === 'Can marinara sauce');
      expect(canning.length).toBeGreaterThan(0);

      // 11 plants × 15 lbs × 0.92 survival = ~152 lbs. At 21 lbs/batch = ~8 batches.
      expect(canning.length).toBeGreaterThanOrEqual(6);
      expect(canning.length).toBeLessThanOrEqual(10);

      // Each batch takes 240 min
      expect(canning[0]!.duration_minutes).toBe(240);
    });

    it('aggregates equipment across tasks per week', () => {
      const plan = [createPlanting(POTATO_KENNEBEC, 'Potato', 150, '2025-04-20')];
      const specs = buildSpecs(POTATO_KENNEBEC_LIFECYCLE);
      const weeks = buildLaborSchedule(plan, specs, SEASON_START, SEASON_END);

      const harvest_week = weeks.find(w =>
        w.tasks.some(t => t.activity_name === 'Harvest tubers'),
      );
      expect(harvest_week).toBeDefined();
      expect(harvest_week!.equipment_needed).toContain('digging fork');
      expect(harvest_week!.equipment_needed).toContain('harvest bucket');
    });

    it('sums total_minutes per week', () => {
      const plan = [createPlanting(KALE_RED_RUSSIAN, 'Kale', 50, '2025-05-15')];
      const specs = buildSpecs(KALE_RED_RUSSIAN_LIFECYCLE);
      const weeks = buildLaborSchedule(plan, specs, SEASON_START, SEASON_END);

      for (const week of weeks) {
        const manual_sum = week.tasks.reduce((s, t) => s + t.duration_minutes, 0);
        expect(week.total_minutes).toBe(manual_sum);
      }
    });

    it('handles multiple plantings in the same schedule', () => {
      const plan = [
        createPlanting(KALE_RED_RUSSIAN, 'Kale', 50, '2025-05-15'),
        createPlanting(TOMATO_AMISH_PASTE, 'Paste', 11, '2025-05-25'),
        createPlanting(POTATO_KENNEBEC, 'Potato', 100, '2025-04-20'),
      ];
      const specs = buildSpecs(KALE_RED_RUSSIAN_LIFECYCLE, AMISH_PASTE_LIFECYCLE, POTATO_KENNEBEC_LIFECYCLE);
      const weeks = buildLaborSchedule(plan, specs, SEASON_START, SEASON_END);

      const all_species = new Set(weeks.flatMap(w => w.tasks).map(t => t.species_id));
      expect(all_species.has('kale_red_russian')).toBe(true);
      expect(all_species.has('tomato_amish_paste')).toBe(true);
      expect(all_species.has('potato_kennebec')).toBe(true);
    });

    it('skips plantings with no lifecycle spec', () => {
      const plan = [createPlanting(KALE_RED_RUSSIAN, 'Kale', 50, '2025-05-15')];
      const empty_specs = new Map<string, LifecycleSpec>();
      const weeks = buildLaborSchedule(plan, empty_specs, SEASON_START, SEASON_END);

      expect(weeks.length).toBe(0);
    });
  });
});
