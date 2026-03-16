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

import { PlantSpecies, survivalRate } from '../types';
import { EnvironmentSource, createGrandRapidsHistorical, computeEffectiveSunHours } from '../environment';
import { computePlantYield } from './yieldModel';
import { interpolate } from './interpolate';
import {
  MS_PER_DAY, SHADE_TREE_HEIGHT_FT, ZONE_PHYS_Y,
  daysBetween,
  computeBoltSurvival, averageGrowthYield,
  computeDeathDate, isDeadFromFrost,
  buildCutSchedule, accumulateGrowth,
  computeDailyGrowth,
  type SunZone,
} from './growthMath';
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

// ── Calculator ──────────────────────────────────────────────────────────────

export function computeWeeklyHarvest(plan: CropPlanting[], env: EnvironmentSource): WeeklyHarvest[] {
  const season_start = new Date('2025-04-14');
  const season_end = new Date('2025-11-24');

  // Pre-compute per-planting data
  const planting_data = plan.map(planting => {
    const plant_date = new Date(planting.planting_date);
    const harvest_start = new Date(plant_date);
    harvest_start.setDate(harvest_start.getDate() + planting.species.days_to_first_harvest);

    // Death date used by continuous/bulk_harvest only
    const death_date = computeDeathDate(planting.species, harvest_start, env, season_end);
    const alive_days = Math.max(7, daysBetween(harvest_start, death_date));

    // Cut schedule for cut_and_come_again
    const cuts = buildCutSchedule(plant_date, planting.species);

    return { plant_date, harvest_start, death_date, alive_days, cuts };
  });

  const weeks: WeeklyHarvest[] = [];
  const current = new Date(season_start);

  while (current <= season_end) {
    const week_end = new Date(current);
    week_end.setDate(week_end.getDate() + 7);
    const lbs_by_group: Record<string, number> = {};

    for (let i = 0; i < plan.length; i++) {
      const planting = plan[i]!;
      const data = planting_data[i]!;
      const harvest_type = planting.species.harvest_type ?? 'continuous';
      const zone_physY = ZONE_PHYS_Y[planting.zone];
      const group = planting.display_group;

      if (harvest_type === 'cut_and_come_again' && data.cuts) {
        // Daily accumulation: integrate growth over each cut's regrowth window.
        // cut_yield = sum_over_window(daily_potential × vigor × modifier) × survival × bolt × plants
        for (let c = 0; c < data.cuts.cut_dates.length; c++) {
          const cut_date = data.cuts.cut_dates[c]!;
          if (cut_date < current || cut_date >= week_end) continue;
          if (isDeadFromFrost(planting.species, cut_date, env)) break;

          const window_start = data.cuts.window_starts[c]!;
          const vigor = data.cuts.vigors[c]!;
          const accumulated = accumulateGrowth(
            planting.species, window_start, cut_date, vigor,
            data.cuts.daily_potential, zone_physY, env,
          );
          const bolt_survival = computeBoltSurvival(planting.species, cut_date, env);
          const cut_yield = accumulated * survivalRate(planting.species) * bolt_survival * planting.plant_count;

          if (cut_yield > 0) {
            lbs_by_group[group] = (lbs_by_group[group] ?? 0) + cut_yield;
          }
        }
      } else if (harvest_type === 'bulk_harvest') {
        // All yield at maturity
        if (current > data.harvest_start || week_end <= data.harvest_start) continue;
        if (data.harvest_start >= data.death_date) continue;

        const mid_week = new Date(current.getTime() + 3.5 * MS_PER_DAY);
        const bolt_survival = computeBoltSurvival(planting.species, mid_week, env);
        const avg_yield = averageGrowthYield(planting.species, data.plant_date, zone_physY, env);
        lbs_by_group[group] = (lbs_by_group[group] ?? 0) + avg_yield * planting.plant_count * bolt_survival;
      } else {
        // Continuous: spread yield across alive window (tomatoes)
        if (week_end <= data.harvest_start || current >= data.death_date) continue;

        const overlap_start = current > data.harvest_start ? current : data.harvest_start;
        const overlap_end = week_end < data.death_date ? week_end : data.death_date;
        const overlap_days = daysBetween(overlap_start, overlap_end);
        const overlap_mid = new Date(overlap_start.getTime() + (overlap_end.getTime() - overlap_start.getTime()) / 2);

        const sun_hours = computeEffectiveSunHours(zone_physY, overlap_mid, SHADE_TREE_HEIGHT_FT);
        const cond = env.getConditions(overlap_mid);
        const per_plant = computePlantYield(planting.species, { sun_hours, ...cond });
        const mid_week = new Date(current.getTime() + 3.5 * MS_PER_DAY);
        const bolt_survival = computeBoltSurvival(planting.species, mid_week, env);
        const proportion = overlap_days / data.alive_days;
        const weekly_yield = per_plant * planting.plant_count * bolt_survival * proportion;

        if (weekly_yield > 0) {
          lbs_by_group[group] = (lbs_by_group[group] ?? 0) + weekly_yield;
        }
      }
    }

    const total_lbs = Object.values(lbs_by_group).reduce((sum, v) => sum + v, 0);
    weeks.push({ week_start: new Date(current), lbs_by_group, total_lbs });
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

// ── Ledger-Driven Simulation ─────────────────────────────────────────────────
// Replaces fixed-calendar cuts with threshold-based harvesting.
// Each planting accumulates daily growth; harvest triggers when biomass
// reaches threshold (cut_and_come_again), maturity date (bulk), or weekly (continuous).

interface SimPlanting {
  species: PlantSpecies;
  group: DisplayGroup;
  plant_count: number;
  zone_physY: number;
  harvest_type: 'cut_and_come_again' | 'bulk_harvest' | 'continuous';
  planting_date: Date;
  accumulated_lbs: number;
  cut_number: number;
  vigor: number;
  daily_potential: number;
  threshold_lbs: number;
  next_harvest_date: Date;
  max_cuts: number;
  regrowth_days: number;
  is_dead: boolean;
}

function initSimPlanting(planting: CropPlanting, env: EnvironmentSource, season_end: Date): SimPlanting {
  const species = planting.species;
  const harvest_type = species.harvest_type ?? 'continuous';
  const plant_date = new Date(planting.planting_date);
  const first_harvest = new Date(plant_date);
  first_harvest.setDate(first_harvest.getDate() + species.days_to_first_harvest);

  const cuts = buildCutSchedule(plant_date, species);
  let daily_potential: number;
  let vigor: number;
  let threshold_lbs: number;

  if (harvest_type === 'cut_and_come_again' && cuts) {
    daily_potential = cuts.daily_potential;
    vigor = cuts.vigors[0]!;
    threshold_lbs = daily_potential * vigor * species.days_to_first_harvest * 0.9;
  } else if (harvest_type === 'bulk_harvest') {
    daily_potential = species.baseline_lbs_per_plant / Math.max(1, species.days_to_first_harvest);
    vigor = 1.0;
    threshold_lbs = 0; // harvest at maturity date, not threshold
  } else {
    // continuous: spread baseline across alive window
    const death_date = computeDeathDate(species, first_harvest, env, season_end);
    const alive_days = Math.max(7, daysBetween(first_harvest, death_date));
    daily_potential = species.baseline_lbs_per_plant / alive_days;
    vigor = 1.0;
    threshold_lbs = 0;
  }

  const cac = species.cut_and_come_again;
  return {
    species, group: planting.display_group, plant_count: planting.plant_count,
    zone_physY: ZONE_PHYS_Y[planting.zone], harvest_type,
    planting_date: plant_date,
    accumulated_lbs: 0, cut_number: 0, vigor, daily_potential, threshold_lbs,
    next_harvest_date: first_harvest,
    max_cuts: cac?.max_cuts ?? 1,
    regrowth_days: cac?.regrowth_days ?? species.days_to_first_harvest,
    is_dead: false,
  };
}

/** Harvest a SimPlanting, returning total lbs. Mutates sim for next cycle. */
function harvestSimPlanting(sim: SimPlanting, date: Date, env: EnvironmentSource): number {
  const bolt_survival = computeBoltSurvival(sim.species, date, env);
  const total = sim.accumulated_lbs * survivalRate(sim.species) * bolt_survival * sim.plant_count;

  sim.accumulated_lbs = 0;
  sim.cut_number++;

  const cac = sim.species.cut_and_come_again;
  if (cac && sim.cut_number >= sim.max_cuts) {
    sim.is_dead = true;
  } else if (sim.harvest_type === 'bulk_harvest') {
    sim.is_dead = true;
  } else if (cac) {
    sim.vigor = interpolate(cac.cut_yield_curve, sim.cut_number + 1);
    sim.threshold_lbs = sim.daily_potential * sim.vigor * sim.regrowth_days * 0.9;
    sim.next_harvest_date = new Date(date);
    sim.next_harvest_date.setDate(sim.next_harvest_date.getDate() + sim.regrowth_days);
  }

  return total;
}

export function simulateSeason(plan: CropPlanting[], env: EnvironmentSource): WeeklyHarvest[] {
  const season_start = new Date('2025-04-14');
  const season_end = new Date('2025-11-24');

  const sims = plan.map(p => initSimPlanting(p, env, season_end));
  const weeks: WeeklyHarvest[] = [];
  const current = new Date(season_start);

  while (current <= season_end) {
    const week_end = new Date(current);
    week_end.setDate(week_end.getDate() + 7);
    const lbs_by_group: Record<string, number> = {};

    const day = new Date(current);
    while (day < week_end && day <= season_end) {
      for (const sim of sims) {
        if (sim.is_dead || day < sim.planting_date) continue;

        if (isDeadFromFrost(sim.species, day, env) || computeBoltSurvival(sim.species, day, env) <= 0.05) {
          sim.is_dead = true;
          continue;
        }

        // Continuous crops only accumulate after first harvest date
        if (sim.harvest_type === 'continuous' && day < sim.next_harvest_date) continue;

        sim.accumulated_lbs += computeDailyGrowth(
          sim.species, day, sim.vigor, sim.daily_potential, sim.zone_physY, env,
        );

        // Threshold-based harvest for cut_and_come_again
        if (sim.harvest_type === 'cut_and_come_again'
            && day >= sim.next_harvest_date
            && sim.accumulated_lbs >= sim.threshold_lbs) {
          const harvested = harvestSimPlanting(sim, day, env);
          if (harvested > 0) lbs_by_group[sim.group] = (lbs_by_group[sim.group] ?? 0) + harvested;
        }

        // Time-based harvest for bulk_harvest
        if (sim.harvest_type === 'bulk_harvest' && day >= sim.next_harvest_date) {
          const harvested = harvestSimPlanting(sim, day, env);
          if (harvested > 0) lbs_by_group[sim.group] = (lbs_by_group[sim.group] ?? 0) + harvested;
        }
      }
      day.setDate(day.getDate() + 1);
    }

    // Weekly harvest for continuous crops
    for (const sim of sims) {
      if (sim.is_dead || sim.harvest_type !== 'continuous' || sim.accumulated_lbs <= 0) continue;
      const harvested = harvestSimPlanting(sim, week_end, env);
      if (harvested > 0) lbs_by_group[sim.group] = (lbs_by_group[sim.group] ?? 0) + harvested;
    }

    const total_lbs = Object.values(lbs_by_group).reduce((sum, v) => sum + v, 0);
    weeks.push({ week_start: new Date(current), lbs_by_group, total_lbs });
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

// ── Ledger-Based Timeline ────────────────────────────────────────────────────

/**
 * Compute weekly harvest from a GrowthLedger.
 *
 * Past weeks use ledger's actual accumulated values. Future weeks project
 * forward with existing planning math. Produces the same WeeklyHarvest[]
 * output as computeWeeklyHarvest for comparison.
 */
export function computeWeeklyHarvestFromLedger(
  ledger: import('./GrowthLedger').GrowthLedger,
  groupLookup: Map<string, DisplayGroup>,
  season_start: Date,
  season_end: Date,
): WeeklyHarvest[] {
  const weeks: WeeklyHarvest[] = [];
  const current = new Date(season_start);

  while (current <= season_end) {
    const week_end = new Date(current);
    week_end.setDate(week_end.getDate() + 7);
    const lbs_by_group: Record<string, number> = {};

    for (const [plant_id, entry] of ledger) {
      if (entry.is_dead) continue;

      const group = groupLookup.get(plant_id);
      if (!group) continue;

      // Check if this plant's harvest falls within this week
      const reset_date = new Date(entry.last_reset_date);
      if (reset_date >= current && reset_date < week_end && entry.accumulated_lbs > 0) {
        lbs_by_group[group] = (lbs_by_group[group] ?? 0) + entry.accumulated_lbs;
      }
    }

    const total_lbs = Object.values(lbs_by_group).reduce((sum, v) => sum + v, 0);
    weeks.push({ week_start: new Date(current), lbs_by_group, total_lbs });
    current.setDate(current.getDate() + 7);
  }

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
