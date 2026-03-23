/**
 * Build complete daily weather data from three sources:
 *
 * 1. GHCN-Daily (USW00094860): air temp high/low, precipitation — GR Airport
 * 2. NSRDB (NREL satellite): hourly GHI → daily sunshine hours — exact coordinates
 * 3. CRN Gaylord (MI_Gaylord_9_SSW): measured soil temp + solar radiation — 75mi N
 *
 * Outputs: grand-rapids-daily.json
 * Usage: npx tsx src/core/environment/data/build-daily-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const DLY_FILE = path.join(DATA_DIR, 'USW00094860.dly');
const NSRDB_DIR = path.join(DATA_DIR, 'nsrdb');
const CRN_DIR = path.join(DATA_DIR, 'crn');
const OUTPUT_FILE = path.join(DATA_DIR, 'grand-rapids-daily.json');

const START_YEAR = 2015;
const END_YEAR = 2024;
const LATITUDE = 42.96;

// ── GHCN-Daily parser ───────────────────────────────────────────────────────

interface RawDay {
  date: string;
  high_f?: number;
  low_f?: number;
  precip_in?: number;
}

function parseGhcnDaily(filepath: string): Map<string, RawDay> {
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
      const value = parseInt(line.substring(offset, offset + 5).trim());
      if (value === -9999) continue;
      const date = new Date(year, month - 1, day);
      if (date.getMonth() !== month - 1) continue;
      const dateStr = date.toISOString().slice(0, 10);
      if (!days.has(dateStr)) days.set(dateStr, { date: dateStr });
      const entry = days.get(dateStr)!;

      if (element === 'TMAX') entry.high_f = Math.round(((value / 10) * 9 / 5 + 32) * 10) / 10;
      else if (element === 'TMIN') entry.low_f = Math.round(((value / 10) * 9 / 5 + 32) * 10) / 10;
      else if (element === 'PRCP') entry.precip_in = Math.round(((value / 10) / 25.4) * 1000) / 1000;
    }
  }
  return days;
}

// ── NSRDB parser (hourly GHI → daily sunshine hours) ─────────────────────────

function parseNsrdbYear(filepath: string): Map<string, number> {
  const dailySunshine = new Map<string, number>();
  const lines = fs.readFileSync(filepath, 'utf-8').split('\n');

  // Skip header lines (first 2 are metadata, 3rd is column headers)
  for (let i = 3; i < lines.length; i++) {
    const parts = lines[i]!.split(',');
    if (parts.length < 6) continue;
    const year = parts[0]!.trim();
    const month = parts[1]!.trim().padStart(2, '0');
    const day = parts[2]!.trim().padStart(2, '0');
    const ghi = parseFloat(parts[5]!.trim());
    if (isNaN(ghi)) continue;

    const dateStr = `${year}-${month}-${day}`;
    // Sunshine hour: count hours where GHI > 120 W/m²
    if (ghi > 120) {
      dailySunshine.set(dateStr, (dailySunshine.get(dateStr) ?? 0) + 1);
    } else if (!dailySunshine.has(dateStr)) {
      dailySunshine.set(dateStr, 0);
    }
  }
  return dailySunshine;
}

function loadAllNsrdb(): Map<string, number> {
  const all = new Map<string, number>();
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const filepath = path.join(NSRDB_DIR, `ghi_${year}.csv`);
    if (!fs.existsSync(filepath)) {
      console.log(`  NSRDB: no data for ${year}`);
      continue;
    }
    const yearData = parseNsrdbYear(filepath);
    for (const [date, hours] of yearData) all.set(date, hours);
    console.log(`  NSRDB ${year}: ${yearData.size} days`);
  }
  return all;
}

// ── CRN parser (soil temp + solar radiation) ─────────────────────────────────

interface CrnDay {
  soil_temp_10cm_c: number;   // 10cm ≈ 4" depth
  soil_moisture_10cm: number; // m³/m³
  solar_mj: number;           // MJ/m²/day
}

function parseCrnYear(filepath: string): Map<string, CrnDay> {
  const days = new Map<string, CrnDay>();
  const lines = fs.readFileSync(filepath, 'utf-8').split('\n');

  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 28) continue;

    const dateStr = `${parts[1]!.substring(0, 4)}-${parts[1]!.substring(4, 6)}-${parts[1]!.substring(6, 8)}`;
    const solar_mj = parseFloat(parts[10]!);
    const soil_moisture_10cm = parseFloat(parts[19]!);
    const soil_temp_10cm_c = parseFloat(parts[23]!);

    // -9999 or -99 = missing
    if (soil_temp_10cm_c < -90 || soil_moisture_10cm < -0.1 || solar_mj < -90) continue;

    days.set(dateStr, { soil_temp_10cm_c, soil_moisture_10cm, solar_mj });
  }
  return days;
}

function loadAllCrn(): Map<string, CrnDay> {
  const all = new Map<string, CrnDay>();
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const filepath = path.join(CRN_DIR, `gaylord_${year}.txt`);
    if (!fs.existsSync(filepath)) continue;
    const yearData = parseCrnYear(filepath);
    for (const [date, data] of yearData) all.set(date, data);
    console.log(`  CRN ${year}: ${yearData.size} days`);
  }
  return all;
}

// ── Derived calculations ─────────────────────────────────────────────────────

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
  const cosWs = -Math.tan(latRad) * Math.tan(decl);
  const ws = Math.acos(Math.max(-1, Math.min(1, cosWs)));
  const Ra = (24 * 60 / Math.PI) * 0.0820 * dr * (ws * Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.sin(ws));
  const et0_mm = 0.0023 * Ra * (tmean_c + 17.8) * Math.sqrt(Math.max(0, range_c));
  return Math.max(0, et0_mm / 25.4);
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('Loading GHCN-Daily...');
const ghcn = parseGhcnDaily(DLY_FILE);
console.log(`  ${ghcn.size} days`);

console.log('Loading NSRDB solar...');
const nsrdb = loadAllNsrdb();

console.log('Loading CRN Gaylord...');
const crn = loadAllCrn();

// Soil temp EMA
const SOIL_SMOOTHING_ALPHA = 1 / 7;
const MULCH_BUFFER = 3;
let soilTempEma: number | null = null;

// Water balance model for soil moisture
// Soil parameters from A&L Great Lakes soil test (Sep 2025, Falcon Food Forest)
// HILLSIDE: OM 5.5%, CEC 11.9 → loam with high organic matter
// VALLEY: OM 7.0%, CEC 13.9 → loam to clay loam
const FIELD_CAPACITY_IN = 3.2;    // ~32% volumetric × 10" root zone = 3.2" water
const WILTING_POINT_IN = 1.5;     // ~15% volumetric × 10" root zone
const SATURATION_IN = 4.5;        // ~45% porosity × 10" root zone
const DRAINAGE_RATE = 0.5;        // Fraction of excess above FC that drains per day (loam with high OM)
let soilWater_in = FIELD_CAPACITY_IN; // Start at field capacity (spring snowmelt)

interface DailyRecord {
  date: string;
  high_f: number;
  low_f: number;
  precip_in: number;
  photoperiod_h: number;
  sunshine_hours: number;
  soil_temp_f: number;
  soil_moisture_pct_fc: number;
  et0_in: number;
  // Data source flags
  sunshine_source: 'nsrdb' | 'estimated';
  soil_temp_source: 'crn' | 'ema';
}

const records: DailyRecord[] = [];
const sorted = [...ghcn.entries()].sort((a, b) => a[0].localeCompare(b[0]));

for (const [dateStr, day] of sorted) {
  if (day.high_f === undefined || day.low_f === undefined) continue;

  const date = new Date(dateStr);
  const doy = getDoy(date);
  const dailyMeanAir = (day.high_f + day.low_f) / 2;

  // Soil temp: prefer CRN measured, fall back to EMA
  const crnDay = crn.get(dateStr);
  let soil_temp_f: number;
  let soil_temp_source: 'crn' | 'ema';

  if (crnDay && crnDay.soil_temp_10cm_c > -40) {
    soil_temp_f = Math.round((crnDay.soil_temp_10cm_c * 9 / 5 + 32) * 10) / 10;
    soil_temp_source = 'crn';
    soilTempEma = (soil_temp_f - 32) * 5 / 9; // Sync EMA to measured for continuity
  } else {
    if (soilTempEma === null) soilTempEma = (dailyMeanAir - 32) * 5 / 9;
    else soilTempEma = SOIL_SMOOTHING_ALPHA * ((dailyMeanAir - 32) * 5 / 9) + (1 - SOIL_SMOOTHING_ALPHA) * soilTempEma;
    const emaF = soilTempEma * 9 / 5 + 32;
    soil_temp_f = Math.round((emaF + (dailyMeanAir < 40 ? MULCH_BUFFER : dailyMeanAir > 80 ? -2 : 0)) * 10) / 10;
    soil_temp_source = 'ema';
  }

  // Sunshine hours: prefer NSRDB satellite, fall back to temp-range estimate
  let sunshine_hours: number;
  let sunshine_source: 'nsrdb' | 'estimated';

  const nsrdbHours = nsrdb.get(dateStr);
  if (nsrdbHours !== undefined) {
    sunshine_hours = nsrdbHours;
    sunshine_source = 'nsrdb';
  } else {
    // Hargreaves approximation: sunshine ∝ temp range (clear sky = big range)
    const tempRange = day.high_f - day.low_f;
    const maxRange = 30; // Clear sky max range for GR
    const photoperiod = computePhotoperiod(LATITUDE, doy);
    sunshine_hours = Math.round(Math.min(photoperiod, photoperiod * Math.min(1, tempRange / maxRange)) * 10) / 10;
    sunshine_source = 'estimated';
  }

  // Water balance: precip in, ET₀ out, drain excess
  const et0 = computeET0(day.high_f, day.low_f, doy, LATITUDE);
  const precip = day.precip_in ?? 0;

  // Reset to field capacity at start of each year (spring snowmelt)
  if (doy <= 2) soilWater_in = FIELD_CAPACITY_IN;

  soilWater_in += precip;
  soilWater_in -= et0;
  // Drain excess above field capacity
  if (soilWater_in > FIELD_CAPACITY_IN) {
    const excess = soilWater_in - FIELD_CAPACITY_IN;
    soilWater_in -= excess * DRAINAGE_RATE;
  }
  // Irrigation: gardener waters when soil drops below 60% FC during growing season (May-Oct)
  const month = date.getMonth() + 1;
  const isGrowingSeason = month >= 4 && month <= 10;
  const IRRIGATION_TRIGGER_IN = FIELD_CAPACITY_IN * 0.6;  // Water when below 60% FC
  const IRRIGATION_TARGET_IN = FIELD_CAPACITY_IN * 0.8;    // Top up to 80% FC
  if (isGrowingSeason && soilWater_in < IRRIGATION_TRIGGER_IN) {
    soilWater_in = IRRIGATION_TARGET_IN;
  }
  // Clamp: can't go below wilting point (deep roots find some water) or above saturation
  soilWater_in = Math.max(WILTING_POINT_IN * 0.5, Math.min(SATURATION_IN, soilWater_in));
  const soil_moisture_pct_fc = Math.round((soilWater_in / FIELD_CAPACITY_IN) * 100 * 10) / 10;

  records.push({
    date: dateStr,
    high_f: day.high_f,
    low_f: day.low_f,
    precip_in: precip,
    photoperiod_h: Math.round(computePhotoperiod(LATITUDE, doy) * 100) / 100,
    sunshine_hours: Math.round(sunshine_hours * 10) / 10,
    soil_temp_f,
    soil_moisture_pct_fc,
    et0_in: Math.round(et0 * 1000) / 1000,
    sunshine_source,
    soil_temp_source,
  });
}

// Strip source flags for the output (keep it lean)
const output = records.map(({ sunshine_source, soil_temp_source, ...rest }) => rest);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));

// Stats
const nsrdbCount = records.filter(r => r.sunshine_source === 'nsrdb').length;
const crnCount = records.filter(r => r.soil_temp_source === 'crn').length;
console.log(`\nTotal: ${records.length} days`);
console.log(`Sunshine: ${nsrdbCount} NSRDB / ${records.length - nsrdbCount} estimated`);
console.log(`Soil temp: ${crnCount} CRN measured / ${records.length - crnCount} EMA estimated`);

// Sample
console.log('\nSample (Jul 15 each year):');
for (let year = START_YEAR; year <= END_YEAR; year++) {
  const r = records.find(r => r.date === `${year}-07-15`);
  if (r) console.log(`  ${r.date} high=${r.high_f} sun=${r.sunshine_hours}h soil=${r.soil_temp_f}F`);
}
