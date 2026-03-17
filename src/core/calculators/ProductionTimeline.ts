/**
 * Production Timeline Calculator
 *
 * Consumption-backwards planning: derives weekly harvest from species data
 * and a production plan (plant counts + planting dates). Shows whether
 * weekly production meets family + distribution targets.
 *
 * Harvest model: total yield distributed evenly across each planting's
 * harvest window. Succession plantings create overlapping windows for
 * continuous production of cool-season greens.
 */

import { PlantSpecies } from '../types';
import { ConditionsResolver, createGrandRapidsHistorical } from '../environment';
import { type SunZone } from './growthMath';
import type { PlantInstance } from '../types/GardenState';
import { initPlantStates } from '../engine/initPlantStates';
import { collectSnapshots } from '../engine/simulate';
export type { SunZone };

import { LETTUCE_BSS } from '../data/species/lettuce-bss';
import { SPINACH_BLOOMSDALE } from '../data/species/spinach-bloomsdale';
import { KALE_RED_RUSSIAN } from '../data/species/kale-red-russian';
import { TOMATO_AMISH_PASTE } from '../data/species/tomato-amish-paste';
import { TOMATO_SUN_GOLD } from '../data/species/tomato-sun-gold';

import { POTATO_KENNEBEC } from '../data/species/potato-kennebec';
import { CORN_NOTHSTINE_DENT } from '../data/species/corn-nothstine-dent';

export interface CropPlanting {
  species: PlantSpecies;
  display_group: DisplayGroup;
  plant_count: number;
  planting_date: string;
  zone: SunZone;
  harvest_strategy_id?: string;
}

export const GR_HISTORICAL = createGrandRapidsHistorical();

export interface WeeklyHarvest {
  week_start: Date;
  lbs_by_group: Record<string, number>;
  total_lbs: number;
}

// ── Display Groups ──────────────────────────────────────────────────────────
// Aggregate species into groups the user thinks about

const DISPLAY_GROUPS = [
  'Lettuce',
  'Spinach',
  'Kale',
  'Paste',
  'Cherry',
  'Potato',
  'Corn',
] as const;

export type DisplayGroup = (typeof DISPLAY_GROUPS)[number];

// ── Planting Helpers ────────────────────────────────────────────────────────

function createSuccessionPlantings(
  species: PlantSpecies,
  display_group: DisplayGroup,
  total_plants: number,
  batch_count: number,
  first_planting: string,
  interval_days: number,
  zone: SunZone,
): CropPlanting[] {
  const plants_per_batch = Math.round(total_plants / batch_count);
  const start = new Date(first_planting);

  return Array.from({ length: batch_count }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i * interval_days);
    return { species, display_group, plant_count: plants_per_batch, planting_date: date.toISOString().slice(0, 10), zone };
  });
}

function createSinglePlanting(
  species: PlantSpecies,
  display_group: DisplayGroup,
  plant_count: number,
  planting_date: string,
  zone: SunZone,
): CropPlanting {
  return { species, display_group, plant_count, planting_date, zone };
}

// ── Production Plan ─────────────────────────────────────────────────────────
// Consumption-backwards: family of 4 + distribution to 5-10 households
// Adjust plant_count values here to change the plan.

