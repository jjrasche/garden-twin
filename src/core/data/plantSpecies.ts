import { PlantSpecies } from '../types';

/**
 * Sample plant species data
 *
 * Data sources:
 * - Square Foot Gardening (Mel Bartholomew)
 * - USDA FoodData Central (nutrition)
 * - University extension publications (yields)
 */

export const CORN_WAPSIE_VALLEY: PlantSpecies = {
  id: 'corn_wapsie_valley',
  name: 'Corn (Wapsie Valley OP Dent)',

  // Space: 1 plant per 1.5 sq ft (0.67 plants/sq ft)
  plants_per_sq_ft: 0.67,
  height_ft: 8,

  // Timing: 89 days to maturity, 14-day harvest window
  days_to_first_harvest: 89,
  days_harvest_window: 14,

  // Yield: ~1/4 lb per ear, 90% success rate
  baseline_lbs_per_plant: 0.25,
  success_rate: 0.9,

  // Modifiers
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
      0.67: 1.0,  // Optimal spacing
      1.0: 0.8,   // Crowded
      2.0: 0.4,   // Severe crowding
    },
  },

  // Nutrition (per lb of dried corn)
  nutrition_per_lb: {
    calories: 1550,
    protein_g: 39,
    carbs_g: 334,
    fat_g: 21,
    fiber_g: 33,
    vitamin_a_mcg: 11,
    vitamin_c_mg: 0,
    calcium_mg: 31,
    iron_mg: 12,
    potassium_mg: 1270,
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
      timing_days: [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84],
      hours_per_plant: 0.02,
    },
    {
      name: 'weeding',
      timing_days: [14, 21, 28, 35, 42],
      hours_per_sq_ft: 0.05,
    },
    {
      name: 'harvest',
      timing_days: [89, 96, 103],
      hours_per_plant: 0.03,
      processing_hours_per_lb: 2.0, // Shelling corn
    },
  ],

  seed_cost_per_plant: 0.15,
  materials_cost_per_plant: 0,

  data_confidence: 'high',
  sources: [
    {
      claim: 'yield',
      citation: 'MSU 2024 Craft Corn Trials',
      url: 'https://www.canr.msu.edu/corn/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Corn, dried',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};

export const TOMATO_BETTER_BOY: PlantSpecies = {
  id: 'tomato_better_boy',
  name: 'Tomato (Better Boy)',

  // Space: 1 plant per 4 sq ft (0.25 plants/sq ft)
  plants_per_sq_ft: 0.25,
  height_ft: 6,

  // Timing: 70 days to first harvest, 60-day production window
  days_to_first_harvest: 70,
  days_harvest_window: 60,

  // Yield: ~15 lbs per plant over season, 85% success rate
  baseline_lbs_per_plant: 15,
  success_rate: 0.85,

  modifiers: {
    // Sun hours
    sun: {
      4: 0.2,
      6: 0.6,
      8: 1.0,
      10: 1.0,
    },

    soil: {
      // Nitrogen (too much = foliage, not fruit)
      N_ppm: {
        20: 0.7,
        50: 1.0,
        80: 1.2,
        120: 0.9,  // Excess nitrogen reduces fruit
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
      0.1: 1.1,   // Very widely spaced
      0.25: 1.0,  // Optimal
      0.5: 0.7,   // Crowded
      1.0: 0.3,   // Severe crowding
    },
  },

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
    color: '#E74C3C',
  },

  tasks: [
    { name: 'planting', timing_days: [0], hours_per_plant: 0.05 },
    { name: 'staking', timing_days: [14], hours_per_plant: 0.1 },
    {
      name: 'watering',
      timing_days: [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98, 105, 112, 119],
      hours_per_plant: 0.03,
    },
    {
      name: 'pruning',
      timing_days: [28, 42, 56, 70],
      hours_per_plant: 0.05,
    },
    {
      name: 'harvest',
      // Harvest every 3-4 days during production
      timing_days: Array.from({ length: 20 }, (_, i) => 70 + i * 3),
      hours_per_plant: 0.02,
      processing_hours_per_lb: 0.5, // Washing, sorting
    },
  ],

  seed_cost_per_plant: 0.25,
  materials_cost_per_plant: 0.5, // Stake, cage

  data_confidence: 'high',
  sources: [
    {
      claim: 'yield',
      citation: 'University Extension Tomato Trials',
      url: 'https://extension.org/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Tomato, red, ripe',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};

export const POTATO_RUSSET: PlantSpecies = {
  id: 'potato_russet',
  name: 'Potato (Russet)',

  // Space: 1 plant per sq ft
  plants_per_sq_ft: 1.0,
  height_ft: 2,

  // Timing: 90 days to maturity, harvest all at once
  days_to_first_harvest: 90,
  days_harvest_window: 7,

  // Yield: ~2 lbs per plant, 95% success rate
  baseline_lbs_per_plant: 2.0,
  success_rate: 0.95,

  modifiers: {
    sun: {
      4: 0.5,
      6: 0.8,
      8: 1.0,
      10: 1.0,
    },

    soil: {
      N_ppm: {
        20: 0.7,
        50: 1.0,
        100: 1.1,
        150: 1.0,
      },

      P_ppm: {
        10: 0.6,
        30: 1.0,
        60: 1.2,
      },

      K_ppm: {
        50: 0.7,
        120: 1.0,
        200: 1.3,  // Potatoes love potassium
      },

      // pH (potatoes prefer 5.0-6.0, slightly acidic)
      pH: {
        4.5: 0.8,
        5.5: 1.0,
        6.5: 0.9,
        7.0: 0.7,
      },

      compaction_psi: {
        0: 1.0,
        200: 0.7,  // Potatoes need loose soil
        400: 0.4,
      },
    },

    spacing_plants_per_sq_ft: {
      0.5: 1.1,   // Wide spacing
      1.0: 1.0,   // Optimal
      2.0: 0.7,   // Crowded
      4.0: 0.4,   // Too crowded
    },
  },

  nutrition_per_lb: {
    calories: 349,
    protein_g: 9,
    carbs_g: 79,
    fat_g: 0.4,
    fiber_g: 9,
    vitamin_a_mcg: 0,
    vitamin_c_mg: 88,
    calcium_mg: 54,
    iron_mg: 3.6,
    potassium_mg: 1840,
  },

  icon: {
    emoji: '🥔',
    color: '#D4A76A',
  },

  tasks: [
    { name: 'planting', timing_days: [0], hours_per_plant: 0.02 },
    {
      name: 'hilling',
      timing_days: [21, 42],
      hours_per_plant: 0.03,
    },
    {
      name: 'watering',
      timing_days: [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84],
      hours_per_plant: 0.02,
    },
    {
      name: 'harvest',
      timing_days: [90],
      hours_per_plant: 0.05,
      processing_hours_per_lb: 0.2, // Cleaning, curing
    },
  ],

  seed_cost_per_plant: 0.30,
  materials_cost_per_plant: 0,

  data_confidence: 'high',
  sources: [
    {
      claim: 'yield',
      citation: 'University Potato Variety Trials',
      url: 'https://extension.org/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Potato, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};

/**
 * Map of all available plant species
 */
export const PLANT_SPECIES_MAP = new Map<string, PlantSpecies>([
  [CORN_WAPSIE_VALLEY.id, CORN_WAPSIE_VALLEY],
  [TOMATO_BETTER_BOY.id, TOMATO_BETTER_BOY],
  [POTATO_RUSSET.id, POTATO_RUSSET],
]);

/**
 * Array of all plant species (for iteration)
 */
export const ALL_PLANT_SPECIES = [
  CORN_WAPSIE_VALLEY,
  TOMATO_BETTER_BOY,
  POTATO_RUSSET,
];
