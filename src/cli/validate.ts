#!/usr/bin/env node

/**
 * CLI Validation Tool
 *
 * Creates a sample garden, runs all calculations, and validates results.
 * Exit code 0 = success, 1 = errors detected
 */

import {
  Garden,
  Subcell,
  Plan,
  createSubcellId,
  computeSubcellAggregation,
  YieldCalculator,
  LaborCalculator,
  getCellData,
  getZoneData,
  CORN_WAPSIE_VALLEY,
  TOMATO_BETTER_BOY,
  POTATO_RUSSET_BURBANK,
  PLANT_SPECIES_MAP,
} from '../core';

// Create a sample garden (40×100 ft = 64,000 subcells)
function createSampleGarden(): Garden {
  console.log('Creating sample garden (40×100 ft)...');

  const width_ft = 40;
  const length_ft = 100;
  const subcell_size_in = 3;

  const subcells: Subcell[] = [];

  // Create all subcells
  for (let x_in = 0; x_in < width_ft * 12; x_in += subcell_size_in) {
    for (let y_in = 0; y_in < length_ft * 12; y_in += subcell_size_in) {
      const subcell: Subcell = {
        id: createSubcellId(x_in, y_in),
        position: { x_in, y_in },
        computed: computeSubcellAggregation(x_in, y_in),
        conditions: {
          sun_hours: 8, // Full sun
          soil: {
            N_ppm: 50,
            P_ppm: 30,
            K_ppm: 120,
            pH: 6.5,
            compaction_psi: 0,
            organic_matter_pct: 5,
          },
          type: 'planting',
        },
      };

      subcells.push(subcell);
    }
  }

  console.log(`✓ Created ${subcells.length} subcells`);

  return {
    id: 'sample-garden',
    location: {
      lat: 42.3601,
      lon: -71.0589,
      city: 'Boston',
      state: 'MA',
      country: 'USA',
      timezone: 'America/New_York',
    },
    grid: {
      width_ft,
      length_ft,
      subcell_size_in,
      total_subcells: subcells.length,
    },
    subcells,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Create a sample planting plan
function createSamplePlan(): Plan {
  console.log('\\nCreating sample planting plan...');

  const plantings = [];

  // Plant corn in a 10×10 ft area (zone 0,0)
  // Corn: 0.67 plants/sq ft, so ~67 plants in 100 sq ft
  let cornCount = 0;
  for (let x_in = 0; x_in < 120; x_in += 18) {
    // ~6.7 plants per 10 ft
    for (let y_in = 0; y_in < 120; y_in += 18) {
      plantings.push({
        subcell_id: createSubcellId(x_in, y_in),
        species_id: CORN_WAPSIE_VALLEY.id,
        planting_date: '2025-05-01',
      });
      cornCount++;
    }
  }

  // Plant tomatoes in zone (1,0)
  // Tomato: 0.25 plants/sq ft, so ~25 plants in 100 sq ft
  let tomatoCount = 0;
  for (let x_in = 120; x_in < 240; x_in += 24) {
    // ~5 plants per 10 ft
    for (let y_in = 0; y_in < 120; y_in += 24) {
      plantings.push({
        subcell_id: createSubcellId(x_in, y_in),
        species_id: TOMATO_BETTER_BOY.id,
        planting_date: '2025-05-01',
      });
      tomatoCount++;
    }
  }

  // Plant potatoes in zone (0,1)
  // Potato: 1 plant/sq ft, so ~100 plants in 100 sq ft
  let potatoCount = 0;
  for (let x_in = 0; x_in < 120; x_in += 12) {
    for (let y_in = 120; y_in < 240; y_in += 12) {
      plantings.push({
        subcell_id: createSubcellId(x_in, y_in),
        species_id: POTATO_RUSSET_BURBANK.id,
        planting_date: '2025-05-01',
      });
      potatoCount++;
    }
  }

  console.log(`✓ Planted ${cornCount} corn, ${tomatoCount} tomatoes, ${potatoCount} potatoes`);

  return {
    id: 'sample-plan',
    garden_id: 'sample-garden',
    created_at: new Date().toISOString(),
    plantings,
  };
}

// Run calculations and validate
function runValidation() {
  console.log('\\n=== Garden Twin Phase 1 Validation ===\\n');

  const garden = createSampleGarden();
  const plan = createSamplePlan();

  // Test yield calculator
  console.log('\\nTesting YieldCalculator...');
  const yieldCalc = new YieldCalculator();

  let totalYield = 0;
  let totalCalories = 0;

  for (const planting of plan.plantings) {
    const subcell = garden.subcells.find(s => s.id === planting.subcell_id);
    if (!subcell) continue;

    const species = PLANT_SPECIES_MAP.get(planting.species_id);
    if (!species) continue;

    const yield_lbs = yieldCalc.calculate(
      species,
      subcell.conditions,
      species.plants_per_sq_ft
    );

    const nutrition = yieldCalc.calculateNutrition(species, yield_lbs);

    totalYield += yield_lbs;
    totalCalories += nutrition.calories;
  }

  console.log(`✓ Total yield: ${totalYield.toFixed(2)} lbs`);
  console.log(`✓ Total calories: ${totalCalories.toFixed(0)}`);

  // Test labor calculator
  console.log('\\nTesting LaborCalculator...');
  const laborCalc = new LaborCalculator();

  const schedule = laborCalc.calculateSchedule(plan, PLANT_SPECIES_MAP, 1.0);

  const totalLabor = schedule.reduce((sum, week) => sum + week.total_hours, 0);

  console.log(`✓ Labor schedule: ${schedule.length} weeks with tasks`);
  console.log(`✓ Total labor hours: ${totalLabor.toFixed(2)}`);

  // Test aggregators
  console.log('\\nTesting Aggregators...');

  const cell_0_0 = getCellData(garden.subcells, 0, 0);
  console.log(`✓ Cell (0,0): ${cell_0_0.total_subcells} subcells, ${Object.keys(cell_0_0.plant_counts).length} species`);

  const zone_0_0 = getZoneData(garden.subcells, 0, 0);
  console.log(`✓ Zone (0,0): ${zone_0_0.total_plants} plants, ${zone_0_0.plant_density.toFixed(2)} plants/sq ft`);

  // Validation checks
  console.log('\\n=== Validation Checks ===\\n');

  let errors = 0;

  if (garden.subcells.length !== 64000) {
    console.error(`✗ FAIL: Expected 64,000 subcells, got ${garden.subcells.length}`);
    errors++;
  } else {
    console.log(`✓ PASS: Garden has 64,000 subcells`);
  }

  if (totalYield <= 0) {
    console.error(`✗ FAIL: Total yield is ${totalYield}, expected > 0`);
    errors++;
  } else {
    console.log(`✓ PASS: Total yield is positive (${totalYield.toFixed(2)} lbs)`);
  }

  if (totalCalories <= 0) {
    console.error(`✗ FAIL: Total calories is ${totalCalories}, expected > 0`);
    errors++;
  } else {
    console.log(`✓ PASS: Total calories is positive (${totalCalories.toFixed(0)})`);
  }

  if (schedule.length === 0) {
    console.error(`✗ FAIL: Labor schedule is empty`);
    errors++;
  } else {
    console.log(`✓ PASS: Labor schedule generated (${schedule.length} weeks)`);
  }

  if (totalLabor <= 0) {
    console.error(`✗ FAIL: Total labor hours is ${totalLabor}, expected > 0`);
    errors++;
  } else {
    console.log(`✓ PASS: Total labor hours is positive (${totalLabor.toFixed(2)})`);
  }

  // Summary
  console.log('\\n=== Summary ===\\n');
  if (errors === 0) {
    console.log('✓ All validation checks passed!');
    console.log('\\nPhase 1 core engine is working correctly.');
    process.exit(0);
  } else {
    console.error(`✗ ${errors} validation check(s) failed.`);
    console.error('\\nPlease review errors above.');
    process.exit(1);
  }
}

// Run validation
runValidation();
