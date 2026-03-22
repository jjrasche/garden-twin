import { PlantSpecies } from '../../types';

export const TOMATO_SUN_GOLD: PlantSpecies = {
  id: 'tomato_sun_gold',
  name: 'Tomato (Sun Gold F1)',

  plants_per_sq_ft: 0.17,
  height_ft: 8,

  germination_rate: 1.00,   // Transplants — already germinated
  establishment_rate: 0.92, // Transplant shock, early season cold snaps

  growth_response: [
    // Cherry tomatoes tolerate slightly less sun than paste (smaller canopy, less leaf area needed).
    { factor: 'sun_hours', curve: { 3: 0.3, 5: 0.7, 7: 1.0, 10: 1.0 }, effect: 'growth_rate' as const },
    // Sun Gold is notably heat-tolerant — keeps flowering/setting fruit through heatwaves
    // when paste types drop blossoms. Still no fruit set above 95°F (pollen sterility).
    // Sources: tomatodirt.com, simplyvy.com (Houston heatwave), smartgardener.com
    { factor: 'temperature_f', curve: { 50: 0.0, 60: 0.5, 70: 0.9, 80: 1.0, 90: 0.9, 95: 0.5, 100: 0.1 }, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: { 20: 0.0, 40: 0.3, 55: 0.7, 70: 0.95, 80: 1.0, 90: 1.0, 100: 0.8, 115: 0.5, 130: 0.1 }, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 0.08: 1.1, 0.17: 1.0, 0.33: 0.8, 0.5: 0.5 }, effect: 'growth_rate' as const },
    { factor: 'N_ppm', curve: { 20: 0.6, 50: 1.0, 100: 1.3, 150: 1.3 }, effect: 'growth_rate' as const },
    { factor: 'P_ppm', curve: { 10: 0.7, 30: 1.0, 60: 1.2 }, effect: 'growth_rate' as const },
    { factor: 'K_ppm', curve: { 50: 0.7, 120: 1.0, 200: 1.1 }, effect: 'growth_rate' as const },
    { factor: 'pH', curve: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 }, effect: 'growth_rate' as const },
    { factor: 'compaction_psi', curve: { 0: 1.0, 200: 0.9, 400: 0.7 }, effect: 'growth_rate' as const },
  ],

  modifiers: {
    sun: { 3: 0.3, 5: 0.7, 7: 1.0, 10: 1.0 },
    temperature_f: { 50: 0.0, 60: 0.5, 70: 0.9, 80: 1.0, 90: 0.9, 95: 0.5, 100: 0.1 },
    soil_moisture_pct_fc: { 20: 0.0, 40: 0.3, 55: 0.7, 70: 0.95, 80: 1.0, 90: 1.0, 100: 0.8, 115: 0.5, 130: 0.1 },
    soil: {
      N_ppm: { 20: 0.6, 50: 1.0, 100: 1.3, 150: 1.3 },
      P_ppm: { 10: 0.7, 30: 1.0, 60: 1.2 },
      K_ppm: { 50: 0.7, 120: 1.0, 200: 1.1 },
      pH: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 },
      compaction_psi: { 0: 1.0, 200: 0.9, 400: 0.7 },
    },
    spacing_plants_per_sq_ft: { 0.08: 1.1, 0.17: 1.0, 0.33: 0.8, 0.5: 0.5 },
  },

  nutrition_per_lb: { calories: 90, protein_g: 4, carbs_g: 18, fat_g: 0.9, fiber_g: 5.4 },

  icon: { emoji: '🍅', color: '#FFA500' },

  stage_config: {
    stage_sequence: ['seed', 'germinated', 'vegetative', 'flowering', 'fruiting', 'harvest', 'done'],
    productive_stages: ['fruiting', 'harvest'],
  },

  phenology: {
    base_temp_f: 50,
    ceiling_temp_f: 95,
    gdd_stages: { germinated: 30, vegetative: 300, flowering: 500, fruiting: 750, mature: 1200 },
  },

  layout: {
    spacing: { in_row_in: 18, between_row_in: 36 },
    shade_tolerance: 'full_sun' as const,
    spread_in: 28,
    root_depth: 'deep' as const,
    frost_tolerance: 'tender' as const,
    kill_temp_f: 33,
    min_soil_temp_f: 60,
    planting_method: 'transplant' as const,
    role: 'food_crop' as const,
    needs_containment: false,
  },

  seed_cost_per_plant: 0.30,
  materials_cost_per_plant: 0.50,

  // Flavor: Sun Gold has high baseline Brix (~9-10). Brix increases with warm days,
  // moderate water stress, and high radiation. Drops in extreme heat (>95°F) and overwatering.
  // Sources: Ohio State (ohioline.osu.edu), PLOS One salt stress study
  flavor_response: [
    { factor: 'temperature_f', curve: { 60: 0.4, 70: 0.7, 80: 1.0, 90: 0.9, 95: 0.6 }, compound: 'brix' },
    { factor: 'sun_hours', curve: { 4: 0.4, 6: 0.7, 8: 1.0, 10: 1.0 }, compound: 'brix' },
  ],

  data_confidence: 'high',
  sources: [
    {
      claim: 'yield, days to maturity',
      citation:
        'Johnny\'s Selected Seeds — Sun Gold F1 Cherry Tomato trial data',
      url: 'https://www.johnnyseeds.com/',
    },
    { claim: 'nutrition', citation: 'USDA FoodData Central — Tomatoes, red, ripe, raw', url: 'https://fdc.nal.usda.gov/' },
    { claim: 'companion planting — blight and earworm distance', citation: 'Penn State Extension — Late Blight of Potato and Tomato; UMN Extension — Corn Earworm', url: 'https://extension.psu.edu/' },
  ],
};
