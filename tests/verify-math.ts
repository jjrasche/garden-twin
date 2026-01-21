/**
 * Simple yield calculation verification
 * Shows one complete calculation end-to-end with manual math
 */

import { CORN_WAPSIE_VALLEY, POTATO_RUSSET } from '../src/core/data/plantSpecies';
import { YieldCalculator } from '../src/core/calculators/YieldCalculator';
import { interpolate } from '../src/core/calculators/interpolate';
import type { Garden } from '../src/core/types/Garden';
import type { Subcell } from '../src/core/types/Subcell';

console.log('='.repeat(80));
console.log('MANUAL YIELD CALCULATION VERIFICATION');
console.log('='.repeat(80));

// Test 1: Single corn plant, optimal conditions
console.log('\n\n📊 Test 1: Single Corn Plant - Optimal Conditions');
console.log('-'.repeat(80));

const corn = CORN_WAPSIE_VALLEY;
console.log(`Species: ${corn.name}`);
console.log(`Baseline yield: ${corn.baseline_lbs_per_plant} lbs/plant`);
console.log(`Success rate: ${corn.success_rate}`);
console.log(`Recommended density: ${corn.plants_per_sq_ft} plants/sq ft`);

// Create a garden with 1 subcell
const subcell: Subcell = {
  id: 'sub_0',
  position: { x_in: 0, y_in: 0 },
  computed: {
    cell_x_ft: 0,
    cell_y_ft: 0,
    zone_x: 0,
    zone_y: 0,
  },
  conditions: {
    sun_hours: 8,  // Full sun
    soil: {
      N_ppm: 100,  // High nitrogen (corn is heavy feeder)
      P_ppm: 30,   // Adequate phosphorus
      K_ppm: 150,  // Adequate potassium
      pH: 6.5,     // Optimal pH
      compaction: 50, // Low compaction (psi)
    },
    type: 'planting',
  },
  plant: {
    species_id: 'corn_wapsie_valley',
    planted_week: 12,
    expected_harvest_week: 24,
  },
};

const garden: Garden = {
  id: 'test',
  name: 'Single Plant Test',
  dimensions_ft: { length: 1, width: 1 },
  subcells: [subcell],
};

const speciesMap = new Map([
  ['corn_wapsie_valley', corn],
  ['potato_russet', POTATO_RUSSET],
]);

console.log('\n🌱 Manual Calculation:');

// Subcell area
const subcell_area_sqft = (3 / 12) * (3 / 12); // 3 inches = 0.25 ft
console.log(`  Subcell area: ${subcell_area_sqft} sq ft (3 inch × 3 inch)`);

// Plants in this subcell
const plants_in_subcell = corn.plants_per_sq_ft * subcell_area_sqft;
console.log(`  Plants in subcell: ${corn.plants_per_sq_ft} × ${subcell_area_sqft} = ${plants_in_subcell.toFixed(4)}`);

// Sun modifier
const sun_mod = interpolate(subcell.conditions.sun_hours, corn.modifiers.sun);
console.log(`  Sun modifier (${subcell.conditions.sun_hours} hours): ${sun_mod.toFixed(3)}`);

// Soil modifiers
const n_mod = interpolate(subcell.conditions.soil.N_ppm, corn.modifiers.soil.N_ppm);
console.log(`  Nitrogen modifier (${subcell.conditions.soil.N_ppm} ppm): ${n_mod.toFixed(3)}`);

const p_mod = interpolate(subcell.conditions.soil.P_ppm, corn.modifiers.soil.P_ppm);
console.log(`  Phosphorus modifier (${subcell.conditions.soil.P_ppm} ppm): ${p_mod.toFixed(3)}`);

const k_mod = interpolate(subcell.conditions.soil.K_ppm, corn.modifiers.soil.K_ppm);
console.log(`  Potassium modifier (${subcell.conditions.soil.K_ppm} ppm): ${k_mod.toFixed(3)}`);

const ph_mod = interpolate(subcell.conditions.soil.pH, corn.modifiers.soil.pH);
console.log(`  pH modifier (${subcell.conditions.soil.pH}): ${ph_mod.toFixed(3)}`);

const comp_mod = interpolate(subcell.conditions.soil.compaction, corn.modifiers.soil.compaction_psi);
console.log(`  Compaction modifier (${subcell.conditions.soil.compaction} psi): ${comp_mod.toFixed(3)}`);

// Spacing modifier
const spacing_mod = interpolate(corn.plants_per_sq_ft, corn.modifiers.spacing_plants_per_sq_ft);
console.log(`  Spacing modifier (${corn.plants_per_sq_ft} plants/sqft): ${spacing_mod.toFixed(3)}`);

