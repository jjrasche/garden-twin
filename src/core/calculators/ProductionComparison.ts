/**
 * Planned vs actual production comparison.
 *
 * Takes two WeeklyHarvest[] arrays (planned and actual) and computes
 * per-group variance and season-level summary.
 */

import { WeeklyHarvest } from './ProductionTimeline';

export interface WeeklyComparison {
  week_start: Date;
  planned_by_group: Record<string, number>;
  actual_by_group: Record<string, number>;
  variance_by_group: Record<string, number>; // actual - planned (positive = surplus)
  planned_total: number;
  actual_total: number;
  variance_total: number;
}

export interface SeasonComparison {
  planned_total_lbs: number;
  actual_total_lbs: number;
  variance_lbs: number;
  variance_pct: number;
  by_group: Record<string, { planned: number; actual: number; variance: number }>;
}

export function compareTimelines(
  planned: WeeklyHarvest[],
  actual: WeeklyHarvest[],
): WeeklyComparison[] {
  const actual_by_date = new Map<number, WeeklyHarvest>();
  for (const week of actual) {
    actual_by_date.set(week.week_start.getTime(), week);
  }

  return planned.map(pw => {
    const aw = actual_by_date.get(pw.week_start.getTime());
    const actual_by_group = aw?.lbs_by_group ?? {};
    const variance_by_group: Record<string, number> = {};

    const all_groups = new Set([...Object.keys(pw.lbs_by_group), ...Object.keys(actual_by_group)]);
    for (const group of all_groups) {
      const p = pw.lbs_by_group[group] ?? 0;
      const a = actual_by_group[group] ?? 0;
      variance_by_group[group] = a - p;
    }

    const actual_total = aw?.total_lbs ?? 0;

    return {
      week_start: pw.week_start,
      planned_by_group: pw.lbs_by_group,
      actual_by_group,
      variance_by_group,
      planned_total: pw.total_lbs,
      actual_total,
      variance_total: actual_total - pw.total_lbs,
    };
  });
}

export function computeSeasonComparison(comparisons: WeeklyComparison[]): SeasonComparison {
  let planned_total_lbs = 0;
  let actual_total_lbs = 0;
  const by_group: Record<string, { planned: number; actual: number; variance: number }> = {};

  for (const week of comparisons) {
    planned_total_lbs += week.planned_total;
    actual_total_lbs += week.actual_total;

    for (const group of Object.keys(week.variance_by_group)) {
      if (!by_group[group]) {
        by_group[group] = { planned: 0, actual: 0, variance: 0 };
      }
      by_group[group].planned += week.planned_by_group[group] ?? 0;
      by_group[group].actual += week.actual_by_group[group] ?? 0;
      by_group[group].variance += week.variance_by_group[group] ?? 0;
    }
  }

  const variance_lbs = actual_total_lbs - planned_total_lbs;
  const variance_pct = planned_total_lbs > 0 ? (variance_lbs / planned_total_lbs) * 100 : 0;

  return { planned_total_lbs, actual_total_lbs, variance_lbs, variance_pct, by_group };
}
