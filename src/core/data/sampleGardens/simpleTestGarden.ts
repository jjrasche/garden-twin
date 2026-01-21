/**
 * Simple Test Garden - Minimal debug garden with 1 plant
 */

import { Garden } from '../../types/Garden';
import { Subcell, createSubcellId, computeSubcellAggregation } from '../../types/Subcell';
import { Plan } from '../../types/Projection';
import { CORN_WAPSIE_VALLEY } from '../plantSpecies';

/**
 * Create a minimal 10×10 ft garden with 1 corn plant in the center
 */
export function createSimpleTestGarden(): { garden: Garden; plan: Plan } {
  const width_ft = 10;
  const length_ft = 10;
  const subcell_size_in = 3;

  const subcells: Subcell[] = [];

  // Create all subcells (10×10 ft = 120×120 inches = 40×40 subcells = 1,600 total)
  for (let y_in = 0; y_in < length_ft * 12; y_in += subcell_size_in) {
    for (let x_in = 0; x_in < width_ft * 12; x_in += subcell_size_in) {
      const x_ft = Math.floor(x_in / 12);
      const y_ft = Math.floor(y_in / 12);

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
            compaction_psi: 100,
            organic_matter_pct: 3.5,
          },
          type: 'planting',
        },
      });
    }
  }

  // Find the center subcell (5 ft × 5 ft = 60 inches × 60 inches)
  const center_x_in = 60;
  const center_y_in = 60;
  const centerSubcell = subcells.find(
    (s) => s.position.x_in === center_x_in && s.position.y_in === center_y_in
  );

  if (centerSubcell) {
    centerSubcell.plant = {
      individual_id: 'plant_1',
      species_id: CORN_WAPSIE_VALLEY.id,
      planted_date: '2025-05-15',
      expected_yield_lbs: CORN_WAPSIE_VALLEY.baseline_lbs_per_plant,
    };
  }

  const now = new Date().toISOString();

  const garden: Garden = {
    id: 'simple_test_garden',
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
    created_at: now,
    updated_at: now,
  };

  // Create plan with just the one plant
  const plan: Plan = {
    id: 'simple_test_plan',
    garden_id: garden.id,
    created_at: now,
    plantings: [
      {
        subcell_id: createSubcellId(center_x_in, center_y_in),
        species_id: CORN_WAPSIE_VALLEY.id,
        planting_date: '2025-05-15',
      },
    ],
  };

  return { garden, plan };
}

/**
 * Export simple test garden instance
 */
export const simpleTestGarden = createSimpleTestGarden();
