import { PlantSpecies } from '../../src/core/types';

/**
 * Red Norland Potato
 *
 * Early-season red-skinned potato with white flesh.
 * Reliable, heavy yields, excellent for boiling and roasting.
 * Ready before most other varieties (70-90 days).
 */
export const POTATO_RED_NORLAND: PlantSpecies = {
  id: 'potato_red_norland',
  name: 'Potato (Red Norland)',

  // Space: 1 plant per 2.5 sq ft (10" in-row × 36" between rows)
  plants_per_sq_ft: 0.4,
  height_ft: 2,

  // Timing: 80 days to maturity (early season), 7-day harvest window
  days_to_first_harvest: 80,
  days_harvest_window: 7,

  // Yield: ~2 lbs per plant (fresh weight at harvest), 95% success rate
  baseline_lbs_per_plant: 2.0,
  success_rate: 0.95,

  // Modifiers (using standard POTATO modifiers)
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
      0.25: 1.1,  // Wide spacing
      0.4: 1.0,   // Optimal (Red Norland standard)
      0.5: 0.95,  // Moderate
      1.0: 0.7,   // Crowded
      2.0: 0.4,   // Too crowded
    },
  },

  // Nutrition (per lb of fresh raw potato)
  // Source: USDA FoodData Central - Potato, raw (same for all potato varieties)
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
    color: '#C85A54', // Reddish for red potato
  },

  // Labor tasks
  tasks: [
    { name: 'planting', timing_days: [0], hours_per_plant: 0.02 },
    {
      name: 'hilling',
      timing_days: [21, 42],
      hours_per_plant: 0.03,
    },
    {
      name: 'watering',
      timing_days: [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77],
      hours_per_plant: 0.02,
    },
    {
      name: 'harvest',
      timing_days: [80],
      hours_per_plant: 0.05,
      processing_hours_per_lb: 0.2, // Cleaning, curing
    },
  ],

  seed_cost_per_plant: 0.40, // ~$2.00/lb seed ÷ 5 plants/lb
  materials_cost_per_plant: 0,

  data_confidence: 'high',
  sources: [
    {
      claim: 'days to maturity',
      citation: 'Johnny\'s Seeds - Dark Red Norland, 70-90 days early season',
      url: 'https://www.johnnyseeds.com/vegetables/potatoes/dark-red-norland-seed-potatoes-552.html',
    },
    {
      claim: 'yield, spacing',
      citation: 'High Mowing Seeds - 80-100 lb/1000\', 12" × 36" spacing',
      url: 'https://www.highmowingseeds.com/organic-non-gmo-dark-red-norland-potato.html',
    },
    {
      claim: 'seed cost',
      citation: 'Urban Farmer - $2.00/lb (20 lb qty)',
      url: 'https://www.ufseeds.com/product/red-norland-seed-potatoes/PORN.html',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Potato, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
