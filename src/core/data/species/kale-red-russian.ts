import { PlantSpecies } from '../../types';
import { SOIL_LIGHT_FEEDER, SOIL_LIGHT_FEEDER_RESPONSES } from './shared-modifiers';

export const KALE_RED_RUSSIAN: PlantSpecies = {
  id: 'kale_red_russian',
  name: 'Kale (Red Russian)',

  plants_per_sq_ft: 0.44,
  height_ft: 3,

  days_to_first_harvest: 50,
  harvest_type: 'cut_and_come_again',
  cut_and_come_again: {
    max_cuts: 8,
    regrowth_days: 14,
    // Biennial brassica — peaks at cuts 2-4, long productive window.
    // Source: MSU Extension, Johnny's Selected Seeds.
    cut_yield_curve: { 1: 0.6, 2: 0.8, 3: 1.0, 4: 1.0, 5: 1.0, 6: 0.9, 7: 0.8, 8: 0.6 },
  },

  // Research-validated: cut-and-come-again range 1.5-3.0 lbs/plant.
  // 1.75 for year 1 with vermicompost. Biennial — does NOT bolt year 1.
  baseline_lbs_per_plant: 1.75,
  germination_rate: 0.95,   // Brassica seeds germinate reliably
  establishment_rate: 0.97, // Very hardy; minimal seedling loss

  growth_response: [
    { factor: 'sun_hours', curve: { 4: 0.6, 6: 0.9, 8: 1.0, 10: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'temperature_f', curve: { 35: 0.3, 45: 0.6, 55: 0.9, 65: 1.0, 75: 0.8, 85: 0.6 }, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: { 20: 0.0, 40: 0.3, 55: 0.75, 75: 1.0, 85: 1.0, 100: 0.85, 120: 0.15 }, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 0.2: 1.2, 0.44: 1.0, 0.8: 0.8, 1.5: 0.5 }, effect: 'growth_rate' as const },
    ...SOIL_LIGHT_FEEDER_RESPONSES,
  ],

  modifiers: {
    // Monotonic — more DLI = more growth. Kale tolerates shade but grows
    // faster in sun. Bolt risk is vernalization-driven (year 2), not sun.
    sun: { 4: 0.6, 6: 0.9, 8: 1.0, 10: 1.0 },
    soil: SOIL_LIGHT_FEEDER,
    spacing_plants_per_sq_ft: { 0.2: 1.2, 0.44: 1.0, 0.8: 0.8, 1.5: 0.5 },
    // Kale grows best at 55-75°F, optimum 60-70°F. Above 75°F: slower
    // growth, bitter flavor. Below 40°F: growth slows. Frost sweetens
    // (starch→sugar). Sources: Old Farmer's Almanac, WVU Extension,
    // Johnny's Selected Seeds.
    temperature_f: { 35: 0.3, 45: 0.6, 55: 0.9, 65: 1.0, 75: 0.8, 85: 0.6 },
    // FAO p=0.45 (cabbage). Deeper roots than lettuce/spinach — wider tolerance.
    // 90% biomass loss at 19-day waterlogging. Sources: FAO 56, Issarakraisila 2007.
    soil_moisture_pct_fc: { 20: 0.0, 40: 0.3, 55: 0.75, 75: 1.0, 85: 1.0, 100: 0.85, 120: 0.15 },
  },

  nutrition_per_lb: {
    calories: 50,
    protein_g: 10,
    carbs_g: 10,
    fat_g: 1.5,
    fiber_g: 9,
  },

  icon: { emoji: '🥬', color: '#8B4513' },

  phenology: {
    base_temp_f: 40,
    gdd_stages: { vegetative: 80, flowering: 450, fruiting: 750, mature: 1100 },
  },

  layout: {
    spacing: { in_row_in: 18, between_row_in: 18, equidistant_in: 18 },
    shade_tolerance: 'partial_shade',
    spread_in: 20,
    root_depth: 'medium',
    frost_tolerance: 'very_hardy',
    kill_temp_f: 10,
    min_soil_temp_f: 40,
    planting_method: 'transplant',
    role: 'food_crop',
    needs_containment: false,
    companions: [
      {
        target_species_id: 'marigold_french',
        effect: 'beneficial',
        mechanism: 'visual pest confusion — disrupts cabbage moth host-finding',
        max_distance_in: 18,
      },
    ],
  },

  seed_cost_per_plant: 0.05,

  data_confidence: 'high',
  sources: [
    {
      claim: 'yield, spacing, frost tolerance',
      citation:
        'Michigan State University Extension — Growing Kale in Michigan',
      url: 'https://www.canr.msu.edu/resources/growing-kale',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central — Kale, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
