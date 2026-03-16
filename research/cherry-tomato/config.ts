import { PlantSpecies } from '../../src/core/types';

/**
 * Cherry Tomato (generic indeterminate)
 *
 * Indeterminate cherry tomato producing ~200 fruits per plant.
 * Grows to trellis height (6 ft), 65 days to first fruit.
 * Continuous harvest over 90-day window.
 */
export const TOMATO_CHERRY: PlantSpecies = {
  id: 'tomato_cherry',
  name: 'Tomato (Cherry)',

  // Space: 1 plant per 3 sq ft (24" in-row, 18" between-row on trellis)
  plants_per_sq_ft: 0.33,
  height_ft: 6, // Indeterminate, grows to trellis

  // Timing: 65 days to first ripe fruit, 90-day production window
  days_to_first_harvest: 65,
  days_harvest_window: 90,

  // Yield: ~200 fruits × 0.5 oz = 6.25 lbs per plant, 85% success rate
  baseline_lbs_per_plant: 6.25,
  germination_rate: 1.00,
  establishment_rate: 0.85,

  modifiers: {
    // Sun hours
    sun: {
      4: 0.2,
      6: 0.6,
      8: 1.0,
      10: 1.0,
    },

    soil: {
      // Nitrogen (moderate — too much = foliage, not fruit)
      N_ppm: {
        20: 0.7,
        50: 1.0,
        80: 1.2,
        120: 0.9,
      },

      P_ppm: {
        10: 0.6,
        30: 1.0,
        60: 1.3,
      },

      K_ppm: {
        50: 0.6,
        120: 1.0,
        200: 1.2,
      },

      // pH (tomatoes prefer 6.0-6.8)
      pH: {
        5.5: 0.6,
        6.2: 1.0,
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
      0.15: 1.1,
      0.33: 1.0,
      0.5: 0.7,
      1.0: 0.3,
    },
  },

  // Nutrition (per lb of cherry tomatoes)
  // Source: USDA FoodData Central - Tomatoes, red, ripe, raw
  nutrition_per_lb: {
    calories: 82,
    protein_g: 4,
    carbs_g: 18,
    fat_g: 0.9,
    fiber_g: 5.4,
    vitamin_a_mcg: 383,
    vitamin_c_mg: 62,
    vitamin_k_mcg: 36,
    calcium_mg: 45,
    iron_mg: 1.2,
    potassium_mg: 1080,
  },

  icon: {
    emoji: '🍅',
    color: '#EF4444',
  },

  tasks: [
    { name: 'planting', timing_days: [0], hours_per_plant: 0.05 },
    { name: 'staking', timing_days: [14], hours_per_plant: 0.1 },
    {
      name: 'watering',
      timing_days: Array.from({ length: 22 }, (_, i) => 7 + i * 7),
      hours_per_plant: 0.03,
    },
    {
      name: 'pruning',
      timing_days: [28, 42, 56, 70, 84, 98, 112],
      hours_per_plant: 0.05,
    },
    {
      name: 'harvest',
      timing_days: Array.from({ length: 30 }, (_, i) => 65 + i * 3),
      hours_per_plant: 0.03,
      processing_hours_per_lb: 0.2,
    },
  ],

  seed_cost_per_plant: 0.20,
  materials_cost_per_plant: 0.50,

  data_confidence: 'medium',
  sources: [
    {
      claim: 'fruit count, yield',
      citation: 'University of Florida Extension - Cherry Tomato Production',
      url: 'https://edis.ifas.ufl.edu/',
    },
    {
      claim: 'days to maturity, spacing',
      citation: "Johnny's Selected Seeds - Cherry Tomato Growing Guide",
      url: 'https://www.johnnyseeds.com/growers-library/vegetables/tomatoes/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Tomatoes, red, ripe, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
