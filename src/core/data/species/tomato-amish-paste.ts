import { PlantSpecies } from '../../types';
import {
  SOIL_HEAVY_FEEDER,
  SOIL_HEAVY_FEEDER_RESPONSES,
  TOMATO_SUN,
  TOMATO_TEMPERATURE,
  TOMATO_MOISTURE_PASTE,
  TOMATO_NUTRITION,
  TOMATO_LAYOUT_BASE,
  TOMATO_SOURCES,
} from './shared-modifiers';

export const TOMATO_AMISH_PASTE: PlantSpecies = {
  id: 'tomato_amish_paste',
  name: 'Tomato (Amish Paste OP)',

  plants_per_sq_ft: 0.17,
  height_ft: 6,

  days_to_first_harvest: 82,
  germination_rate: 1.00,   // Transplants — already germinated
  establishment_rate: 0.92, // Transplant shock, early season cold snaps

  growth_response: [
    { factor: 'sun_hours', curve: TOMATO_SUN, effect: 'growth_rate' as const },
    { factor: 'temperature_f', curve: TOMATO_TEMPERATURE, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: TOMATO_MOISTURE_PASTE, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 0.08: 1.1, 0.17: 1.0, 0.33: 0.8, 0.5: 0.5 }, effect: 'growth_rate' as const },
    ...SOIL_HEAVY_FEEDER_RESPONSES,
  ],

  modifiers: {
    sun: TOMATO_SUN,
    temperature_f: TOMATO_TEMPERATURE,
    soil_moisture_pct_fc: TOMATO_MOISTURE_PASTE,
    soil: SOIL_HEAVY_FEEDER,
    spacing_plants_per_sq_ft: { 0.08: 1.1, 0.17: 1.0, 0.33: 0.8, 0.5: 0.5 },
  },

  nutrition_per_lb: TOMATO_NUTRITION,

  icon: { emoji: '🍅', color: '#C0392B' },

  stage_config: {
    stage_sequence: ['seed', 'vegetative', 'flowering', 'fruiting', 'harvest', 'done'],
    productive_stages: ['fruiting', 'harvest'],
  },

  phenology: {
    base_temp_f: 50,
    gdd_stages: { vegetative: 350, flowering: 550, fruiting: 900, mature: 1700 },
  },

  layout: TOMATO_LAYOUT_BASE,

  seed_cost_per_plant: 0.30,
  materials_cost_per_plant: 0.50,

  data_confidence: 'high',
  sources: [
    {
      claim: 'yield, days to maturity',
      citation:
        'Seed Savers Exchange — Amish Paste Tomato variety profile',
      url: 'https://www.seedsavers.org/',
    },
    ...TOMATO_SOURCES,
  ],
};
