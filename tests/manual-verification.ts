/**
 * Manual verification of yield calculations
 *
 * This script creates a simple test case and shows all calculation steps
 * so we can verify the math by hand.
 */

import { CORN_WAPSIE_VALLEY, TOMATO_BETTER_BOY, POTATO_RUSSET } from '../src/core/data/plantSpecies';
import { YieldCalculator } from '../src/core/calculators/YieldCalculator';
import type { Garden } from '../src/core/types/Garden';
import type { Subcell } from '../src/core/types/Subcell';

// Create a simple test garden: 100 subcells (5×5 ft area)
const subcells: Subcell[] = [];

for (let i = 0; i < 100; i++) {
  const x_in = (i % 10) * 3; // 10 subcells wide
  const y_in = Math.floor(i / 10) * 3; // 10 subcells tall

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
      sun_hours: 8, // Full sun
      soil: {
        N_ppm: 20,   // Optimal for corn
        P_ppm: 30,   // Optimal
        K_ppm: 150,  // Optimal
        pH: 6.5,     // Optimal
        compaction: 0.8, // Good
      },
      type: 'planting',
    },
  });
}

// Plant corn in first 25 subcells
for (let i = 0; i < 25; i++) {
  subcells[i].plant = {
    species_id: 'corn_golden_bantam',
    planted_week: 12,
    expected_harvest_week: 24,
  };
}

// Plant tomatoes in next 25 subcells
for (let i = 25; i < 50; i++) {
  subcells[i].plant = {
    species_id: 'tomato_beefsteak',
    planted_week: 10,
    expected_harvest_week: 22,
  };
}

// Plant potatoes in next 25 subcells
for (let i = 50; i < 75; i++) {
  subcells[i].plant = {
    species_id: 'potato_russet',
    planted_week: 8,
    expected_harvest_week: 26,
  };
}

// Leave last 25 subcells empty (pathways)

const garden: Garden = {
  id: 'test-garden',
  name: 'Test Garden',
  dimensions_ft: { length: 10, width: 10 },
  subcells,
};

const speciesMap = new Map([
  ['corn_golden_bantam', CORN_GOLDEN_BANTAM],
  ['tomato_beefsteak', TOMATO_BEEFSTEAK],
  ['potato_russet', POTATO_RUSSET],
]);

console.log('='.repeat(80));
console.log('MANUAL YIELD CALCULATION VERIFICATION');
console.log('='.repeat(80));

console.log('\n📊 Garden Setup:');
console.log(`  Total subcells: ${subcells.length}`);
console.log(`  Planted: ${subcells.filter(s => s.plant).length}`);
console.log(`  Corn: 25 subcells`);
console.log(`  Tomatoes: 25 subcells`);
console.log(`  Potatoes: 25 subcells`);
console.log(`  Empty: 25 subcells`);

console.log('\n🌱 Corn (Golden Bantam) - Manual Calculation:');
console.log(`  Baseline yield: ${CORN_GOLDEN_BANTAM.baseline_yield.lbs_per_plant} lbs/plant`);
console.log(`  Spacing: 1 plant per ${CORN_GOLDEN_BANTAM.spacing.plants_per_sqft} sq ft = ${1/CORN_GOLDEN_BANTAM.spacing.plants_per_sqft} sq ft per plant`);
console.log(`  Subcell size: 3 inch × 3 inch = 0.0625 sq ft`);
console.log(`  Plants per subcell: ${CORN_GOLDEN_BANTAM.spacing.plants_per_sqft * 0.0625}`);

// Sun modifier for 8 hours (full sun)
const cornSunMod8 = 1.0; // From breakpoints {4: 0.3, 8: 1.0, 12: 0.9}
console.log(`  Sun modifier (8 hours): ${cornSunMod8}`);

// Soil modifiers
const cornNMod = 1.0; // N_ppm = 20 is optimal
const cornPMod = 1.0; // P_ppm = 30 is optimal
const cornKMod = 1.0; // K_ppm = 150 is optimal
const cornPHMod = 1.0; // pH = 6.5 is optimal
const cornCompactionMod = 1.0; // Compaction = 0.8 is good
console.log(`  Soil N modifier: ${cornNMod}`);
console.log(`  Soil P modifier: ${cornPMod}`);
console.log(`  Soil K modifier: ${cornKMod}`);
console.log(`  Soil pH modifier: ${cornPHMod}`);
console.log(`  Soil compaction modifier: ${cornCompactionMod}`);

