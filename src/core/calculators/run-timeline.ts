/**
 * Print the weekly production timeline.
 *
 * Usage:
 *   npx tsx src/core/calculators/run-timeline.ts                    # planning mode (default)
 *   npx tsx src/core/calculators/run-timeline.ts --mode=operational  # operational mode with weather JSON
 *         --weather=path/to/weather.json
 *   npx tsx src/core/calculators/run-timeline.ts --mode=backtest     # backtest against past years
 *         --years=2024,2023,2022
 */

import { computeWeeklyHarvest, formatTimeline, PRODUCTION_PLAN, GR_HISTORICAL } from './ProductionTimeline';
import { compareTimelines, computeSeasonComparison } from './ProductionComparison';
import { backtestYear, compareSummaries } from './WeatherBacktest';
import { createObservedSource } from '../environment/ObservedSource';
import { createCompositeSource, buildObservedDateSet } from '../environment/CompositeSource';
import { WeatherEntry } from '../environment/types';
import * as fs from 'fs';

const args = process.argv.slice(2);
const modeArg = args.find(a => a.startsWith('--mode='));
const mode = modeArg?.split('=')[1] ?? 'planning';

if (mode === 'backtest') {
  const yearsArg = args.find(a => a.startsWith('--years='));
  const years = yearsArg
    ? yearsArg.split('=')[1]!.split(',').map(Number)
    : [2024, 2023, 2022];

  (async () => {
    // Summary table
    console.log(await compareSummaries(years));
    // Detailed timeline for most recent year
    console.log(await backtestYear(years[0]!));
  })().catch(err => { console.error(err); process.exit(1); });
} else if (mode === 'operational') {
  const weatherArg = args.find(a => a.startsWith('--weather='));
  const weatherPath = weatherArg?.split('=')[1];

  if (!weatherPath || !fs.existsSync(weatherPath)) {
    console.error('Operational mode requires --weather=<path> to a JSON file of WeatherEntry[]');
    process.exit(1);
  }

  const entries: WeatherEntry[] = JSON.parse(fs.readFileSync(weatherPath, 'utf-8'));
  const observed = createObservedSource(entries);
  const dateSet = buildObservedDateSet(entries);
  const composite = createCompositeSource(observed, GR_HISTORICAL, dateSet);

  const planned = computeWeeklyHarvest(PRODUCTION_PLAN, GR_HISTORICAL);
  const actual = computeWeeklyHarvest(PRODUCTION_PLAN, composite);

  console.log('=== PLANNED (historical averages) ===');
  console.log(formatTimeline(planned));
  console.log('\n=== ACTUAL (observed + historical fallback) ===');
  console.log(formatTimeline(actual));

  const comparison = compareTimelines(planned, actual);
  const summary = computeSeasonComparison(comparison);
  console.log('\n=== SEASON COMPARISON ===');
  console.log(`Planned: ${summary.planned_total_lbs.toFixed(0)} lbs`);
  console.log(`Actual:  ${summary.actual_total_lbs.toFixed(0)} lbs`);
  console.log(`Variance: ${summary.variance_lbs >= 0 ? '+' : ''}${summary.variance_lbs.toFixed(0)} lbs (${summary.variance_pct >= 0 ? '+' : ''}${summary.variance_pct.toFixed(1)}%)`);
} else {
  const weeks = computeWeeklyHarvest(PRODUCTION_PLAN, GR_HISTORICAL);
  console.log(formatTimeline(weeks));
}
