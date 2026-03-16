import { PlantSpecies } from '../../src/core/types';

/**
 * Dent Corn (generic field/dent corn)
 *
 * Tall field corn grown for dried grain, animal feed, or flour.
 * 8 ft stalks produce 1-2 large ears, 110 days to maturity.
 * Good structural support for pole beans in Three Sisters planting.
 */
export const CORN_DENT: PlantSpecies = {
  id: 'corn_dent',
  name: 'Corn (Dent)',

  // Space: 0.67 plants per sq ft (12" in-row × 18" between-row)
  plants_per_sq_ft: 0.67,
  height_ft: 8,

  // Timing: 110 days to maturity, 14-day harvest window
  days_to_first_harvest: 110,
  days_harvest_window: 14,

  // Yield: ~0.5 lbs dried grain per plant (2 ears × 0.25 lbs), 90% success rate
  baseline_lbs_per_plant: 0.5,
  germination_rate: 0.95,
  establishment_rate: 0.95,

  modifiers: {
    // Sun hours
    sun: {
      4: 0.3,
      6: 0.7,
      8: 1.0,
      10: 1.0,
    },

    soil: {
      // Nitrogen (corn is a heavy feeder)
      N_ppm: {
        20: 0.6,
        50: 1.0,
        100: 1.3,
        150: 1.3,
      },

      P_ppm: {
        10: 0.7,
        30: 1.0,
        60: 1.2,
      },

      K_ppm: {
        50: 0.7,
        120: 1.0,
        200: 1.1,
      },

      // pH (corn prefers 6.0-7.0)
      pH: {
        5.5: 0.7,
        6.5: 1.0,
        7.5: 0.9,
        8.0: 0.7,
      },

      compaction_psi: {
        0: 1.0,
        200: 0.9,
        400: 0.7,
      },
    },

    spacing_plants_per_sq_ft: {
      0.3: 1.2,
      0.67: 1.0,
      1.0: 0.8,
      2.0: 0.4,
    },
  },

  // Nutrition (per lb of dried dent corn)
  // Source: USDA FoodData Central - Corn grain, yellow
  nutrition_per_lb: {
    calories: 1650,
    protein_g: 43,
    carbs_g: 340,
    fat_g: 21,
    fiber_g: 33,
    vitamin_a_mcg: 10,
    vitamin_c_mg: 0,
    vitamin_k_mcg: 1.4,
    calcium_mg: 31,
    iron_mg: 12,
    potassium_mg: 1270,
  },

  icon: {
    emoji: '🌽',
    color: '#D4A017',
  },

  tasks: [
    { name: 'planting', timing_days: [0], hours_per_plant: 0.01 },
    {
      name: 'watering',
      timing_days: Array.from({ length: 15 }, (_, i) => 7 + i * 7),
      hours_per_plant: 0.02,
    },
    {
      name: 'weeding',
      timing_days: [14, 21, 28, 35, 42],
      hours_per_sq_ft: 0.05,
    },
    {
      name: 'harvest',
      timing_days: [110, 117, 124],
      hours_per_plant: 0.03,
      processing_hours_per_lb: 2.0, // Shelling dried corn
    },
  ],

  seed_cost_per_plant: 0.10,

  data_confidence: 'medium',
  sources: [
    {
      claim: 'days to maturity, yield',
      citation: 'Iowa State University Extension - Field Corn Production',
      url: 'https://crops.extension.iastate.edu/',
    },
    {
      claim: 'spacing, height',
      citation: 'Purdue University Extension - Corn Production',
      url: 'https://extension.purdue.edu/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Corn grain, yellow',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
