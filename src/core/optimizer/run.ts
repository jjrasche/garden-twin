/**
 * Run the zone optimizer and print all reports.
 * Usage: npx tsx src/core/optimizer/run.ts
 */

import {
  formatYieldTable,
  estimateCurrentLayout,
  checkConstraints,
  optimizeZones,
  formatReport,
} from './zoneOptimizer';

console.log(formatYieldTable());
console.log('\n');
console.log(estimateCurrentLayout());
console.log('\n');
console.log(checkConstraints());
console.log('\n');
console.log(formatReport(optimizeZones()));