// Total modifier
const total_mod = sun_mod * n_mod * p_mod * k_mod * ph_mod * comp_mod * spacing_mod * corn.success_rate;
console.log(`\n  Total modifier:`);
console.log(`    = ${sun_mod.toFixed(3)} × ${n_mod.toFixed(3)} × ${p_mod.toFixed(3)} × ${k_mod.toFixed(3)} × ${ph_mod.toFixed(3)} × ${comp_mod.toFixed(3)} × ${spacing_mod.toFixed(3)} × ${corn.success_rate}`);
console.log(`    = ${total_mod.toFixed(4)}`);

// Expected yield
const expected_yield = plants_in_subcell * corn.baseline_lbs_per_plant * total_mod;
console.log(`\n  Expected yield:`);
console.log(`    = plants × baseline × modifier`);
console.log(`    = ${plants_in_subcell.toFixed(4)} × ${corn.baseline_lbs_per_plant} × ${total_mod.toFixed(4)}`);
console.log(`    = ${expected_yield.toFixed(6)} lbs`);

console.log('\n🖥️  Running YieldCalculator...');
const calculator = new YieldCalculator(garden, speciesMap);
const yields = calculator.calculateYields();

const actual_yield = yields[0]?.yield_lbs || 0;
console.log(`  Actual yield: ${actual_yield.toFixed(6)} lbs`);

const diff = Math.abs(expected_yield - actual_yield);
const match = diff < 0.000001; // Allow for floating point error

console.log(`\n✅ Verification:`);
console.log(`  Expected: ${expected_yield.toFixed(6)} lbs`);
console.log(`  Actual:   ${actual_yield.toFixed(6)} lbs`);
console.log(`  Diff:     ${diff.toFixed(9)} lbs`);
console.log(`  Match:    ${match ? '✅ PASS' : '❌ FAIL'}`);

// Test 2: Larger garden with multiple plants
console.log('\n\n📊 Test 2: 100 Corn Plants (Simple Grid)');
console.log('-'.repeat(80));

const subcells100: Subcell[] = [];
for (let i = 0; i < 100; i++) {
  subcells100.push({
    id: `sub_${i}`,
    position: { x_in: (i % 10) * 3, y_in: Math.floor(i / 10) * 3 },
    computed: {
      cell_x_ft: Math.floor((i % 10) * 0.25),
      cell_y_ft: Math.floor(Math.floor(i / 10) * 0.25),
      zone_x: 0,
      zone_y: 0,
    },
    conditions: {
      sun_hours: 8,
      soil: {
        N_ppm: 100,
        P_ppm: 30,
        K_ppm: 150,
        pH: 6.5,
        compaction: 50,
      },
      type: 'planting',
    },
    plant: {
      species_id: 'corn_wapsie_valley',
      planted_week: 12,
      expected_harvest_week: 24,
    },
  });
}

const garden100: Garden = {
  id: 'test-100',
  name: '100 Plant Test',
  dimensions_ft: { length: 10, width: 10 },
  subcells: subcells100,
};

const calculator100 = new YieldCalculator(garden100, speciesMap);
const yields100 = calculator100.calculateYields();
const total_yield = yields100[0]?.yield_lbs || 0;

console.log(`  Total subcells: 100`);
console.log(`  Expected yield: ${(expected_yield * 100).toFixed(4)} lbs (100 × single plant)`);
console.log(`  Actual yield:   ${total_yield.toFixed(4)} lbs`);
console.log(`  Match:          ${Math.abs(expected_yield * 100 - total_yield) < 0.0001 ? '✅ PASS' : '❌ FAIL'}`);

// Test 3: Agronomic sanity check
console.log('\n\n📊 Test 3: Agronomic Sanity Check');
console.log('-'.repeat(80));

console.log('\nExpected yields per plant (baseline × modifiers):');
console.log(`  Corn: ${corn.baseline_lbs_per_plant} lbs/plant × ${total_mod.toFixed(3)} = ${(corn.baseline_lbs_per_plant * total_mod).toFixed(3)} lbs/plant`);
console.log(`  Corn per sq ft: ${(corn.baseline_lbs_per_plant * total_mod * corn.plants_per_sq_ft).toFixed(2)} lbs/sq ft`);

console.log('\nReal-world comparison:');
console.log('  Field corn: 3-8 lbs/sq ft (commercial, full density)');
console.log('  Sweet corn: 1-3 lbs/sq ft (garden, lower density)');
console.log('  Our calculation: ${(corn.baseline_lbs_per_plant * total_mod * corn.plants_per_sq_ft).toFixed(2)} lbs/sq ft');

const reasonable = (corn.baseline_lbs_per_plant * total_mod * corn.plants_per_sq_ft) >= 0.5 &&
                   (corn.baseline_lbs_per_plant * total_mod * corn.plants_per_sq_ft) <= 10;
console.log(`  Reasonable? ${reasonable ? '✅ YES' : '❌ NO - outside expected range'}`);

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Test 1 (Single plant): ${match ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 2 (100 plants):   ${Math.abs(expected_yield * 100 - total_yield) < 0.0001 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test 3 (Sanity check): ${reasonable ? '✅ PASS' : '❌ FAIL'}`);
console.log('='.repeat(80));