// Spacing modifier (subcell is smaller than optimal)
const cornSpacingMod = 0.6; // Subcell is much smaller than optimal
console.log(`  Spacing modifier: ${cornSpacingMod.toFixed(2)}`);

// Success rate
const cornSuccessRate = 0.95;
console.log(`  Success rate: ${cornSuccessRate}`);

// Calculate expected yield per subcell
const plantsPerSubcell = CORN_GOLDEN_BANTAM.spacing.plants_per_sqft * 0.0625;
const yieldPerPlant = CORN_GOLDEN_BANTAM.baseline_yield.lbs_per_plant;
const totalModifier = cornSunMod8 * cornNMod * cornPMod * cornKMod * cornPHMod * cornCompactionMod * cornSpacingMod * cornSuccessRate;

console.log(`\n  Expected yield per subcell:`);
console.log(`    = plants_per_subcell × yield_per_plant × modifiers`);
console.log(`    = ${plantsPerSubcell.toFixed(4)} × ${yieldPerPlant} × ${totalModifier.toFixed(4)}`);
console.log(`    = ${(plantsPerSubcell * yieldPerPlant * totalModifier).toFixed(4)} lbs`);
console.log(`\n  Expected total corn yield (25 subcells):`);
console.log(`    = ${(plantsPerSubcell * yieldPerPlant * totalModifier * 25).toFixed(2)} lbs`);

console.log('\n\n🍅 Tomato (Beefsteak) - Manual Calculation:');
console.log(`  Baseline yield: ${TOMATO_BEEFSTEAK.baseline_yield.lbs_per_plant} lbs/plant`);
console.log(`  Spacing: 1 plant per ${1/TOMATO_BEEFSTEAK.spacing.plants_per_sqft} sq ft`);
console.log(`  Plants per subcell: ${TOMATO_BEEFSTEAK.spacing.plants_per_sqft * 0.0625}`);

const tomatoPlantsPerSubcell = TOMATO_BEEFSTEAK.spacing.plants_per_sqft * 0.0625;
const tomatoYieldPerPlant = TOMATO_BEEFSTEAK.baseline_yield.lbs_per_plant;
const tomatoTotalModifier = 1.0 * 1.0 * 1.0 * 1.0 * 1.0 * 1.0 * 0.6 * 0.9; // Similar modifiers

console.log(`  Expected total tomato yield (25 subcells):`);
console.log(`    = ${(tomatoPlantsPerSubcell * tomatoYieldPerPlant * tomatoTotalModifier * 25).toFixed(2)} lbs`);

console.log('\n\n🥔 Potato (Russet) - Manual Calculation:');
console.log(`  Baseline yield: ${POTATO_RUSSET.baseline_yield.lbs_per_plant} lbs/plant`);
console.log(`  Spacing: 1 plant per ${1/POTATO_RUSSET.spacing.plants_per_sqft} sq ft`);
console.log(`  Plants per subcell: ${POTATO_RUSSET.spacing.plants_per_sqft * 0.0625}`);

const potatoPlantsPerSubcell = POTATO_RUSSET.spacing.plants_per_sqft * 0.0625;
const potatoYieldPerPlant = POTATO_RUSSET.baseline_yield.lbs_per_plant;
const potatoTotalModifier = 1.0 * 1.0 * 1.0 * 1.0 * 1.0 * 1.0 * 0.6 * 0.9;

console.log(`  Expected total potato yield (25 subcells):`);
console.log(`    = ${(potatoPlantsPerSubcell * potatoYieldPerPlant * potatoTotalModifier * 25).toFixed(2)} lbs`);

console.log('\n\n🖥️  Running YieldCalculator...');

const calculator = new YieldCalculator(garden, speciesMap);
const yields = calculator.calculateYields();

console.log('\n📊 Actual Calculator Results:');
yields.forEach(y => {
  console.log(`  ${y.species_id}: ${y.yield_lbs.toFixed(2)} lbs (${y.subcell_count} subcells)`);
});

const totalYield = yields.reduce((sum, y) => sum + y.yield_lbs, 0);
console.log(`\n  Total: ${totalYield.toFixed(2)} lbs`);

console.log('\n\n✅ Verification:');
console.log('  1. Check that corn yield is reasonable (should be ~10-15 lbs for 25 subcells)');
console.log('  2. Check that tomato yield is reasonable (should be ~15-20 lbs for 25 subcells)');
console.log('  3. Check that potato yield is reasonable (should be ~12-18 lbs for 25 subcells)');
console.log('  4. Total should be 40-55 lbs range');

console.log('\n' + '='.repeat(80));
