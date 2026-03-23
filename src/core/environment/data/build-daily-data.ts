/**
 * Parse GHCN-Daily .dly file → raw daily weather data for all years (2015-2024).
 *
 * Usage: npx tsx src/core/environment/data/build-daily-data.ts
 *
 * Output: grand-rapids-daily.json — array of { date, high_f, low_f, precip_in }
 * for every day with data across 10 years. Plus derived fields (photoperiod,
 * soil_temp, et0) computed per-day.
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const DLY_FILE = path.join(DATA_DIR, 'USW00094860.dly');
const OUTPUT_FILE = path.join(DATA_DIR, 'grand-rapids-daily.json');

const START_YEAR = 2015;
const END_YEAR = 2024;
const LATITUDE = 42.96;

interface RawDay {
  date: string;
  high_f?: number;
  low_f?: number;
  precip_in?: number;
}

function parseDlyFile(filepath: string): Map<string, RawDay> {
  const days = new Map<string, RawDay>();
  const lines = fs.readFileSync(filepath, 'utf-8').split('\n');

  for (const line of lines) {
    if (line.length < 269) continue;

    const year = parseInt(line.substring(11, 15));
    const month = parseInt(line.substring(15, 17));
    const element = line.substring(17, 21);

    if (year < START_YEAR || year > END_YEAR) continue;
    if (element !== 'TMAX' && element !== 'TMIN' && element !== 'PRCP') continue;

    for (let day = 1; day <= 31; day++) {
      const offset = 21 + (day - 1) * 8;
      const valueStr = line.substring(offset, offset + 5).trim();
      const value = parseInt(valueStr);
      if (value === -9999) continue;

      const date = new Date(year, month - 1, day);
      if (date.getMonth() !== month - 1) continue;
      const dateStr = date.toISOString().slice(0, 10);

      if (!days.has(dateStr)) days.set(dateStr, { date: dateStr });
      const entry = days.get(dateStr)!;

      if (element === 'TMAX') {
        entry.high_f = Math.round(((value / 10) * 9 / 5 + 32) * 10) / 10;
      } else if (element === 'TMIN') {
        entry.low_f = Math.round(((value / 10) * 9 / 5 + 32) * 10) / 10;
      } else if (element === 'PRCP') {
        entry.precip_in = Math.round(((value / 10) / 25.4) * 1000) / 1000;
      }
    }
  }

  return days;
}

function getDoy(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function computePhotoperiod(lat: number, doy: number): number {
  const latRad = lat * Math.PI / 180;
  const declination = 23.45 * Math.sin(2 * Math.PI * (284 + doy) / 365) * Math.PI / 180;
  const cosHA = -Math.tan(latRad) * Math.tan(declination);
  if (cosHA <= -1) return 24;
  if (cosHA >= 1) return 0;
  return (2 * Math.acos(cosHA) * 180 / Math.PI) / 15;
}

function computeET0(tmax_f: number, tmin_f: number, doy: number, lat: number): number {
  const tmax_c = (tmax_f - 32) * 5 / 9;
  const tmin_c = (tmin_f - 32) * 5 / 9;
  const tmean_c = (tmax_c + tmin_c) / 2;
  const range_c = Math.max(0, tmax_c - tmin_c);
  const latRad = lat * Math.PI / 180;
  const decl = 0.409 * Math.sin(2 * Math.PI * doy / 365 - 1.39);
  const dr = 1 + 0.033 * Math.cos(2 * Math.PI * doy / 365);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(latRad) * Math.tan(decl))));
  const Ra = (24 * 60 / Math.PI) * 0.0820 * dr * (ws * Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.sin(ws));
  const et0_mm = 0.0023 * Ra * (tmean_c + 17.8) * Math.sqrt(Math.max(0, range_c));
  return Math.max(0, et0_mm / 25.4);
}

// Parse
const rawDays = parseDlyFile(DLY_FILE);

// Compute annual means for soil temp model (per year)
const yearMeans = new Map<number, { mean: number; amplitude: number }>();
for (let year = START_YEAR; year <= END_YEAR; year++) {
  let highSum = 0, lowSum = 0, count = 0;
  for (const [dateStr, day] of rawDays) {
    if (dateStr.startsWith(String(year)) && day.high_f !== undefined && day.low_f !== undefined) {
      highSum += day.high_f;
      lowSum += day.low_f;
      count++;
    }
  }
  if (count > 0) {
    const meanHigh = highSum / count;
    const meanLow = lowSum / count;
    yearMeans.set(year, { mean: (meanHigh + meanLow) / 2, amplitude: (meanHigh - meanLow) / 2 });
  }
}

interface DailyRecord {
  date: string;
  high_f: number;
  low_f: number;
  precip_in: number;
  photoperiod_h: number;
  soil_temp_f: number;
  et0_in: number;
}

const records: DailyRecord[] = [];

for (const [dateStr, day] of [...rawDays.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (day.high_f === undefined || day.low_f === undefined) continue;

  const date = new Date(dateStr);
  const year = date.getFullYear();
  const doy = getDoy(date);
  const ym = yearMeans.get(year) ?? { mean: 50, amplitude: 9 };

  const DEPTH_DAMPING = 0.6;
  const LAG_DAYS = 30;
  const soilTemp = ym.mean + ym.amplitude * DEPTH_DAMPING * Math.sin(2 * Math.PI * (doy - 101 - LAG_DAYS) / 365);

  records.push({
    date: dateStr,
    high_f: day.high_f,
    low_f: day.low_f,
    precip_in: day.precip_in ?? 0,
    photoperiod_h: Math.round(computePhotoperiod(LATITUDE, doy) * 100) / 100,
    soil_temp_f: Math.round(soilTemp * 10) / 10,
    et0_in: Math.round(computeET0(day.high_f, day.low_f, doy, LATITUDE) * 1000) / 1000,
  });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(records));

// Stats
const byYear = new Map<number, number>();
for (const r of records) {
  const y = parseInt(r.date.substring(0, 4));
  byYear.set(y, (byYear.get(y) ?? 0) + 1);
}

console.log(`Total records: ${records.length}`);
for (const [year, count] of [...byYear.entries()].sort()) {
  console.log(`  ${year}: ${count} days`);
}

// Coldest lows per year
for (let year = START_YEAR; year <= END_YEAR; year++) {
  const yearRecords = records.filter(r => r.date.startsWith(String(year)));
  const coldest = yearRecords.reduce((min, r) => r.low_f < min.low_f ? r : min, yearRecords[0]!);
  console.log(`  ${year} coldest: ${coldest.low_f}°F on ${coldest.date}`);
}
