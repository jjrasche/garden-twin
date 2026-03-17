/**
 * Test Garden Configuration
 *
 * Purpose: UI testing with real plant data
 * Uses 6 researched varieties with realistic placement and timing
 *
 * Garden layout: 40×100 ft (4,000 sq ft)
 * Total plants: 150
 * Sun zones: Mixed (full sun 8+ hours, partial 6 hours)
 * Planting dates: Staggered May 10 - May 30, 2025
 *
 * To load in UI: Import testGarden, click 'Load Sample'
 */

import { Garden, calculateTotalSubcells } from '../../types/Garden';
import { Subcell, createSubcellId, computeSubcellAggregation } from '../../types/Subcell';
import { Plan } from '../../types/Projection';
// Import researched varieties
import { CORN_GOLDEN_BANTAM } from '../../../../research/golden-bantam-corn/config';
import { CORN_STOWELLS_EVERGREEN } from '../../../../research/stowells-evergreen-corn/config';
import { POTATO_RUSSET_BURBANK } from '../../../../research/russet-burbank-potato/config';
import { POTATO_RED_NORLAND } from '../../../../research/red-norland-potato/config';
import { POTATO_YUKON_GOLD } from '../../../../research/yukon-gold-potato/config';

// Import existing variety from codebase
import { CORN_WAPSIE_VALLEY } from '../plantSpecies';

/**
 * Garden zones with different sun exposure
 */
const ZONES = {
  FULL_SUN_NW: { sun_hours: 8, x_start: 0, x_end: 20, y_start: 50, y_end: 100 },    // Northwest - corn
  FULL_SUN_NE: { sun_hours: 8, x_start: 20, x_end: 40, y_start: 50, y_end: 100 },   // Northeast - corn
  PARTIAL_SW: { sun_hours: 6, x_start: 0, x_end: 20, y_start: 0, y_end: 50 },       // Southwest - potatoes
  PARTIAL_SE: { sun_hours: 6, x_start: 20, x_end: 40, y_start: 0, y_end: 50 },      // Southeast - potatoes
};

/**
 * Standard soil conditions (moderate fertility)
 */
const DEFAULT_SOIL = {
  N_ppm: 50,
  P_ppm: 30,
  K_ppm: 120,
  pH: 6.5,
  compaction_psi: 100,
  organic_matter_pct: 3.5,
};

/**
 * Plant placements with species, quantity, zone, and planting date
 */
const PLANTINGS = [
  // Early varieties (May 10)
  { species: POTATO_RED_NORLAND, count: 25, zone: 'PARTIAL_SW', date: '2025-05-10' },

  // Golden Bantam corn (May 15)
  { species: CORN_GOLDEN_BANTAM, count: 30, zone: 'FULL_SUN_NW', date: '2025-05-15' },

  // Mid-early potato (May 20)
  { species: POTATO_YUKON_GOLD, count: 20, zone: 'PARTIAL_SE', date: '2025-05-20' },

  // Stowell's Evergreen corn (May 25)
  { species: CORN_STOWELLS_EVERGREEN, count: 30, zone: 'FULL_SUN_NE', date: '2025-05-25' },

  // Late varieties (May 30)
  { species: CORN_WAPSIE_VALLEY, count: 20, zone: 'FULL_SUN_NW', date: '2025-05-30' },
  { species: POTATO_RUSSET_BURBANK, count: 25, zone: 'PARTIAL_SW', date: '2025-05-30' },
];

/**
 * Create an empty subcell
 */
function createEmptySubcell(x_in: number, y_in: number, sun_hours: number): Subcell {
  return {
    id: createSubcellId(x_in, y_in),
    position: { x_in, y_in },
    computed: computeSubcellAggregation(x_in, y_in),
    conditions: {
      sun_hours,
      soil: DEFAULT_SOIL,
      type: 'planting',
    },
  };
}

/**
 * Get sun hours for a given position
 */
function getSunHoursForPosition(x_ft: number, y_ft: number): number {
  // Check which zone this position falls into
  for (const zone of Object.values(ZONES)) {
    if (
      x_ft >= zone.x_start &&
      x_ft < zone.x_end &&
      y_ft >= zone.y_start &&
      y_ft < zone.y_end
    ) {
      return zone.sun_hours;
    }
  }
  return 6; // Default
}

/**
 * Generate all subcells for the garden
 */
