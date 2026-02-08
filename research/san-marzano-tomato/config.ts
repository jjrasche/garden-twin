import { PlantSpecies } from '../../src/core/types';

/**
 * San Marzano Paste Tomato
 *
 * Classic Italian paste tomato, semi-determinate growth habit.
 * Produces 60-80 elongated fruits (~4 oz each) per plant.
 * 80 days to first harvest, excellent for sauces and canning.
 */
export const TOMATO_SAN_MARZANO: PlantSpecies = {
  id: 'tomato_san_marzano',
  name: 'Tomato (San Marzano)',

  // Space: 1 plant per 3 sq ft (24" spacing on trellis)
  plants_per_sq_ft: 0.33,
  height_ft: 5, // Semi-determinate

  // Timing: 80 days to first ripe fruit, 45-day concentrated production
  days_to_first_harvest: 80,
  days_harvest_window: 45,

  // Yield: ~80 fruits × 4 oz = 20 lbs per plant, 80% success rate
  baseline_lbs_per_plant: 20,
  success_rate: 0.8,

  modifiers: {
    sun: {
      4: 0.2,
      6: 0.5,
      8: 1.0,
      10: 1.0,
    },

    soil: {
      N_ppm: {
        20: 0.7,
        50: 1.0,
        80: 1.2,
        120: 0.8,  // Excess nitrogen especially hurts paste tomatoes
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

  // Nutrition (per lb of paste tomatoes)
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
    color: '#DC2626',
  },

  tasks: [
    { name: 'planting', timing_days: [0], hours_per_plant: 0.05 },
    { name: 'staking', timing_days: [14], hours_per_plant: 0.1 },
    {
      name: 'watering',
      timing_days: Array.from({ length: 18 }, (_, i) => 7 + i * 7),
      hours_per_plant: 0.03,
    },
    {
      name: 'pruning',
      timing_days: [28, 42, 56, 70],
      hours_per_plant: 0.05,
    },
    {
      name: 'harvest',
      timing_days: Array.from({ length: 15 }, (_, i) => 80 + i * 3),
      hours_per_plant: 0.04,
      processing_hours_per_lb: 1.0, // Sauce/canning processing
    },
  ],

  seed_cost_per_plant: 0.30,
  materials_cost_per_plant: 0.50,

  data_confidence: 'medium',
  sources: [
    {
      claim: 'days to maturity, fruit size, yield',
      citation: 'University of Illinois Extension - Paste Tomato Varieties',
      url: 'https://extension.illinois.edu/',
    },
    {
      claim: 'spacing, growth habit',
      citation: "Johnny's Selected Seeds - San Marzano product page",
      url: 'https://www.johnnyseeds.com/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Tomatoes, red, ripe, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