export const PRODUCTION_PLAN: CropPlanting[] = [
  // ── Spring/Fall greens ──────────────────────────────────────────────────
  // Consumption-derived: 7 lbs/week family + 7 distribution = 14 lbs/week greens.
  // Lettuce 280, Spinach 200, Kale 192 total plants (all include +100% distribution).

  // Spring lettuce — 3 batches × 70, 14d apart. 4 cuts before heat bolt.
  ...createSuccessionPlantings(LETTUCE_BSS, 'Lettuce', 210, 3, '2025-04-15', 14, 'shade'),

  // Fall spinach — emphasis crop. No bolt trigger (short days). Cuts into November.
  createSinglePlanting(SPINACH_BLOOMSDALE, 'Spinach', 200, '2025-07-25', 'shade'),
  // Fall lettuce — secondary. 3 cuts before hard frost (28°F kill temp).
  createSinglePlanting(LETTUCE_BSS, 'Lettuce', 70, '2025-07-25', 'shade'),

  // Kale — 120 (60 family + 60 distribution). Biennial, no bolt year 1.
  createSinglePlanting(KALE_RED_RUSSIAN, 'Kale', 120, '2025-05-15', 'boundary'),

  // ── Warm season ─────────────────────────────────────────────────────────

  // Paste — 11 plants (family only, 142 lbs → 44 quarts sauce)
  createSinglePlanting(TOMATO_AMISH_PASTE, 'Paste', 11, '2025-05-25', 'full_sun'),
  // Cherry — 8 Sun Gold (4 family × 2 distribution)
  createSinglePlanting(TOMATO_SUN_GOLD, 'Cherry', 8, '2025-05-25', 'full_sun'),

  // Potato — 88 plants (cellar only 6 months, buy store-bought Feb-Jun)
  createSinglePlanting(POTATO_KENNEBEC, 'Potato', 88, '2025-04-20', 'full_sun'),

  // Corn — 234 (family only, 56 lbs dried grain)
  createSinglePlanting(CORN_NOTHSTINE_DENT, 'Corn', 234, '2025-05-25', 'full_sun'),
];

// ── Weekly Consumption Targets (lbs/week) ───────────────────────────────────
// Family of 4 consumption + distribution scaling

export const WEEKLY_TARGETS: Partial<Record<DisplayGroup, number>> = {
  Cherry: 4.0,    // 2 family + 2 distribution
};

// Combined greens target: 7 family + 7 distribution = 14 lbs/week
export const GREENS_TARGET_PER_WEEK = 14.0;
const GREENS_GROUPS: readonly DisplayGroup[] = ['Lettuce', 'Spinach', 'Kale'];

// ── Display Group Mapping ────────────────────────────────────────────────────

const SPECIES_DISPLAY_GROUP: Record<string, DisplayGroup> = {
  lettuce_bss: 'Lettuce',
  spinach_bloomsdale: 'Spinach',
  kale_red_russian: 'Kale',
  tomato_amish_paste: 'Paste',
  tomato_sun_gold: 'Cherry',
  potato_kennebec: 'Potato',
  corn_nothstine_dent: 'Corn',
};

// ── Plan → PlantInstance Expansion ──────────────────────────────────────────

/** Expand CropPlanting[] into PlantInstance[] for initPlantStates. */
function expandPlanToInstances(plan: CropPlanting[]): PlantInstance[] {
  const instances: PlantInstance[] = [];
  for (const planting of plan) {
    for (let i = 0; i < planting.plant_count; i++) {
      instances.push({
        plant_id: `${planting.species.id}_${planting.display_group}_${planting.planting_date}_${i}`,
        species_id: planting.species.id,
        root_subcell_id: `zone_${planting.zone}`,
        occupied_subcells: [],
        planted_date: planting.planting_date,
        current_stage: 'seed',
        accumulated_gdd: 0,
        last_observed: new Date().toISOString(),
        harvest_strategy_id: planting.harvest_strategy_id,
      });
    }
  }
  return instances;
}

/** Build species catalog from plan entries. */
function buildSpeciesCatalog(plan: CropPlanting[]): Map<string, PlantSpecies> {
  return new Map(plan.map(p => [p.species.id, p.species]));
}

// ── Season Simulation ───────────────────────────────────────────────────────

export const SEASON_RANGE = {
  start: new Date('2025-04-14'),
  end: new Date('2025-11-24'),
};

export function simulateSeason(plan: CropPlanting[], env: ConditionsResolver): WeeklyHarvest[] {
  const instances = expandPlanToInstances(plan);
  const catalog = buildSpeciesCatalog(plan);
  const plants = initPlantStates(instances, catalog, env, SEASON_RANGE.end);
  const snapshots = collectSnapshots(plants, catalog, env, SEASON_RANGE);
  return bucketHarvests(snapshots, catalog);
}

// ── DaySnapshot[] → WeeklyHarvest[] ─────────────────────────────────────────

