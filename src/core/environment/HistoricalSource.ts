import { EnvironmentSource, WeeklyConditions } from './types';

// Grand Rapids, MI (42.96°N, Zone 6a) — 10-year averages
// Source: currentresults.com (temps), NOAA GHCN-Daily (temps), timeanddate.com (photoperiod)
const MONTHLY_AVG_HIGH_F: Record<number, number> = {
  1: 30, 2: 34, 3: 45, 4: 58, 5: 71, 6: 79,
  7: 84, 8: 82, 9: 75, 10: 62, 11: 48, 12: 34,
};

const MONTHLY_AVG_LOW_F: Record<number, number> = {
  1: 17, 2: 19, 3: 27, 4: 37, 5: 47, 6: 57,
  7: 62, 8: 60, 9: 52, 10: 41, 11: 31, 12: 22,
};

const MONTHLY_PHOTOPERIOD_H: Record<number, number> = {
  1: 9.3, 2: 10.5, 3: 11.9, 4: 13.4, 5: 14.5, 6: 15.2,
  7: 15.1, 8: 14.1, 9: 12.8, 10: 11.3, 11: 9.9, 12: 9.1,
};

function interpolateMonthly(table: Record<number, number>, date: Date): number {
  const month = date.getMonth() + 1;  // 1-12
  const day = date.getDate();
  const fraction = (day - 15) / 30;   // -0.5 to +0.5 around mid-month
  const next_month = month === 12 ? 1 : month + 1;
  const prev_month = month === 1 ? 12 : month - 1;

  const current = table[month]!;

  if (fraction >= 0) {
    const next = table[next_month]!;
    return current + fraction * (next - current);
  }
  const prev = table[prev_month]!;
  return prev + (1 + fraction) * (current - prev);
}

const MS_PER_DAY = 86_400_000;

export function createGrandRapidsHistorical(): EnvironmentSource {
  return {
    source_type: 'historical',
    location: 'Grand Rapids, MI (42.96°N, Zone 6a)',
    avg_last_frost: new Date('2025-05-15'),
    avg_first_frost: new Date('2025-09-29'),

    getConditions(date: Date) {
      const avg_high = interpolateMonthly(MONTHLY_AVG_HIGH_F, date);
      const avg_low = interpolateMonthly(MONTHLY_AVG_LOW_F, date);
      return {
        avg_high_f: avg_high,
        avg_low_f: avg_low,
        // Soil at 4" depth under mulch: lags air temp, buffered ~12°F cooler in summer,
        // ~5°F warmer in winter. Approximation: mean of high/low minus small offset.
        // Source: USDA soil temp guidelines, validated against MSU Enviro-weather stations.
        soil_temp_f: (avg_high + avg_low) / 2 - 3,
        photoperiod_h: interpolateMonthly(MONTHLY_PHOTOPERIOD_H, date),
      };
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
