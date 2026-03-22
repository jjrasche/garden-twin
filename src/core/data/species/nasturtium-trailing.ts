import { PlantSpecies } from '../../types';

export const NASTURTIUM: PlantSpecies = {
  id: 'nasturtium',
  name: 'Nasturtium (Tropaeolum majus)',

  plants_per_sq_ft: 1.0,
  height_ft: 1.0,

  germination_rate: 0.95,   // Large seeds; direct sow after frost
  establishment_rate: 0.95, // Frost-tender but planted post-frost

  growth_response: [
    { factor: 'sun_hours', curve: { 4: 0.4, 6: 0.8, 8: 1.0, 10: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: { 15: 0.0, 35: 0.5, 50: 0.75, 70: 1.0, 85: 1.0, 100: 0.85, 115: 0.5, 130: 0.15 }, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 0.5: 1.1, 1.0: 1.0, 2.0: 0.8, 3.0: 0.5 }, effect: 'growth_rate' as const },
    { factor: 'N_ppm', curve: { 10: 0.8, 30: 1.0, 80: 1.0, 150: 0.9 }, effect: 'growth_rate' as const },
    { factor: 'P_ppm', curve: { 10: 0.8, 25: 1.0, 50: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'K_ppm', curve: { 40: 0.8, 100: 1.0, 180: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'pH', curve: { 5.5: 0.8, 6.5: 1.0, 7.5: 1.0, 8.0: 0.8 }, effect: 'growth_rate' as const },
    { factor: 'compaction_psi', curve: { 0: 1.0, 200: 0.95, 400: 0.8 }, effect: 'growth_rate' as const },
  ],

  modifiers: {
    sun: { 4: 0.4, 6: 0.8, 8: 1.0, 10: 1.0 },
    soil: {
      N_ppm: { 10: 0.8, 30: 1.0, 80: 1.0, 150: 0.9 },
      P_ppm: { 10: 0.8, 25: 1.0, 50: 1.0 },
      K_ppm: { 40: 0.8, 100: 1.0, 180: 1.0 },
      pH: { 5.5: 0.8, 6.5: 1.0, 7.5: 1.0, 8.0: 0.8 },
      compaction_psi: { 0: 1.0, 200: 0.95, 400: 0.8 },
    },
    spacing_plants_per_sq_ft: { 0.5: 1.1, 1.0: 1.0, 2.0: 0.8, 3.0: 0.5 },
    // Drought-tolerant ("tolerant of drought and neglect" — WI Extension).
    // Optimal shifted dry: excess moisture pushes foliage over flowers. Very waterlogging-sensitive.
    soil_moisture_pct_fc: { 15: 0.0, 35: 0.5, 50: 0.75, 70: 1.0, 85: 1.0, 100: 0.85, 115: 0.5, 130: 0.15 },
  },

  nutrition_per_lb: {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
  },

  icon: { emoji: '🌺', color: '#FF6347' },

  stage_config: {
    stage_sequence: ['seed', 'germinated', 'vegetative', 'flowering', 'done'],
    productive_stages: [],
  },

  phenology: {
    base_temp_f: 50,
    ceiling_temp_f: 90,
    gdd_stages: { germinated: 40, vegetative: 100, flowering: 500, fruiting: 700, mature: 700 },
  },

  layout: {
    spacing: { in_row_in: 12, between_row_in: 12, equidistant_in: 12 },
    shade_tolerance: 'partial_shade',
    spread_in: 12,
    root_depth: 'medium',
    frost_tolerance: 'tender',
    kill_temp_f: 32,
    min_soil_temp_f: 55,
    planting_method: 'direct_sow',
    role: 'pest_control',
    needs_containment: false,
  },

  seed_cost_per_plant: 0.10,

  data_confidence: 'medium',
  sources: [
    {
      claim: 'trap crop retention model, management requirement',
      citation:
        'Holden et al. (2012) Designing an effective trap cropping strategy, Journal of Applied Ecology',
      url: 'https://besjournals.onlinelibrary.wiley.com/doi/full/10.1111/j.1365-2664.2012.02137.x',
    },
    {
      claim: 'aphid species on nasturtiums, pest host listing',
      citation: 'UC IPM - Managing Pests in Gardens: Nasturtium',
      url: 'https://ipm.ucanr.edu/PMG/GARDEN/FLOWERS/nasturtium.html',
    },
    {
      claim: 'spacing, growth habit, self-seeding',
      citation:
        'University of Wisconsin Extension - Nasturtium (Tropaeolum majus)',
      url: 'https://hort.extension.wisc.edu/articles/nasturtium-tropaeolum-majus/',
    },
  ],
};