function generateSubcells(): Subcell[] {
  const subcells: Subcell[] = [];
  const width_in = 40 * 12; // 480 inches
  const length_in = 100 * 12; // 1,200 inches
  const subcell_size = 3; // 3 inches

  // Generate subcells in 3-inch increments
  for (let y_in = 0; y_in < length_in; y_in += subcell_size) {
    for (let x_in = 0; x_in < width_in; x_in += subcell_size) {
      const x_ft = Math.floor(x_in / 12);
      const y_ft = Math.floor(y_in / 12);
      const sun_hours = getSunHoursForPosition(x_ft, y_ft);

      subcells.push(createEmptySubcell(x_in, y_in, sun_hours));
    }
  }

  return subcells;
}

/**
 * Place plants in specific zones
 */
function placePlantsInSubcells(subcells: Subcell[]): void {
  let plantCounter = 0;

  for (const planting of PLANTINGS) {
    const zone = ZONES[planting.zone as keyof typeof ZONES];
    const spacingInches = Math.sqrt(144 / planting.species.plants_per_sq_ft); // Convert plants/sq ft to spacing in inches

    let placed = 0;
    const rows = Math.floor((zone.x_end - zone.x_start) * 12 / spacingInches);
    const cols = Math.floor((zone.y_end - zone.y_start) * 12 / spacingInches);

    for (let row = 0; row < rows && placed < planting.count; row++) {
      for (let col = 0; col < cols && placed < planting.count; col++) {
        const x_in = Math.floor(zone.x_start * 12 + row * spacingInches);
        const y_in = Math.floor(zone.y_start * 12 + col * spacingInches);

        // Find the subcell at this position (round to nearest 3-inch grid)
        const subcell_x = Math.floor(x_in / 3) * 3;
        const subcell_y = Math.floor(y_in / 3) * 3;
        const subcellId = createSubcellId(subcell_x, subcell_y);

        const subcell = subcells.find(s => s.id === subcellId);
        if (subcell && !subcell.plant) {
          plantCounter++;
          subcell.plant = {
            individual_id: `plant_${plantCounter}`,
            species_id: planting.species.id,
            planted_date: planting.date,
            expected_yield_lbs: 0,
          };
          placed++;
        }
      }
    }
  }
}

/**
 * Create the complete test garden
 */
export function createTestGarden(): Garden {
  const grid = {
    width_ft: 40,
    length_ft: 100,
    subcell_size_in: 3,
    total_subcells: calculateTotalSubcells(40, 100, 3),
  };

  const subcells = generateSubcells();
  placePlantsInSubcells(subcells);

  const now = new Date().toISOString();

  return {
    id: 'test_garden_001',
    location: {
      lat: 42.3601,
      lon: -71.0589,
      city: 'Boston',
      state: 'MA',
      country: 'USA',
      timezone: 'America/New_York',
    },
    grid,
    subcells,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Export the test garden instance
 */
export const testGarden = createTestGarden();

/**
 * Create a plan from the test garden's embedded plant data
 */
export function createTestPlan(): { garden: Garden; plan: Plan } {
  const garden = testGarden;

  const plantings = garden.subcells
    .filter(subcell => subcell.plant !== undefined)
    .map(subcell => ({
      subcell_id: subcell.id,
      species_id: subcell.plant!.species_id,
      planting_date: subcell.plant!.planted_date,
    }));

  const plan: Plan = {
    id: 'test_plan_001',
    garden_id: garden.id,
    created_at: garden.created_at,
    plantings,
  };

  return { garden, plan };
}

/**
 * Instructions for loading in UI:
 *
 * 1. Import this file in your UI component:
 *    import { testGarden } from '@/core/data/sampleGardens/testGarden';
 *
 * 2. Load it into your garden state:
 *    setGarden(testGarden);
 *
 * 3. UI should display:
 *    - 150 plants across 4 zones
 *    - Mix of corn (🌽) and potatoes (🥔)
 *    - Staggered planting dates (May 10-30)
 *    - Labor timeline with visible peaks
 *    - Harvest timeline with sequential harvests
 *
 * Expected results:
 * - First harvest: Red Norland potatoes ~July 30 (80 days from May 10)
 * - Last harvest: Russet Burbank potatoes ~Sep 17 (110 days from May 30)
 * - Labor peaks: Planting (May 10-30), Hilling (June), Harvest (July-Sept)
 * - Zoom levels: Should see individual plants at cell level, aggregated at zone level
 */
