import { PlantSpecies } from '../../types';
import {
  SOIL_HEAVY_FEEDER,
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
  harvest_type: 'continuous',

  // Research-validated: extension data supports 10-15 lbs for indeterminate paste.
  // 15 lbs is the optimal baseline; modifiers reduce for real conditions.
  baseline_lbs_per_plant: 15.0,
  // Transplant survival: 0.92 (established 6-8 week seedlings past vulnerable stage)
  germination_rate: 1.00,   // Transplants — already germinated
  establishment_rate: 0.92, // Transplant shock, early season cold snaps

  modifiers: {
    sun: TOMATO_SUN,
    temperature_f: TOMATO_TEMPERATURE,
    soil_moisture_pct_fc: TOMATO_MOISTURE_PASTE,
    soil: SOIL_HEAVY_FEEDER,
    spacing_plants_per_sq_ft: { 0.08: 1.1, 0.17: 1.0, 0.33: 0.8, 0.5: 0.5 },
  },

  nutrition_per_lb: TOMATO_NUTRITION,

  icon: { emoji: '🍅', color: '#C0392B' },

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
