import { PlantSpecies } from '../../types';
import type { StageConfig } from '../../types/PlantState';

export const CORN_NOTHSTINE_DENT: PlantSpecies = {
  id: 'corn_nothstine_dent',
  name: 'Corn (Nothstine Dent)',

  plants_per_sq_ft: 0.44,
  height_ft: 7,

  germination_rate: 0.90,   // Large seeds; direct sow
  establishment_rate: 0.95, // Cutworm/bird pressure on seedlings
  seeds_per_hole: 2,        // Plant 2, thin to strongest

  growth_response: [
    { factor: 'sun_hours', curve: { 4: 0.3, 6: 0.7, 8: 1.0, 10: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'temperature_f', curve: { 50: 0.0, 60: 0.4, 70: 0.8, 80: 1.0, 90: 0.9, 95: 0.5, 100: 0.1 }, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: { 20: 0.0, 35: 0.3, 45: 0.75, 60: 0.92, 80: 1.0, 90: 1.0, 100: 0.97, 115: 0.7, 130: 0.1 }, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 0.2: 1.2, 0.44: 1.0, 0.8: 0.8, 1.5: 0.4 }, effect: 'growth_rate' as const },
    { factor: 'N_ppm', curve: { 20: 0.6, 50: 1.0, 100: 1.3, 150: 1.3 }, effect: 'growth_rate' as const },
    { factor: 'P_ppm', curve: { 10: 0.7, 30: 1.0, 60: 1.2 }, effect: 'growth_rate' as const },
    { factor: 'K_ppm', curve: { 50: 0.7, 120: 1.0, 200: 1.1 }, effect: 'growth_rate' as const },
    { factor: 'pH', curve: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 }, effect: 'growth_rate' as const },
    { factor: 'compaction_psi', curve: { 0: 1.0, 200: 0.9, 400: 0.7 }, effect: 'growth_rate' as const },
  ],

  modifiers: {
    sun: { 4: 0.3, 6: 0.7, 8: 1.0, 10: 1.0 },
    // C4 — thrives in heat, pollination fails >95°F (silk desiccation).
    // Optimal 77-91°F. Below 50°F: no growth. Sources: Iowa State, Purdue Agronomy.
    temperature_f: { 50: 0.0, 60: 0.4, 70: 0.8, 80: 1.0, 90: 0.9, 95: 0.5, 100: 0.1 },
    // FAO p=0.55, Ky=1.25. Deep roots — widest drought tolerance of food crops.
    // Silking is critical: 5-8% yield loss/day of severe stress. Sources: FAO 33/56, Purdue NCH-18.
    soil_moisture_pct_fc: { 20: 0.0, 35: 0.3, 45: 0.75, 60: 0.92, 80: 1.0, 90: 1.0, 100: 0.97, 115: 0.7, 130: 0.1 },
    soil: {
      N_ppm: { 20: 0.6, 50: 1.0, 100: 1.3, 150: 1.3 },
      P_ppm: { 10: 0.7, 30: 1.0, 60: 1.2 },
      K_ppm: { 50: 0.7, 120: 1.0, 200: 1.1 },
      pH: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 },
      compaction_psi: { 0: 1.0, 200: 0.9, 400: 0.7 },
    },
    spacing_plants_per_sq_ft: { 0.2: 1.2, 0.44: 1.0, 0.8: 0.8, 1.5: 0.4 },
  },

  nutrition_per_lb: {
    calories: 1650,
    protein_g: 43,
    carbs_g: 340,
    fat_g: 21,
    fiber_g: 33,
  },

  icon: { emoji: '🌽', color: '#D4A017' },

  stage_config: {
    stage_sequence: ['seed', 'germinated', 'vegetative', 'flowering', 'fruiting', 'harvest', 'done'],
    productive_stages: ['fruiting', 'harvest'],
  } satisfies StageConfig,

  phenology: {
    base_temp_f: 50,
    ceiling_temp_f: 95,
    gdd_stages: { germinated: 60, vegetative: 435, flowering: 1020, fruiting: 1475, mature: 2100 },
  },

  layout: {
    spacing: { in_row_in: 18, between_row_in: 18, equidistant_in: 18 },
    shade_tolerance: 'full_sun',
    spread_in: 22,
    root_depth: 'deep',
    frost_tolerance: 'tender',
    kill_temp_f: 32,
    min_soil_temp_f: 55,
    planting_method: 'direct_sow',
    role: 'food_crop',
    needs_containment: false,
    access_type: 'block',
    thin_at_stage: 'vegetative',  // V2-V3, ~2 weeks after emergence
    thin_at_height_in: 4,
  },

  seed_cost_per_plant: 0.10,

  data_confidence: 'high',
  sources: [
    {
      claim: 'days to maturity, yield, spacing',
      citation:
        'Nothstine Dent seed catalog data — Fedco Seeds, Johnny\'s Selected Seeds',
      url: 'https://www.fedcoseeds.com/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central — Corn grain, yellow (dent)',
      url: 'https://fdc.nal.usda.gov/',
    },
    {
      claim: 'companion planting — earworm distance',
      citation:
        'University of Minnesota Extension — Corn Earworm Management',
      url: 'https://extension.umn.edu/',
    },
  ],
};
