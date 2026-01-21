import { PlantSpecies } from '../../src/core/types';

/**
 * Golden Bantam Sweet Corn
 *
 * Classic heirloom sweet corn introduced by W. Atlee Burpee in 1902.
 * 5-6 ft stalks produce 1-2 ears of 6-7" golden-yellow corn.
 * 80 days to maturity.
 */
export const CORN_GOLDEN_BANTAM: PlantSpecies = {
  id: 'corn_golden_bantam',
  name: 'Corn (Golden Bantam)',

  // Space: 1 plant per 2.5 sq ft (12" in-row × 30" between rows)
  plants_per_sq_ft: 0.4,
  height_ft: 5.5,

  // Timing: 80 days to maturity, 10-day harvest window
  days_to_first_harvest: 80,
  days_harvest_window: 10,

  // Yield: ~0.3 lbs per plant (1.5 ears × 0.2 lbs/ear), 90% success rate
  baseline_lbs_per_plant: 0.3,
  success_rate: 0.9,

  // Modifiers (using standard CORN modifiers)
  modifiers: {
    // Sun hours → multiplier
    sun: {
      4: 0.3,    // Severe shade
      6: 0.7,    // Partial shade
      8: 1.0,    // Full sun (optimal)
      10: 1.0,   // Extended sun (no benefit beyond 8)
    },

    // Soil conditions
    soil: {
      // Nitrogen (corn is a heavy feeder)
      N_ppm: {
        20: 0.6,   // Deficient
        50: 1.0,   // Adequate
        100: 1.3,  // High
        150: 1.3,  // Excess (no additional benefit)
      },

      // Phosphorus
      P_ppm: {
        10: 0.7,
        30: 1.0,
        60: 1.2,
      },

      // Potassium
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

      // Compaction
      compaction_psi: {
        0: 1.0,     // Loose soil
        200: 0.9,   // Moderate
        400: 0.7,   // Compacted
      },
    },

    // Spacing (plants per sq ft)
    spacing_plants_per_sq_ft: {
      0.3: 1.2,   // Widely spaced (better ears)
      0.4: 1.0,   // Optimal spacing (Golden Bantam standard)
      0.67: 0.9,  // Tighter spacing
      1.0: 0.7,   // Crowded
      2.0: 0.4,   // Severe crowding
    },
  },

  // Nutrition (per lb of fresh sweet corn)
  // Source: USDA FoodData Central - Sweet Corn, yellow, raw
  nutrition_per_lb: {
    calories: 390,
    protein_g: 15,
    carbs_g: 85,
    fat_g: 6.4,
    fiber_g: 9.1,
    vitamin_a_mcg: 41,
    vitamin_c_mg: 31,
    vitamin_k_mcg: 1.4,
    calcium_mg: 9,
    iron_mg: 2.3,
    potassium_mg: 1226,
  },

  icon: {
    emoji: '🌽',
    color: '#F4E285',
  },

  // Labor tasks
  tasks: [
    { name: 'planting', timing_days: [0], hours_per_plant: 0.01 },
    {
      name: 'watering',
      timing_days: [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77],
      hours_per_plant: 0.02,
    },
    {
      name: 'weeding',
      timing_days: [14, 21, 28, 35, 42],
      hours_per_sq_ft: 0.05,
    },
    {
      name: 'harvest',
      timing_days: [80, 85, 90],
      hours_per_plant: 0.03,
      processing_hours_per_lb: 0.5, // Shucking fresh corn (less time than shelling dried corn)
    },
  ],

  seed_cost_per_plant: 0.03, // $3.35/oz ÷ 120 seeds/oz ≈ $0.028, rounded to $0.03
  materials_cost_per_plant: 0,

  data_confidence: 'high',
  sources: [
    {
      claim: 'days to maturity',
      citation: 'Territorial Seed Company - Golden Bantam product page, 2024',
      url: 'https://territorialseed.com/products/corn-golden-bantam',
    },
    {
      claim: 'plant height, ear size, yield',
      citation: 'Multiple seed suppliers (Victory Seeds, Ferry-Morse, UF Seeds)',
      url: 'https://victoryseeds.com/products/golden-bantam-sweet-corn',
    },
    {
      claim: 'spacing requirements',
      citation: 'Fine Seeds Growing Guide - Golden Bantam',
      url: 'https://www.thefineseeds.com/blogs/news/golden-bantam-corn-growing-guide',
    },
    {
      claim: 'harvest window',
      citation: 'University Extension - Sweet Corn Production',
      url: 'https://extension.okstate.edu/fact-sheets/sweet-corn-production.html',
    },
    {
      claim: 'nutrition',
      citation: 'USDA - Sweet Corn, yellow, raw (nutritional data)',
      url: 'https://www.nutritionvalue.org/Corn,_raw,_yellow,_sweet_nutritional_value.html',
    },
    {
      claim: 'seed cost',
      citation: 'Territorial Seed Company - 1 oz packet pricing',
      url: 'https://territorialseed.com/products/corn-golden-bantam',
    },
  ],
};
