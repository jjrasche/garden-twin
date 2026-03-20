/**
 * ConditionsResolver backed by actual weather observations.
 *
 * Stores WeatherEntry[] in a Map keyed by ISO date for O(1) lookup.
 * Photoperiod computed from solar geometry (deterministic, not interpolated).
 * Missing soil_temp_f estimated from air temp: (high + low) / 2 - 3.
 */

import { ConditionsResolver, WeatherEntry, WeeklyConditions } from './types';

const MS_PER_DAY = 86_400_000;
const DEG_TO_RAD = Math.PI / 180;
const LATITUDE = 42.96; // Grand Rapids, MI

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / MS_PER_DAY);
}

/** Compute photoperiod from solar geometry for Grand Rapids latitude. */
function computePhotoperiod(date: Date): number {
  const doy = dayOfYear(date);
  const declination = 23.44 * Math.sin(2 * Math.PI * (284 + doy) / 365);
  const lat_rad = LATITUDE * DEG_TO_RAD;
  const decl_rad = declination * DEG_TO_RAD;
  const hour_angle = Math.acos(-Math.tan(lat_rad) * Math.tan(decl_rad));
  return (2 * hour_angle) / (Math.PI / 12); // radians to hours
}

function estimateSoilTemp(high_f: number, low_f: number): number {
  return (high_f + low_f) / 2 - 3;
}

// ── Soil Moisture Water Balance ─────────────────────────────────────────────
// Simple bucket model: precip in, ET out, clamped to [irrigation_floor, available_water].
// Returns % of field capacity (0-100). Starts at 100% (spring snowmelt).
// Irrigation floor assumes the water channel keeps soil above 50% FC during growing season.

const AVAILABLE_WATER_IN = 2.0;  // Field capacity minus wilting point, top 12" loamy soil
const CROP_KC = 0.85;            // Average crop coefficient for mixed vegetables
const IRRIGATION_FLOOR_PCT = 50; // Channel irrigation prevents drop below 50% FC
const IRRIGATION_FLOOR_IN = (IRRIGATION_FLOOR_PCT / 100) * AVAILABLE_WATER_IN;

/** Compute daily soil moisture from weather entries (sorted by date). */
function computeDailyMoisture(entries: WeatherEntry[]): Map<string, number> {
  const moisture = new Map<string, number>();
  let water_in = AVAILABLE_WATER_IN; // Start at field capacity

  for (const entry of entries) {
    const precip = entry.precipitation_in ?? 0;
    const et0 = entry.et0_in ?? 0;
    water_in += precip - et0 * CROP_KC;
    water_in = Math.max(IRRIGATION_FLOOR_IN, Math.min(AVAILABLE_WATER_IN, water_in));
    moisture.set(entry.date, (water_in / AVAILABLE_WATER_IN) * 100);
  }

  return moisture;
}

interface ObservedSourceOptions {
  last_frost?: Date;
  first_frost?: Date;
  hard_frost?: Date;
}

export function createObservedSource(
  entries: WeatherEntry[],
  options: ObservedSourceOptions = {},
): ConditionsResolver {
  const byDate = new Map<string, WeatherEntry>();
  for (const entry of entries) {
    byDate.set(entry.date, entry);
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const moisture = computeDailyMoisture(sorted);

  // Default frost dates: use historical averages if not provided
  const avg_last_frost = options.last_frost ?? new Date('2025-05-15');
  const avg_first_frost = options.first_frost ?? new Date('2025-09-29');
  const avg_hard_frost = options.hard_frost ?? new Date('2025-10-25');

  return {
    source_type: 'observed',
    location: 'Grand Rapids, MI (42.96°N, Zone 6a)',
    avg_last_frost,
    avg_first_frost,
    avg_hard_frost,

    getConditions(date: Date) {
      const key = date.toISOString().slice(0, 10);
      const entry = byDate.get(key);

      if (!entry) {
        throw new Error(`No observed weather for ${key}. Use CompositeSource for fallback.`);
      }

      const soil_temp_f = entry.soil_temp_f ?? estimateSoilTemp(entry.high_f, entry.low_f);

      return {
        avg_high_f: entry.high_f,
        avg_low_f: entry.low_f,
        soil_temp_f,
        photoperiod_h: computePhotoperiod(date),
        sunshine_hours: entry.sunshine_hours,
        solar_radiation_mj: entry.solar_radiation_mj,
        soil_moisture_pct_fc: moisture.get(key),
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

/** Check whether observed data exists for a given date. */
export function hasObservedDate(entries: WeatherEntry[], date: Date): boolean {
  const key = date.toISOString().slice(0, 10);
  return entries.some(e => e.date === key);
}
