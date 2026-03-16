import { PlantSpecies } from '../../src/core/types';

/**
 * Nevada Lettuce (Batavian/Summer Crisp)
 *
 * Heat-tolerant green Batavian lettuce, slow to bolt.
 * 10-12" heads with thick, crisp leaves.
 * 48 days to maturity, cut-and-come-again harvest.
 */
export const LETTUCE_NEVADA: PlantSpecies = {
  id: 'lettuce_nevada',
  name: 'Lettuce (Nevada)',

  // Space: 4 plants per sq ft (6" spacing)
  plants_per_sq_ft: 4,
  height_ft: 0.67, // ~8 inches

  // Timing: 48 days to first harvest, 42-day cut-and-come-again window
  days_to_first_harvest: 48,
  days_harvest_window: 42,

  // Yield: ~0.5 lbs per plant over 3-4 cuttings, 90% success rate
  baseline_lbs_per_plant: 0.5,
  germination_rate: 0.95,
  establishment_rate: 0.95,

  modifiers: {
    // Sun hours — lettuce is shade tolerant, prefers partial shade in heat
    sun: {
      4: 0.8,    // Partial shade (still productive)
      6: 1.0,    // Optimal (enough light, not too hot)
      8: 0.9,    // Full sun (bolts faster in heat)
      10: 0.7,   // Excessive (heat stress, bitter)
    },

    soil: {
      // Nitrogen (lettuce is a moderate feeder)
      N_ppm: {
        20: 0.6,
        40: 1.0,
        80: 1.2,
        120: 1.1,
      },

      // Phosphorus
      P_ppm: {
        10: 0.7,
        30: 1.0,
        60: 1.1,
      },

      // Potassium
      K_ppm: {
        50: 0.7,
        120: 1.0,
        200: 1.1,
      },

      // pH (lettuce prefers 6.0-7.0)
      pH: {
        5.5: 0.7,
        6.0: 0.9,
        6.5: 1.0,
        7.0: 1.0,
        7.5: 0.8,
      },

      // Compaction (shallow roots, sensitive)
      compaction_psi: {
        0: 1.0,
        200: 0.8,
        400: 0.5,
      },
    },

    // Spacing
    spacing_plants_per_sq_ft: {
      2: 1.1,    // Wide spacing (larger heads)
      4: 1.0,    // Optimal
      6: 0.8,    // Tight (smaller heads)
      9: 0.5,    // Severe crowding
    },
  },

  // Nutrition (per lb of raw lettuce)
  // Source: USDA FoodData Central - Lettuce, green leaf, raw
  nutrition_per_lb: {
    calories: 68,
    protein_g: 6.1,
    carbs_g: 13.2,
    fat_g: 1.4,
    fiber_g: 5.9,
    vitamin_a_mcg: 3310,
    vitamin_c_mg: 41,
    vitamin_k_mcg: 580,
    calcium_mg: 163,
    iron_mg: 3.9,
    potassium_mg: 880,
  },

  icon: {
    emoji: '🥬',
    color: '#34D399',
  },

  tasks: [
    { name: 'planting', timing_days: [0], hours_per_plant: 0.005 },
    {
      name: 'watering',
      timing_days: [3, 7, 10, 14, 17, 21, 24, 28, 31, 35, 38, 42, 45, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88],
      hours_per_plant: 0.01,
    },
    {
      name: 'harvest',
      timing_days: [48, 62, 76, 90],
      hours_per_plant: 0.01,
      processing_hours_per_lb: 0.1,
    },
  ],

  seed_cost_per_plant: 0.02,

  data_confidence: 'medium',
  sources: [
    {
      claim: 'days to maturity, bolt resistance',
      citation: "Johnny's Selected Seeds - Nevada Lettuce product page, 2024",
      url: 'https://www.johnnyseeds.com/vegetables/lettuce/batavian-summer-crisp-lettuce/nevada-lettuce-seed-2364.html',
    },
    {
      claim: 'spacing, yield',
      citation: 'University of Maryland Extension - Growing Lettuce',
      url: 'https://extension.umd.edu/resource/lettuce',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Lettuce, green leaf, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
