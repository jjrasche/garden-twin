import { PlantSpecies } from '../../src/core/types';

/**
 * Pole Bean (generic climbing bean)
 *
 * Climbing bean that grows on trellises, poles, or corn stalks.
 * 6 ft vines, 65 days to first harvest, continuous production.
 * Nitrogen-fixing legume — improves soil for companion plants.
 */
export const BEAN_POLE: PlantSpecies = {
  id: 'bean_pole',
  name: 'Bean (Pole)',

  // Space: 2 plants per sq ft (6" in-row, climbs vertically)
  plants_per_sq_ft: 2,
  height_ft: 6, // Climbs to support height

  // Timing: 65 days to first harvest, 60-day continuous production
  days_to_first_harvest: 65,
  days_harvest_window: 60,

  // Yield: ~0.5 lbs per plant over season, 85% success rate
  baseline_lbs_per_plant: 0.5,
  germination_rate: 0.90,
  establishment_rate: 0.95,

  modifiers: {
    // Sun hours
    sun: {
      4: 0.4,
      6: 0.8,
      8: 1.0,
      10: 1.0,
    },

    soil: {
      // Nitrogen (beans fix their own — less sensitive)
      N_ppm: {
        10: 0.9,   // Can fix their own N
        30: 1.0,
        60: 1.0,
        120: 0.9,  // Excess N reduces nodulation
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

      // pH (beans prefer 6.0-7.0)
      pH: {
        5.5: 0.6,
        6.0: 0.9,
        6.5: 1.0,
        7.0: 1.0,
        7.5: 0.8,
      },

      compaction_psi: {
        0: 1.0,
        200: 0.9,
        400: 0.6,
      },
    },

    spacing_plants_per_sq_ft: {
      1: 1.1,
      2: 1.0,
      4: 0.7,
      6: 0.4,
    },
  },

  // Nutrition (per lb of fresh green beans)
  // Source: USDA FoodData Central - Beans, snap, green, raw
  nutrition_per_lb: {
    calories: 141,
    protein_g: 8.4,
    carbs_g: 32,
    fat_g: 0.5,
    fiber_g: 12.2,
    vitamin_a_mcg: 315,
    vitamin_c_mg: 56,
    vitamin_k_mcg: 200,
    calcium_mg: 168,
    iron_mg: 4.7,
    potassium_mg: 960,
  },

  icon: {
    emoji: '🫘',
    color: '#65A30D',
  },

  tasks: [
    { name: 'planting', timing_days: [0], hours_per_plant: 0.005 },
    {
      name: 'watering',
      timing_days: Array.from({ length: 18 }, (_, i) => 7 + i * 7),
      hours_per_plant: 0.015,
    },
    {
      name: 'harvest',
      timing_days: Array.from({ length: 20 }, (_, i) => 65 + i * 3),
      hours_per_plant: 0.02,
      processing_hours_per_lb: 0.3,
    },
  ],

  seed_cost_per_plant: 0.05,

  data_confidence: 'medium',
  sources: [
    {
      claim: 'days to maturity, yield',
      citation: 'Cornell University Extension - Growing Beans',
      url: 'https://gardening.cornell.edu/',
    },
    {
      claim: 'spacing, nitrogen fixation',
      citation: 'University of Minnesota Extension - Beans in the Home Garden',
      url: 'https://extension.umn.edu/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central - Beans, snap, green, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
