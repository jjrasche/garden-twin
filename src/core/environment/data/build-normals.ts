/**
 * One-time script: parse GHCN-Daily .dly file → 365-day normals JSON.
 *
 * Usage: npx tsx src/core/environment/data/build-normals.ts
 *
 * Input:  USW00094860.dly (Grand Rapids Gerald R. Ford Airport)
 * Output: grand-rapids-daily-normals.json
 *
 * GHCN-Daily .dly format: fixed-width, one row per station+year+month+element.
 * Each row has 31 daily values (VALUE1-VALUE31) plus flags.
 * Values are in tenths of °C for TMAX/TMIN, tenths of mm for PRCP.
 * Missing = -9999.
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const DLY_FILE = path.join(DATA_DIR, 'USW00094860.dly');
const OUTPUT_FILE = path.join(DATA_DIR, 'grand-rapids-daily-normals.json');

const START_YEAR = 2015;
const END_YEAR = 2024;
const LATITUDE = 42.96;

interface DayAccum {
  high_sum: number; high_count: number;
  low_sum: number; low_count: number;
  precip_sum: number; precip_count: number;
}

function parseDlyFile(filepath: string): Map<number, DayAccum> {
  const accum = new Map<number, DayAccum>();
  for (let doy = 1; doy <= 366; doy++) {
    accum.set(doy, { high_sum: 0, high_count: 0, low_sum: 0, low_count: 0, precip_sum: 0, precip_count: 0 });
  }

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
      if (date.getMonth() !== month - 1) continue; // Invalid day for month
      const doy = getDoy(date);
      const entry = accum.get(doy)!;

      if (element === 'TMAX') {
        // Tenths of °C → °F
        const tempF = (value / 10) * 9 / 5 + 32;
        entry.high_sum += tempF;
        entry.high_count++;
      } else if (element === 'TMIN') {
        const tempF = (value / 10) * 9 / 5 + 32;
        entry.low_sum += tempF;
        entry.low_count++;
      } else if (element === 'PRCP') {
        // Tenths of mm → inches
        const inches = (value / 10) / 25.4;
        entry.precip_sum += inches;
        entry.precip_count++;
      }
    }
  }

  return accum;
}

function getDoy(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

/** Astronomical photoperiod from latitude + day of year (CBM model). */
function computePhotoperiod(lat: number, doy: number): number {
  const latRad = lat * Math.PI / 180;
  const declination = 23.45 * Math.sin(2 * Math.PI * (284 + doy) / 365) * Math.PI / 180;
  const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declination));
  return (2 * hourAngle * 180 / Math.PI) / 15; // hours
}

/** Soil temp at 4" depth using sinusoidal lag model. */
function computeSoilTemp(annualMean: number, dayAmplitude: number, doy: number): number {
  const DEPTH_DAMPING = 0.6; // amplitude reduction at 4" depth
  const LAG_DAYS = 30; // thermal lag at 4" depth
  const amplitude = dayAmplitude * DEPTH_DAMPING;
  return annualMean + amplitude * Math.sin(2 * Math.PI * (doy - 101 - LAG_DAYS) / 365);
  // 101 = approx DOY of annual mean crossing (April 11)
}

/** Hargreaves-Samani ET₀ estimation (inches/day). */
function computeET0(tmax_f: number, tmin_f: number, doy: number, lat: number): number {
  const tmax_c = (tmax_f - 32) * 5 / 9;
  const tmin_c = (tmin_f - 32) * 5 / 9;
  const tmean_c = (tmax_c + tmin_c) / 2;
  const range_c = Math.max(0, tmax_c - tmin_c);

  // Extraterrestrial radiation (Ra) in MJ/m²/day
  const latRad = lat * Math.PI / 180;
  const decl = 0.409 * Math.sin(2 * Math.PI * doy / 365 - 1.39);
  const dr = 1 + 0.033 * Math.cos(2 * Math.PI * doy / 365);
  const ws = Math.acos(-Math.tan(latRad) * Math.tan(decl));
  const Ra = (24 * 60 / Math.PI) * 0.0820 * dr * (ws * Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.sin(ws));

  // Hargreaves-Samani
  const et0_mm = 0.0023 * Ra * (tmean_c + 17.8) * Math.sqrt(Math.max(0, range_c));
  return Math.max(0, et0_mm / 25.4); // mm → inches
}

// Main
const accum = parseDlyFile(DLY_FILE);

// Compute annual mean air temp for soil model
let annualHighSum = 0, annualLowSum = 0, annualCount = 0;
for (const [, entry] of accum) {
  if (entry.high_count > 0 && entry.low_count > 0) {
    annualHighSum += entry.high_sum / entry.high_count;
    annualLowSum += entry.low_sum / entry.low_count;
    annualCount++;
  }
}
const annualMeanHigh = annualHighSum / annualCount;
const annualMeanLow = annualLowSum / annualCount;
const annualMean = (annualMeanHigh + annualMeanLow) / 2;
const annualAmplitude = (annualMeanHigh - annualMeanLow) / 2;

console.log(`Annual mean: ${annualMean.toFixed(1)}°F, amplitude: ${annualAmplitude.toFixed(1)}°F`);

interface DailyNormal {
  doy: number;
  avg_high_f: number;
  avg_low_f: number;
  avg_precip_in: number;
  photoperiod_h: number;
  soil_temp_f: number;
  et0_in: number;
}

const normals: DailyNormal[] = [];

for (let doy = 1; doy <= 365; doy++) {
  const entry = accum.get(doy)!;
  const avg_high = entry.high_count > 0 ? entry.high_sum / entry.high_count : annualMeanHigh;
  const avg_low = entry.low_count > 0 ? entry.low_sum / entry.low_count : annualMeanLow;
  const avg_precip = entry.precip_count > 0 ? entry.precip_sum / entry.precip_count : 0;

  normals.push({
    doy,
    avg_high_f: Math.round(avg_high * 10) / 10,
    avg_low_f: Math.round(avg_low * 10) / 10,
    avg_precip_in: Math.round(avg_precip * 1000) / 1000,
    photoperiod_h: Math.round(computePhotoperiod(LATITUDE, doy) * 100) / 100,
    soil_temp_f: Math.round(computeSoilTemp(annualMean, annualAmplitude, doy) * 10) / 10,
    et0_in: Math.round(computeET0(avg_high, avg_low, doy, LATITUDE) * 1000) / 1000,
  });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(normals, null, 2));

// Print sample
console.log('\nSample normals:');
for (const doy of [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]) {
  const n = normals[doy - 1]!;
  const date = new Date(2025, 0, doy);
  const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  console.log(`${label.padEnd(7)} high=${n.avg_high_f.toFixed(1)} low=${n.avg_low_f.toFixed(1)} precip=${n.avg_precip_in.toFixed(3)} photo=${n.photoperiod_h.toFixed(1)} soil=${n.soil_temp_f.toFixed(1)} et0=${n.et0_in.toFixed(3)}`);
}

console.log(`\nWrote ${normals.length} daily normals to ${OUTPUT_FILE}`);
