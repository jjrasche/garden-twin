import { PlantSpecies } from '../../types';
import type { StageConfig, StressTolerances } from '../../types/PlantState';
import { SOIL_HEAVY_FEEDER, SOIL_HEAVY_FEEDER_RESPONSES } from './shared-modifiers';

export const POTATO_KENNEBEC: PlantSpecies = {
  id: 'potato_kennebec',
  name: 'Potato (Kennebec)',

  plants_per_sq_ft: 0.40,
  height_ft: 3,

  days_to_first_harvest: 90,
  germination_rate: 0.95,   // Tubers sprout reliably
  establishment_rate: 0.90, // Seed piece rot, early blight risk

  growth_response: [
    { factor: 'sun_hours', curve: { 4: 0.4, 6: 0.8, 8: 1.0, 10: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'soil_temp_f', curve: { 40: 0.1, 50: 0.5, 60: 0.9, 70: 1.0, 80: 0.7, 85: 0.4, 90: 0.1 }, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: { 20: 0.0, 40: 0.2, 50: 0.45, 65: 0.85, 80: 1.0, 90: 1.0, 100: 0.95, 110: 0.6, 125: 0.05 }, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 0.2: 1.2, 0.4: 1.0, 0.8: 0.8, 1.5: 0.5 }, effect: 'growth_rate' as const },
    ...SOIL_HEAVY_FEEDER_RESPONSES,
    // Short-day promotion of tuberization. Kennebec is intermediate day-length
    // sensitivity. Long days (>14h) delay tuber initiation; short days accelerate.
    // Source: CIP (International Potato Center), Ewing & Struik 1992.
    { factor: 'photoperiod_h', curve: { 10: 1.2, 12: 1.1, 13: 1.0, 14: 0.9, 15: 0.8, 16: 0.7 }, effect: 'development_rate' as const, name: 'photoperiod_tuberization', active_stages: ['flowering', 'fruiting'] },
  ],

  modifiers: {
    sun: { 4: 0.4, 6: 0.8, 8: 1.0, 10: 1.0 },
    // Tuberization responds to SOIL temp, not air temp. Optimal 60-70°F soil.
    // Suppressed >80°F soil. Below 45°F: growth stops.
    // Sources: Cornell Extension, CIP (International Potato Center).
    soil_temperature_f: { 40: 0.1, 50: 0.5, 60: 0.9, 70: 1.0, 80: 0.7, 85: 0.4, 90: 0.1 },
    // FAO p=0.35, Ky=1.1. Narrow optimal band. Devastating waterlogging:
    // 64% yield loss in 2 days (ISHS). Sources: FAO 33/56, UC Davis IPM.
    soil_moisture_pct_fc: { 20: 0.0, 40: 0.2, 50: 0.45, 65: 0.85, 80: 1.0, 90: 1.0, 100: 0.95, 110: 0.6, 125: 0.05 },
    soil: SOIL_HEAVY_FEEDER,
    spacing_plants_per_sq_ft: { 0.2: 1.2, 0.4: 1.0, 0.8: 0.8, 1.5: 0.5 },
  },

  nutrition_per_lb: {
    calories: 340,
    protein_g: 9,
    carbs_g: 77,
    fat_g: 0.4,
    fiber_g: 10,
  },

  icon: { emoji: '🥔', color: '#C4A35A' },

  stage_config: {
    stage_sequence: ['seed', 'vegetative', 'flowering', 'fruiting', 'harvest', 'done'],
    productive_stages: ['fruiting', 'harvest'],
  } satisfies StageConfig,

  stress_tolerances: {
    drought: { threshold: 30, direction: 'below', days_to_damage: 4, days_to_death: 10 },
    waterlog: { threshold: 110, direction: 'above', days_to_damage: 1, days_to_death: 3 },
  } satisfies StressTolerances,

  phenology: {
    base_temp_f: 40,
    gdd_stages: { vegetative: 350, flowering: 900, fruiting: 1200, mature: 1700 },
  },

  layout: {
    spacing: { in_row_in: 12, between_row_in: 30 },
    shade_tolerance: 'partial_shade',
    spread_in: 20,
    root_depth: 'medium',
    frost_tolerance: 'semi_hardy',
    kill_temp_f: 28,
    min_soil_temp_f: 45,
    planting_method: 'tuber',
    role: 'food_crop',
    needs_containment: false,
    companions: [
      {
        target_species_id: 'marigold_french',
        effect: 'beneficial',
        mechanism: 'visual pest confusion — disrupts Colorado potato beetle host-finding',
        max_distance_in: 18,
      },
      {
        target_species_id: 'calendula',
        effect: 'beneficial',
        mechanism: 'attracts predatory insects near potato rows',
        max_distance_in: 60,
      },
    ],
  },

  seed_cost_per_plant: 0.50,

  data_confidence: 'high',
  sources: [
    {
      claim: 'yield, spacing, days to maturity',
      citation:
        'Cornell University Extension — Potato Varieties for the Home Garden',
      url: 'https://gardening.cals.cornell.edu/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central — Potato, white, flesh and skin, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
    {
      claim: 'companion planting — blight separation',
      citation:
        'Penn State Extension — Late Blight of Potato and Tomato',
      url: 'https://extension.psu.edu/',
    },
  ],
};