import type { DaySnapshot } from '../engine/simulate';

/** Aggregate DaySnapshot[] harvest events into 7-day WeeklyHarvest buckets. */
export function bucketHarvests(
  snapshots: DaySnapshot[],
  catalog: Map<string, PlantSpecies>,
): WeeklyHarvest[] {
  if (snapshots.length === 0) return [];

  // Build plant_id → display group lookup from catalog
  const plant_group = new Map<string, string>();

  const weeks: WeeklyHarvest[] = [];
  let week_start = new Date(snapshots[0]!.date);
  let lbs_by_group: Record<string, number> = {};

  for (const snap of snapshots) {
    // Start a new week bucket every 7 days
    const days_since = Math.round((snap.date.getTime() - week_start.getTime()) / 86_400_000);
    if (days_since >= 7) {
      const total_lbs = Object.values(lbs_by_group).reduce((sum, v) => sum + v, 0);
      weeks.push({ week_start: new Date(week_start), lbs_by_group, total_lbs });
      week_start = new Date(snap.date);
      lbs_by_group = {};
    }

    for (const event of snap.events) {
      if (event.type !== 'harvest_ready') continue;

      // Resolve display group: plant_id → species_id → display group
      let group = plant_group.get(event.plant_id);
      if (!group) {
        const species_id = snap.plants.find(p => p.plant_id === event.plant_id)?.species_id;
        group = species_id ? SPECIES_DISPLAY_GROUP[species_id] : undefined;
        if (group) plant_group.set(event.plant_id, group);
      }
      if (!group) continue;

      lbs_by_group[group] = (lbs_by_group[group] ?? 0) + event.accumulated_lbs;
    }
  }

  // Flush final partial week
  const total_lbs = Object.values(lbs_by_group).reduce((sum, v) => sum + v, 0);
  weeks.push({ week_start: new Date(week_start), lbs_by_group, total_lbs });

  return weeks;
}

// ── Season Summary ──────────────────────────────────────────────────────────

export interface SeasonSummary {
  total_by_group: Record<string, number>;
  peak_week_by_group: Record<string, number>;
  producing_weeks_by_group: Record<string, number>;
  grand_total_lbs: number;
}

export function computeSeasonSummary(weeks: WeeklyHarvest[]): SeasonSummary {
  const total_by_group: Record<string, number> = {};
  const peak_week_by_group: Record<string, number> = {};
  const producing_weeks_by_group: Record<string, number> = {};

  for (const week of weeks) {
    for (const [group, lbs] of Object.entries(week.lbs_by_group)) {
      total_by_group[group] = (total_by_group[group] ?? 0) + lbs;
      peak_week_by_group[group] = Math.max(peak_week_by_group[group] ?? 0, lbs);
      producing_weeks_by_group[group] = (producing_weeks_by_group[group] ?? 0) + 1;
    }
  }

  const grand_total_lbs = Object.values(total_by_group).reduce((sum, v) => sum + v, 0);

  return { total_by_group, peak_week_by_group, producing_weeks_by_group, grand_total_lbs };
}

// ── Formatter ───────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, ' ')}`;
}

function pad(value: number | string, width: number): string {
  const str = typeof value === 'number' ? (value === 0 ? '-' : value.toFixed(1)) : value;
  return str.padStart(width);
}

function sumGreens(lbs_by_group: Record<string, number>): number {
  return GREENS_GROUPS.reduce((sum, g) => sum + (lbs_by_group[g] ?? 0), 0);
}

