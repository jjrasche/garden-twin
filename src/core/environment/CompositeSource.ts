/**
 * Composite environment source: observed data with historical fallback.
 *
 * Uses observed weather when available, falls back to historical averages
 * for dates without observations. Cutoff date tracks the last observed day.
 */

import { ConditionsResolver, WeatherEntry, WeeklyConditions } from './types';

const MS_PER_DAY = 86_400_000;

export function createCompositeSource(
  observed: ConditionsResolver,
  historical: ConditionsResolver,
  observedDates: Set<string>,
): ConditionsResolver {
  return {
    source_type: 'observed',
    location: observed.location,
    avg_last_frost: observed.avg_last_frost,
    avg_first_frost: observed.avg_first_frost,
    avg_hard_frost: observed.avg_hard_frost,

    getConditions(date: Date) {
      const key = date.toISOString().slice(0, 10);
      if (observedDates.has(key)) {
        return observed.getConditions(date);
      }
      return historical.getConditions(date);
    },

    getWeeklyConditions(start: Date, end: Date) {
      const weeks: WeeklyConditions[] = [];
      const current = new Date(start);
      while (current <= end) {
        const mid_week = new Date(current.getTime() + 3 * MS_PER_DAY);
        weeks.push({
          week_start: new Date(current),
          ...this.getConditions(mid_week),
        });
        current.setDate(current.getDate() + 7);
      }
      return weeks;
    },
  };
}

/** Build the set of observed date keys from WeatherEntry[]. */
export function buildObservedDateSet(entries: WeatherEntry[]): Set<string> {
  return new Set(entries.map(e => e.date));
}
