import { PlantSpecies } from '../../src/core/types';

/**
 * Winter Squash (generic, e.g., Butternut / Hubbard)
 *
 * Large vining squash with 5+ ft spread per plant.
 * Produces 3 large fruits (10-20 lbs each), 100 days to maturity.
 * Ground cover suppresses weeds in Three Sisters planting.
 */
export const SQUASH_WINTER: PlantSpecies = {
  id: 'squash_winter',
  name: 'Squash (Winter)',

  // Space: 0.04 plants per sq ft (1 plant per 25 sq ft — 5 ft spread)
  plants_per_sq_ft: 0.04,
  height_ft: 1.5, // Low-growing vine

  // Timing: 100 days to maturity, 21-day harvest window
  days_to_first_harvest: 100,
  days_harvest_window: 21,

  // Yield: 3 fruits × 15 lbs = 45 lbs per plant, 80% success rate
  baseline_lbs_per_plant: 45,
  success_rate: 0.8,

  modifiers: {
    // Sun hours
    sun: {
      4: 0.3,
      6: 0.6,
      8: 1.0,
      10: 1.0,
    },

    soil: {
      // Nitrogen (heavy feeder)
      N_ppm: {
        20: 0.5,
        50: 1.0,
        100: 1.3,
        150: 1.2,
      },

      P_ppm: {
        10: 0.6,
        30: 1.0,
        60: 1.2,
      },

      K_ppm: {
        50: 0.6,
        120: 1.0,
        200: 1.2,
      },

      // pH (squash prefers 6.0-6.8)
      pH: {
        5.5: 0.6,
        6.0: 0.9,
        6.5: 1.0,
        7.0: 0.9,
        7.5: 0.7,
      },

      compaction_psi: {
        0: 1.0,
        200: 0.8,
        400: 0.5,
      },
    },

    spacing_plants_per_sq_ft: {
      0.02: 1.1,   // Very wide (larger fruits)
      0.04: 1.0,   // Optimal
      0.08: 0.7,   // Crowded (smaller, fewer fruits)
      0.16: 0.3,   // Severe crowding
    },
  },

  // Nutrition (per lb of winter squash, raw)
  // Source: USDA FoodData Central - Squash, winter, butternut, raw
  nutrition_per_lb: {
    calories: 204,
    protein_g: 4.5,
    carbs_g: 54,
    fat_g: 0.5,
    fiber_g: 9.1,
    vitamin_a_mcg: 4680,
    vitamin_c_mg: 95,
    vitamin_k_mcg: 5,
    calcium_mg: 218,
    iron_mg: 3.2,
    potassium_mg: 1600,
  },

  icon: {
    emoji: '🎃',
    color: '#F59E0B',
  },

  tasks: [
    { name: 'planting', timing_days: [0], hours_per_plant: 0.02 },
    {
      name: 'watering',
      timing_days: Array.from({ length: 14 }, (_, i) => 7 + i * 7),
      hours_per_plant: 0.05,
    },
    {
      name: 'weeding',
      timing_days: [14, 21, 28, 35],
      hours_per_sq_ft: 0.05,
    },
    {
      name: 'harvest',
      timing_days: [100, 107, 114, 121],
      hours_per_plant: 0.1,
      processing_hours_per_lb: 0.3,
    },
  ],

  seed_cost_per_plant: 0.15,

  data_confidence: 'medium',
  sources: [
    {
      claim: 'days to maturity, yield, spacing',
      citation: 'University of Wisconsin Extension - Growing Winter Squash',
      url: 'https://hort.extension.wisc.edu/',
    },
    {
      claim: 'fruit size, growth habit',
      citation: 'Cornell University Extension - Winter Squash',
      url: 'https://gardening.cornell.edu/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Squash, winter, butternut, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
