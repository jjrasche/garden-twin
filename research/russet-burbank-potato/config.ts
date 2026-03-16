import { PlantSpecies } from '../../src/core/types';

/**
 * Russet Burbank Potato
 *
 * Classic late-season storage potato developed by Luther Burbank in 1902.
 * Industry standard for baking, frying, and mashing.
 * 110-120 days to full maturity.
 * Large, oblong tubers with russeted skin.
 */
export const POTATO_RUSSET_BURBANK: PlantSpecies = {
  id: 'potato_russet_burbank',
  name: 'Potato (Russet Burbank)',

  // Space: 1 plant per 3 sq ft (12" in-row × 36" between rows)
  plants_per_sq_ft: 0.33,
  height_ft: 2,

  // Timing: 110 days to full maturity (storage potatoes), 7-day harvest window
  days_to_first_harvest: 110,
  days_harvest_window: 7,

  // Yield: ~2 lbs per plant (fresh weight at harvest), 95% success rate
  baseline_lbs_per_plant: 2.0,
  germination_rate: 0.97,
  establishment_rate: 0.98,

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
      0.33: 1.0,  // Optimal (Russet Burbank standard)
      0.5: 0.9,   // Moderate
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
    color: '#D4A76A',
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
      timing_days: [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 91, 98, 105],
      hours_per_plant: 0.02,
    },
    {
      name: 'harvest',
      timing_days: [110],
      hours_per_plant: 0.05,
      processing_hours_per_lb: 0.2, // Cleaning, curing
    },
  ],

  seed_cost_per_plant: 0.60, // ~$3.68/lb seed ÷ 6 plants/lb
  materials_cost_per_plant: 0,

  data_confidence: 'high',
  sources: [
    {
      claim: 'days to maturity',
      citation: 'Multiple sources: Filaree Organic (100-120), Arts Nursery (110-120)',
      url: 'https://filareefarm.com/russet-burbank-potato/',
    },
    {
      claim: 'yield per plant',
      citation: 'CSU Extension - ~2 lbs per plant under good conditions',
      url: 'https://homeguides.sfgate.com/average-potato-yield-per-plant-48132.html',
    },
    {
      claim: 'spacing',
      citation: 'High Mowing Seeds - 12" plant × 30-36" row spacing',
      url: 'https://www.highmowingseeds.com/organic-non-gmo-burbank-russet-potato.html',
    },
    {
      claim: 'seed cost',
      citation: 'High Mowing Seeds - $3.68/lb (20 lb qty)',
      url: 'https://www.highmowingseeds.com/organic-non-gmo-burbank-russet-potato.html',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Potato, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
