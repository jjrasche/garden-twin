/**
 * Shared utilities for timeline charts — sowing dots, week formatting, colors.
 */

import { PRODUCTION_PLAN, SEASON_RANGE, type CropPlanting } from '@core/calculators/ProductionTimeline';

/** Chart range matches the full simulation range.
 *  Conditions-based charts (growth mod, flavor) show the same time span
 *  as the simulation so seasonal patterns are visible year-round. */
export const CHART_RANGE = {
  start: SEASON_RANGE.start,
  end: SEASON_RANGE.end,
};

const MS_PER_DAY = 86_400_000;

export function formatWeekLabel(date: Date): string {
  const m = date.toLocaleString('en-US', { month: 'short' });
  const d = date.getDate();
  return `${m} ${d}`;
}

export interface SowingDot {
  weekLabel: string;
  group: string;
  color: string;
}

/** One dot per crop per sowing week, positioned at y=0. */
export function buildSowingDots(
  plan: readonly CropPlanting[],
  colorMap: Map<string, string> | Record<string, string>,
): SowingDot[] {
  const seen = new Set<string>();
  const dots: SowingDot[] = [];
  const seasonStart = SEASON_RANGE.start;

  for (const p of plan) {
    const d = new Date(p.planting_date);
    const weekIndex = Math.floor((d.getTime() - seasonStart.getTime()) / (7 * MS_PER_DAY));
    const weekStart = new Date(seasonStart.getTime() + weekIndex * 7 * MS_PER_DAY);
    const label = formatWeekLabel(weekStart);
    const key = `${label}-${p.display_group}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const color = colorMap instanceof Map
      ? colorMap.get(p.display_group) ?? '#9ca3af'
      : colorMap[p.display_group] ?? '#9ca3af';
    dots.push({ weekLabel: label, group: p.display_group, color });
  }
  return dots;
}

/** Pre-built sowing dots from PRODUCTION_PLAN. Pass your color map at call site. */
export function buildDefaultSowingDots(colorMap: Map<string, string> | Record<string, string>): SowingDot[] {
  return buildSowingDots(PRODUCTION_PLAN, colorMap);
}
