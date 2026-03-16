import { PlantSpecies } from '../../src/core/types';

/**
 * Yukon Gold Potato
 *
 * Mid-early season yellow-fleshed potato.
 * Developed in Canada, 1980s. Buttery flavor, smooth thin skin.
 * Excellent for boiling, mashing, roasting. Good storage.
 * 90-100 days to maturity.
 */
export const POTATO_YUKON_GOLD: PlantSpecies = {
  id: 'potato_yukon_gold',
  name: 'Potato (Yukon Gold)',

  // Space: 1 plant per 2.5 sq ft (10" in-row × 36" between rows)
  plants_per_sq_ft: 0.4,
  height_ft: 2,

  // Timing: 90 days to maturity (mid-early season), 7-day harvest window
  days_to_first_harvest: 90,
  days_harvest_window: 7,

  // Yield: ~1.5 lbs per plant (fresh weight at harvest), 95% success rate
  // Note: Yukon Gold yields slightly less than Russet but more than early varieties
  baseline_lbs_per_plant: 1.5,
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
      0.4: 1.0,   // Optimal (Yukon Gold standard)
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
    color: '#F4D03F', // Golden yellow for Yukon Gold
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

  seed_cost_per_plant: 0.45, // ~$2.25/lb seed ÷ 5 plants/lb
  materials_cost_per_plant: 0,

  data_confidence: 'high',
  sources: [
    {
      claim: 'days to maturity',
      citation: 'Multiple sources: 80-100 days mid-early season',
      url: 'https://homefortheharvest.com/yukon-gold-potatoes/',
    },
    {
      claim: 'yield per plant',
      citation: 'Home Guides - ~1 lb per plant, 100 lbs per 100 ft row',
      url: 'https://homeguides.sfgate.com/times-plant-harvest-yukon-gold-potatoes-22666.html',
    },
    {
      claim: 'spacing',
      citation: 'Johnny\'s Seeds, Urban Farmer - 10-12" × 30-36"',
      url: 'https://www.johnnyseeds.com/vegetables/potatoes/yukon-gold-seed-potatoes-532.html',
    },
    {
      claim: 'seed cost',
      citation: 'Urban Farmer - $2.75/lb (20 lb), Johnny\'s $1.30/lb (25 lb)',
      url: 'https://www.ufseeds.com/product/yukon-gold-seed-potatoes/POYU.html',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Potato, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
