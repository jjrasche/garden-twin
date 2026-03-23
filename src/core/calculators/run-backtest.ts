/**
 * Run simulation against each year 2015-2024 to see production variability.
 *
 * Usage: npx tsx src/core/calculators/run-backtest.ts
 */

import { simulateSeason, PRODUCTION_PLAN } from './ProductionTimeline';
import { createGrandRapidsHistorical, AVAILABLE_YEARS } from '../environment/HistoricalSource';

console.log('Year     Lettuce Spinach  Kale   Paste  Cherry Potato  Corn   Greens  TOTAL');
console.log('─'.repeat(85));

for (const year of [...AVAILABLE_YEARS, undefined as number | undefined]) {
  const label = year ?? 'Normal';
  const env = createGrandRapidsHistorical(year);
  const weeks = simulateSeason(PRODUCTION_PLAN, env);

  const totals: Record<string, number> = {};
  for (const w of weeks) {
    for (const [group, lbs] of Object.entries(w.lbs_by_group)) {
      totals[group] = (totals[group] ?? 0) + lbs;
    }
  }

  const lettuce = totals['Lettuce'] ?? 0;
  const spinach = totals['Spinach'] ?? 0;
  const kale = totals['Kale'] ?? 0;
  const paste = totals['Paste'] ?? 0;
  const cherry = totals['Cherry'] ?? 0;
  const potato = totals['Potato'] ?? 0;
  const corn = totals['Corn'] ?? 0;
  const greens = lettuce + spinach + kale;
  const total = lettuce + spinach + kale + paste + cherry + potato + corn;

  console.log(
    String(label).padEnd(8) +
    lettuce.toFixed(0).padStart(7) +
    spinach.toFixed(0).padStart(8) +
    kale.toFixed(0).padStart(6) +
    paste.toFixed(0).padStart(8) +
    cherry.toFixed(0).padStart(7) +
    potato.toFixed(0).padStart(7) +
    corn.toFixed(0).padStart(6) +
    greens.toFixed(0).padStart(9) +
    total.toFixed(0).padStart(7)
  );
}
