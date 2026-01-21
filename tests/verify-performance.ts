/**
 * Performance test: 64,000 subcells (40×100 ft garden)
 */

import { CORN_WAPSIE_VALLEY, TOMATO_BETTER_BOY, POTATO_RUSSET } from '../src/core/data/plantSpecies';
import { YieldCalculator } from '../src/core/calculators/YieldCalculator';
import type { Garden } from '../src/core/types/Garden';
import type { Subcell } from '../src/core/types/Subcell';

console.log('='.repeat(80));
console.log('PERFORMANCE TEST: 64,000 Subcells (40×100 ft garden)');
console.log('='.repeat(80));

// Memory before
const memBefore = process.memoryUsage();
console.log('\n📊 Memory Before:');
console.log(`  Heap Used: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Heap Total: ${(memBefore.heapTotal / 1024 / 1024).toFixed(2)} MB`);

const startTime = Date.now();

// Create 64,000 subcells
console.log('\n🏗️  Creating 64,000 subcells...');
const subcells: Subcell[] = [];

for (let i = 0; i < 64000; i++) {
  const x_in = (i % 1600) * 3; // 1600 subcells wide (40 ft × 12 in/ft ÷ 3 in)
  const y_in = Math.floor(i / 1600) * 3; // 40 rows (100 ft × 12 in/ft ÷ 3 in)

  // Vary conditions across the garden
  const sun_hours = 6 + (i % 5); // 6-10 hours
  const n_ppm = 50 + (i % 100); // 50-150 ppm
  const compaction_psi = 40 + (i % 150); // 40-190 psi

  // Plant corn in 40% of subcells, tomatoes in 30%, potatoes in 15%, leave 15% empty
  let plant = undefined;
  const plantRand = i % 100;
  if (plantRand < 40) {
    plant = {
      individual_id: `plant_${i}`,
      species_id: 'corn_wapsie_valley',
      planted_date: '2025-04-01',
      expected_yield_lbs: 0,
    };
  } else if (plantRand < 70) {
    plant = {
      individual_id: `plant_${i}`,
      species_id: 'tomato_better_boy',
      planted_date: '2025-04-15',
      expected_yield_lbs: 0,
    };
  } else if (plantRand < 85) {
    plant = {
      individual_id: `plant_${i}`,
      species_id: 'potato_russet',
      planted_date: '2025-03-15',
      expected_yield_lbs: 0,
    };
  }

  subcells.push({
    id: `sub_${i}`,
    position: { x_in, y_in },
    computed: {
      cell_x_ft: Math.floor(x_in / 12),
      cell_y_ft: Math.floor(y_in / 12),
      zone_x: Math.floor(x_in / 120),
      zone_y: Math.floor(y_in / 120),
    },
    conditions: {
      sun_hours,
      soil: {
        N_ppm: n_ppm,
        P_ppm: 30,
        K_ppm: 120,
        pH: 6.5,
        compaction_psi,
        organic_matter_pct: 5,
      },
      type: plant ? 'planting' : 'pathway',
    },
    plant,
  });
}

const createTime = Date.now() - startTime;
console.log(`  ✓ Created in ${createTime}ms`);

const garden: Garden = {
  id: 'test-64k',
  name: 'Full Garden (64,000 subcells)',
  dimensions_ft: { length: 100, width: 40 },
  subcells,
};

// Memory after creation
const memAfterCreate = process.memoryUsage();
console.log('\n📊 Memory After Creation:');
console.log(`  Heap Used: ${(memAfterCreate.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Delta: +${((memAfterCreate.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`);

// Calculate yields for all plants
console.log('\n🌽 Calculating yields for all plants...');

const speciesMap = new Map([
  ['corn_wapsie_valley', CORN_WAPSIE_VALLEY],
  ['tomato_better_boy', TOMATO_BETTER_BOY],
  ['potato_russet', POTATO_RUSSET],
]);

const calculator = new YieldCalculator();
let totalYield = 0;
let cornCount = 0;
let tomatoCount = 0;
let potatoCount = 0;

const calcStartTime = Date.now();

for (const subcell of subcells) {
  if (!subcell.plant) continue;

  const species = speciesMap.get(subcell.plant.species_id);
  if (!species) continue;

  const yield_lbs = calculator.calculate(
    species,
    subcell.conditions,
    species.plants_per_sq_ft
  );

  totalYield += yield_lbs;

  if (subcell.plant.species_id === 'corn_wapsie_valley') cornCount++;
  else if (subcell.plant.species_id === 'tomato_better_boy') tomatoCount++;
  else if (subcell.plant.species_id === 'potato_russet') potatoCount++;
}

const calcTime = Date.now() - calcStartTime;
const totalTime = Date.now() - startTime;

// Memory after calculation
const memAfterCalc = process.memoryUsage();
console.log(`  ✓ Calculated in ${calcTime}ms`);

console.log('\n📊 Results:');
console.log(`  Corn subcells: ${cornCount.toLocaleString()}`);
console.log(`  Tomato subcells: ${tomatoCount.toLocaleString()}`);
console.log(`  Potato subcells: ${potatoCount.toLocaleString()}`);
console.log(`  Total yield: ${totalYield.toFixed(2)} lbs`);

console.log('\n⏱️  Performance:');
console.log(`  Creation time: ${createTime}ms`);
console.log(`  Calculation time: ${calcTime}ms`);
console.log(`  Total time: ${totalTime}ms`);
console.log(`  Throughput: ${(subcells.length / (totalTime / 1000)).toFixed(0)} subcells/sec`);

console.log('\n💾 Memory Usage:');
console.log(`  Initial: ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  After creation: ${(memAfterCreate.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  After calculation: ${(memAfterCalc.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Peak: ${(memAfterCalc.heapUsed / 1024 / 1024).toFixed(2)} MB`);

console.log('\n✅ Performance Checks:');
const performanceOk = totalTime < 10000; // Should complete in < 10 seconds
const memoryOk = memAfterCalc.heapUsed < 500 * 1024 * 1024; // < 500 MB

console.log(`  Time < 10s: ${performanceOk ? '✅ PASS' : '❌ FAIL'} (${totalTime}ms)`);
console.log(`  Memory < 500MB: ${memoryOk ? '✅ PASS' : '❌ FAIL'} (${(memAfterCalc.heapUsed / 1024 / 1024).toFixed(2)} MB)`);

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Garden: 64,000 subcells (40×100 ft)`);
console.log(`Plants: ${(cornCount + tomatoCount + potatoCount).toLocaleString()}`);
console.log(`Yield: ${totalYield.toFixed(2)} lbs`);
console.log(`Time: ${totalTime}ms`);
console.log(`Memory: ${(memAfterCalc.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`Result: ${performanceOk && memoryOk ? '✅ PASS' : '❌ FAIL'}`);
console.log('='.repeat(80));

process.exit(performanceOk && memoryOk ? 0 : 1);
