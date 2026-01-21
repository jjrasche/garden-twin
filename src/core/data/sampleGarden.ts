/**
 * Sample garden data for testing and demonstration
 */

import { Garden, Plan, createSubcellId, computeSubcellAggregation } from '../types';
import { CORN_WAPSIE_VALLEY, TOMATO_BETTER_BOY, POTATO_RUSSET } from './plantSpecies';

/**
 * Create a sample 1000 sq ft garden (40×25 ft) with corn, tomatoes, and potatoes
 */
export function createSampleGarden(): { garden: Garden; plan: Plan } {
  const width_ft = 40;
  const length_ft = 25;
  const subcell_size_in = 3;

  const subcells = [];

  // Create all subcells (40×25 ft = 160×100 subcells = 16,000 total)
  for (let x_in = 0; x_in < width_ft * 12; x_in += subcell_size_in) {
    for (let y_in = 0; y_in < length_ft * 12; y_in += subcell_size_in) {
      subcells.push({
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
          type: 'planting' as const,
        },
      });
    }
  }

  const garden: Garden = {
    id: 'sample-garden-1',
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

  // Create planting plan
  const plantings = [];

  // Plant corn in left third (0-13 ft wide, full length)
  // Corn: 1 plant per 1.5 sq ft, so ~18" spacing
  for (let x_in = 12; x_in < 13 * 12; x_in += 18) {
    for (let y_in = 12; y_in < length_ft * 12 - 12; y_in += 18) {
      plantings.push({
        subcell_id: createSubcellId(x_in, y_in),
        species_id: CORN_WAPSIE_VALLEY.id,
        planting_date: '2025-05-01',
      });
    }
  }

  // Plant tomatoes in middle third (13-26 ft wide)
  // Tomatoes: 1 plant per 4 sq ft, so 24" spacing
  for (let x_in = 13 * 12 + 12; x_in < 26 * 12; x_in += 24) {
    for (let y_in = 12; y_in < length_ft * 12 - 12; y_in += 24) {
      plantings.push({
        subcell_id: createSubcellId(x_in, y_in),
        species_id: TOMATO_BETTER_BOY.id,
        planting_date: '2025-05-15',
      });
    }
  }

  // Plant potatoes in right third (26-40 ft wide)
  // Potatoes: 1 plant per 1 sq ft, so 12" spacing
  for (let x_in = 26 * 12 + 12; x_in < width_ft * 12 - 12; x_in += 12) {
    for (let y_in = 12; y_in < length_ft * 12 - 12; y_in += 12) {
      plantings.push({
        subcell_id: createSubcellId(x_in, y_in),
        species_id: POTATO_RUSSET.id,
        planting_date: '2025-04-20',
      });
    }
  }

  const plan: Plan = {
    id: 'sample-plan-1',
    garden_id: garden.id,
    created_at: new Date().toISOString(),
    plantings,
  };

  return { garden, plan };
}

/**
 * Get sample garden description for UI
 */
export function getSampleGardenInfo() {
  return {
    name: 'Demo Garden (1000 sq ft)',
    description: '40×25 ft garden with corn, tomatoes, and potatoes',
    location: 'Boston, MA',
    crops: ['Corn (Wapsie Valley)', 'Tomato (Better Boy)', 'Potato (Russet)'],
  };
}
