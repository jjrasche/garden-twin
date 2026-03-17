/**
 * Backtest PRODUCTION_PLAN against historical weather years.
 *
 * Fetches daily weather from Open-Meteo for a given year, remaps
 * dates to 2025, and runs the production timeline to project
 * what would have happened under that year's conditions.
 */

import { fetchHistorical } from '../environment/OpenMeteoClient';
import { createObservedSource } from '../environment/ObservedSource';
import { createCompositeSource, buildObservedDateSet } from '../environment/CompositeSource';
import { createGrandRapidsHistorical } from '../environment/HistoricalSource';
import type { ConditionsResolver, WeatherEntry } from '../environment/types';
import {
  simulateSeason,
  computeSeasonSummary,
  PRODUCTION_PLAN,
  formatTimeline,
  type SeasonSummary,
} from './ProductionTimeline';

/** Remap weather entries from source year to 2025 (preserves month/day). */
export function remapToTargetYear(entries: WeatherEntry[], targetYear: number): WeatherEntry[] {
  return entries.map(e => ({
    ...e,
    date: `${targetYear}${e.date.slice(4)}`,
  }));
}

/** Build a CompositeSource from weather entries (observed + historical fallback). */
export function buildSource(entries: WeatherEntry[]): ConditionsResolver {
  const observed = createObservedSource(entries);
  const historical = createGrandRapidsHistorical();
  const dates = buildObservedDateSet(entries);
  return createCompositeSource(observed, historical, dates);
}

/** Fetch a full growing season (Apr 1 - Dec 15) for a given year. */
export async function fetchYearWeather(year: number): Promise<WeatherEntry[]> {
  return fetchHistorical(new Date(`${year}-04-01`), new Date(`${year}-12-15`));
}

/** Run PRODUCTION_PLAN against a specific year's weather. Returns formatted timeline. */
export async function backtestYear(year: number): Promise<string> {
  const raw = await fetchYearWeather(year);
  const entries = remapToTargetYear(raw, 2025);
  const env = buildSource(entries);
  const weeks = simulateSeason(PRODUCTION_PLAN, env);
  return `\n=== ${year} WEATHER APPLIED TO 2025 PLAN ===\n\n${formatTimeline(weeks)}`;
}

/** Compare season totals across multiple weather years. */
export async function compareSummaries(years: number[]): Promise<string> {
  const historical = createGrandRapidsHistorical();
  const baseWeeks = simulateSeason(PRODUCTION_PLAN, historical);
  const baseSummary = computeSeasonSummary(baseWeeks);

  const col = 10;
  const groups = ['Lettuce', 'Spinach', 'Kale', 'Paste', 'Cherry', 'Potato', 'Corn'] as const;

  const formatRow = (label: string, s: SeasonSummary) =>
    label.padEnd(12) +
    groups.map(g => String(Math.round(s.total_by_group[g] ?? 0)).padStart(col)).join('') +
    String(Math.round(s.grand_total_lbs)).padStart(col);

  const header = 'Year'.padEnd(12) +
    groups.map(g => g.padStart(col)).join('') +
    'TOTAL'.padStart(col);

  const lines: string[] = [
    'SEASON TOTAL COMPARISON (lbs)',
    '',
    header,
    '─'.repeat(header.length),
    formatRow('10yr avg', baseSummary),
  ];

  for (const year of years) {
    const raw = await fetchYearWeather(year);
    const entries = remapToTargetYear(raw, 2025);
    const env = buildSource(entries);
    const weeks = simulateSeason(PRODUCTION_PLAN, env);
    lines.push(formatRow(String(year), computeSeasonSummary(weeks)));
  }

  return lines.join('\n');
}
