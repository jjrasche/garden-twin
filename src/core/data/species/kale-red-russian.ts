import { PlantSpecies } from '../../types';
import type { StageConfig } from '../../types/PlantState';

export const KALE_RED_RUSSIAN: PlantSpecies = {
  id: 'kale_red_russian',
  name: 'Kale (Red Russian)',

  plants_per_sq_ft: 0.44,
  height_ft: 3,

  germination_rate: 1.00,   // Transplant — dead blocks never reach the field
  establishment_rate: 0.97, // Very hardy; minimal seedling loss

  growth_response: [
    { factor: 'sun_hours', curve: { 4: 0.6, 6: 0.9, 8: 1.0, 10: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'temperature_f', curve: { 35: 0.3, 45: 0.6, 55: 0.9, 65: 1.0, 75: 0.8, 85: 0.6 }, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: { 20: 0.0, 40: 0.3, 55: 0.75, 75: 1.0, 85: 1.0, 100: 0.85, 120: 0.15 }, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 0.2: 1.2, 0.44: 1.0, 0.8: 0.8, 1.5: 0.5 }, effect: 'growth_rate' as const },
    { factor: 'N_ppm', curve: { 10: 0.7, 30: 1.0, 60: 1.0, 120: 0.8 }, effect: 'growth_rate' as const },
    { factor: 'P_ppm', curve: { 10: 0.8, 25: 1.0, 50: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'K_ppm', curve: { 40: 0.8, 100: 1.0, 180: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'pH', curve: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 }, effect: 'growth_rate' as const },
    { factor: 'compaction_psi', curve: { 0: 1.0, 200: 0.9, 400: 0.7 }, effect: 'growth_rate' as const },
  ],

  modifiers: {
    // Monotonic — more DLI = more growth. Kale tolerates shade but grows
    // faster in sun. Bolt risk is vernalization-driven (year 2), not sun.
    sun: { 4: 0.6, 6: 0.9, 8: 1.0, 10: 1.0 },
    soil: {
      N_ppm: { 10: 0.7, 30: 1.0, 60: 1.0, 120: 0.8 },
      P_ppm: { 10: 0.8, 25: 1.0, 50: 1.0 },
      K_ppm: { 40: 0.8, 100: 1.0, 180: 1.0 },
      pH: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 },
      compaction_psi: { 0: 1.0, 200: 0.9, 400: 0.7 },
    },
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

  stage_config: {
    stage_sequence: ['seed', 'germinated', 'vegetative', 'done'],
    productive_stages: ['vegetative'],
  } satisfies StageConfig,

  phenology: {
    base_temp_f: 40,
    ceiling_temp_f: 85,
    gdd_stages: { germinated: 20, vegetative: 80, flowering: 450, fruiting: 750, mature: 1100 },
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
  },

  seed_cost_per_plant: 0.05,

  // Flavor: sugar increases with cold (starch→sugar conversion for frost hardening).
  // Starts in single-digit C (34-40°F), peaks sub-freezing. Glucosinolates also increase
  // with cold — positive for kale (peppery bite). High temps = bland.
  // Sources: University of Oldenburg (uol.de), SciTechDaily, PubMed 25529650
  flavor_response: [
    { factor: 'temperature_f', curve: { 15: 1.0, 25: 0.95, 35: 0.8, 45: 0.5, 55: 0.3, 65: 0.2, 80: 0.15 }, compound: 'sugar' },
  ],

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
