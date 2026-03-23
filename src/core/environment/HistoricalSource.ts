/**
 * Historical weather source — real daily data from NOAA GHCN-Daily.
 *
 * Station: USW00094860 (Grand Rapids Gerald R. Ford Airport)
 * Data: 2015-2024 daily high/low/precip + derived soil temp, photoperiod, ET₀.
 * Source: NOAA NCEI GHCN-Daily, processed by build-daily-data.ts.
 *
 * Year-selectable: simulation runs against a specific year's actual weather
 * or falls back to the 10-year daily normal for planning.
 */

import { ConditionsResolver, WeeklyConditions } from './types';
import dailyData from './data/grand-rapids-daily.json';

interface DailyRecord {
  date: string;
  high_f: number;
  low_f: number;
  precip_in: number;
  photoperiod_h: number;
  sunshine_hours: number;
  soil_temp_f: number;
  et0_in: number;
}

const ALL_RECORDS: DailyRecord[] = dailyData as DailyRecord[];

const MS_PER_DAY = 86_400_000;

/** Index records by date string for fast lookup. */
function buildDateIndex(records: DailyRecord[]): Map<string, DailyRecord> {
  const index = new Map<string, DailyRecord>();
  for (const r of records) index.set(r.date, r);
  return index;
}

/** Compute 365-day normals (mean per day-of-year across all years). */
function buildNormals(records: DailyRecord[]): Map<number, DailyRecord> {
  const accum = new Map<number, { sum_high: number; sum_low: number; sum_precip: number; sum_photo: number; sum_sun: number; sum_soil: number; sum_et0: number; count: number }>();

  for (const r of records) {
    const date = new Date(r.date);
    const doy = getDoy(date);
    const entry = accum.get(doy) ?? { sum_high: 0, sum_low: 0, sum_precip: 0, sum_photo: 0, sum_sun: 0, sum_soil: 0, sum_et0: 0, count: 0 };
    entry.sum_high += r.high_f;
    entry.sum_low += r.low_f;
    entry.sum_precip += r.precip_in;
    entry.sum_photo += r.photoperiod_h;
    entry.sum_sun += r.sunshine_hours;
    entry.sum_soil += r.soil_temp_f;
    entry.sum_et0 += r.et0_in;
    entry.count++;
    accum.set(doy, entry);
  }

  const normals = new Map<number, DailyRecord>();
  for (const [doy, a] of accum) {
    normals.set(doy, {
      date: `normal-${doy}`,
      high_f: a.sum_high / a.count,
      low_f: a.sum_low / a.count,
      precip_in: a.sum_precip / a.count,
      photoperiod_h: a.sum_photo / a.count,
      sunshine_hours: a.sum_sun / a.count,
      soil_temp_f: a.sum_soil / a.count,
      et0_in: a.sum_et0 / a.count,
    });
  }
  return normals;
}

function getDoy(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / MS_PER_DAY);
}

const DATE_INDEX = buildDateIndex(ALL_RECORDS);
const NORMALS = buildNormals(ALL_RECORDS);

function lookupConditions(date: Date, year?: number): Omit<WeeklyConditions, 'week_start'> {
  // Try specific year first
  if (year) {
    const key = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const record = DATE_INDEX.get(key);
    if (record) {
      return {
        avg_high_f: record.high_f,
        avg_low_f: record.low_f,
        soil_temp_f: record.soil_temp_f,
        photoperiod_h: record.photoperiod_h,
        sunshine_hours: record.sunshine_hours,
      };
    }
  }

  // Fall back to daily normal
  const doy = getDoy(date);
  const normal = NORMALS.get(doy) ?? NORMALS.get(1)!;
  return {
    avg_high_f: normal.high_f,
    avg_low_f: normal.low_f,
    soil_temp_f: normal.soil_temp_f,
    photoperiod_h: normal.photoperiod_h,
    sunshine_hours: normal.sunshine_hours,
  };
}

/** Available years in the dataset. */
export const AVAILABLE_YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024] as const;

/** Create a historical source for a specific year's weather, or 'average' for 10-year normals. */
export function createGrandRapidsHistorical(year?: number): ConditionsResolver {
  return {
    source_type: 'historical',
    location: 'Grand Rapids, MI (42.96°N, Zone 6a)',
    // Frost dates kept for backward compat — not used by checkFrost anymore
    avg_last_frost: new Date('2025-05-15'),
    avg_first_frost: new Date('2025-09-29'),
    avg_hard_frost: new Date('2025-10-25'),

    getConditions(date: Date) {
      return lookupConditions(date, year);
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