export function formatTimeline(weeks: WeeklyHarvest[]): string {
  const summary = computeSeasonSummary(weeks);
  const col = 8;

  const lines: string[] = [];
  lines.push('WEEKLY PRODUCTION TIMELINE — 2025 Growing Season');
  lines.push('Family of 4 + distribution to 5-10 households');
  lines.push('Yield = baseline × sun(shade_model) × growth_mod × seasonal × bolt_survival × success. GR Zone 6a.');
  lines.push('');

  // Header: individual greens + Greens subtotal + other crops + TOTAL
  const header =
    'Week'.padEnd(14) +
    DISPLAY_GROUPS.map((g) => pad(g, col)).join('') +
    pad('Greens', col) +
    pad('TOTAL', col);
  lines.push(header);
  lines.push('─'.repeat(header.length));

  // Weekly rows — skip empty weeks at start/end
  const first_producing = weeks.findIndex((w) => w.total_lbs > 0);
  const last_producing = weeks.findLastIndex((w) => w.total_lbs > 0);

  for (let i = Math.max(0, first_producing - 1); i <= Math.min(weeks.length - 1, last_producing + 1); i++) {
    const week = weeks[i]!;
    const end_date = new Date(week.week_start);
    end_date.setDate(end_date.getDate() + 6);

    const label = `${formatDate(week.week_start)}-${String(end_date.getDate()).padStart(2, ' ')}`;
    const greens = sumGreens(week.lbs_by_group);
    const row =
      label.padEnd(14) +
      DISPLAY_GROUPS.map((g) => pad(week.lbs_by_group[g] ?? 0, col)).join('') +
      pad(greens, col) +
      pad(week.total_lbs, col);
    lines.push(row);
  }

  // Summary section
  lines.push('─'.repeat(header.length));

  const greens_season_total = GREENS_GROUPS.reduce((s, g) => s + (summary.total_by_group[g] ?? 0), 0);

  const totals_row =
    'SEASON TOTAL'.padEnd(14) +
    DISPLAY_GROUPS.map((g) => pad(Math.round(summary.total_by_group[g] ?? 0), col)).join('') +
    pad(Math.round(greens_season_total), col) +
    pad(Math.round(summary.grand_total_lbs), col);
  lines.push(totals_row);

  // Producing weeks (for greens: weeks where any green produces)
  const greens_producing_weeks = weeks.filter((w) => sumGreens(w.lbs_by_group) > 0).length;
  const producing_row =
    'WEEKS'.padEnd(14) +
    DISPLAY_GROUPS.map((g) => String(summary.producing_weeks_by_group[g] ?? 0).padStart(col)).join('') +
    String(greens_producing_weeks).padStart(col) +
    pad('', col);
  lines.push(producing_row);

  // Targets and averages
  lines.push('');

  const target_row =
    'TARGET/WEEK'.padEnd(14) +
    DISPLAY_GROUPS.map((g) => {
      const target = WEEKLY_TARGETS[g as DisplayGroup];
      return target ? pad(target, col) : pad('--', col);
    }).join('') +
    pad(GREENS_TARGET_PER_WEEK, col);
  lines.push(target_row);

  const greens_avg = greens_producing_weeks > 0 ? greens_season_total / greens_producing_weeks : 0;
  const avg_row =
    'AVG/WEEK'.padEnd(14) +
    DISPLAY_GROUPS.map((g) => {
      const total = summary.total_by_group[g] ?? 0;
      const wk = summary.producing_weeks_by_group[g] ?? 0;
      return wk > 0 ? pad(total / wk, col) : pad('-', col);
    }).join('') +
    pad(greens_avg, col);
  lines.push(avg_row);

  // Surplus/deficit for cherry + greens combined
  const cherry_total = summary.total_by_group['Cherry'] ?? 0;
  const cherry_weeks = summary.producing_weeks_by_group['Cherry'] ?? 0;
  const cherry_avg = cherry_weeks > 0 ? cherry_total / cherry_weeks : 0;
  const cherry_surplus = cherry_avg - (WEEKLY_TARGETS['Cherry'] ?? 0);
  const greens_surplus = greens_avg - GREENS_TARGET_PER_WEEK;

  const surplus_row =
    'SURPLUS/WEEK'.padEnd(14) +
    DISPLAY_GROUPS.map((g) => {
      if (g === 'Cherry') {
        const str = (cherry_surplus >= 0 ? '+' : '') + cherry_surplus.toFixed(1);
        return str.padStart(col);
      }
      return pad('', col);
    }).join('') +
    ((greens_surplus >= 0 ? '+' : '') + greens_surplus.toFixed(1)).padStart(col);
  lines.push(surplus_row);

  return lines.join('\n');
}
