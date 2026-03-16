import { PlantSpecies } from '../../types';
import {
  SOIL_HEAVY_FEEDER,
  SOIL_HEAVY_FEEDER_RESPONSES,
  TOMATO_SUN,
  TOMATO_TEMPERATURE,
  TOMATO_MOISTURE_CHERRY,
  TOMATO_NUTRITION,
  TOMATO_LAYOUT_BASE,
  TOMATO_SOURCES,
} from './shared-modifiers';

export const TOMATO_SUN_GOLD: PlantSpecies = {
  id: 'tomato_sun_gold',
  name: 'Tomato (Sun Gold F1)',

  plants_per_sq_ft: 0.17,
  height_ft: 8,

  days_to_first_harvest: 60,
  harvest_type: 'continuous',

  // Research-validated: F1 hybrid vigor, universally cited as most prolific cherry.
  // Cherry tomatoes generally 10-15 lbs/plant (UMD Extension).
  baseline_lbs_per_plant: 10.0,
  germination_rate: 1.00,   // Transplants — already germinated
  establishment_rate: 0.92, // Transplant shock, early season cold snaps

  growth_response: [
    { factor: 'sun_hours', curve: TOMATO_SUN, effect: 'growth_rate' as const },
    { factor: 'temperature_f', curve: TOMATO_TEMPERATURE, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: TOMATO_MOISTURE_CHERRY, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 0.08: 1.1, 0.17: 1.0, 0.33: 0.8, 0.5: 0.5 }, effect: 'growth_rate' as const },
    ...SOIL_HEAVY_FEEDER_RESPONSES,
  ],

  modifiers: {
    sun: TOMATO_SUN,
    temperature_f: TOMATO_TEMPERATURE,
    soil_moisture_pct_fc: TOMATO_MOISTURE_CHERRY,
    soil: SOIL_HEAVY_FEEDER,
    spacing_plants_per_sq_ft: { 0.08: 1.1, 0.17: 1.0, 0.33: 0.8, 0.5: 0.5 },
  },

  nutrition_per_lb: TOMATO_NUTRITION,

  icon: { emoji: '🍅', color: '#FFA500' },

  phenology: {
    base_temp_f: 50,
    gdd_stages: { vegetative: 300, flowering: 500, fruiting: 750, mature: 1200 },
  },

  layout: TOMATO_LAYOUT_BASE,

  seed_cost_per_plant: 0.30,
  materials_cost_per_plant: 0.50,

  data_confidence: 'high',
  sources: [
    {
      claim: 'yield, days to maturity',
      citation:
        'Johnny\'s Selected Seeds — Sun Gold F1 Cherry Tomato trial data',
      url: 'https://www.johnnyseeds.com/',
    },
    ...TOMATO_SOURCES,
  ],
};
