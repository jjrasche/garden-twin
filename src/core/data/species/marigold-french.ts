import { PlantSpecies } from '../../types';

export const MARIGOLD_FRENCH: PlantSpecies = {
  id: 'marigold_french',
  name: 'French Marigold (Tagetes patula)',

  plants_per_sq_ft: 1.78,
  height_ft: 1.5,

  germination_rate: 0.95,   // Reliable germinator
  establishment_rate: 0.95, // Hardy annual, low pest pressure

  growth_response: [
    { factor: 'sun_hours', curve: { 4: 0.3, 6: 0.8, 8: 1.0, 10: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: { 15: 0.0, 40: 0.35, 60: 0.65, 80: 0.95, 100: 1.0, 115: 0.85, 130: 0.4 }, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 0.8: 1.1, 1.78: 1.0, 3.0: 0.8, 4.0: 0.5 }, effect: 'growth_rate' as const },
    { factor: 'N_ppm', curve: { 10: 0.8, 30: 1.0, 80: 1.0, 150: 0.9 }, effect: 'growth_rate' as const },
    { factor: 'P_ppm', curve: { 10: 0.8, 25: 1.0, 50: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'K_ppm', curve: { 40: 0.8, 100: 1.0, 180: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'pH', curve: { 5.5: 0.8, 6.5: 1.0, 7.5: 1.0, 8.0: 0.8 }, effect: 'growth_rate' as const },
    { factor: 'compaction_psi', curve: { 0: 1.0, 200: 0.95, 400: 0.8 }, effect: 'growth_rate' as const },
  ],

  modifiers: {
    sun: { 4: 0.3, 6: 0.8, 8: 1.0, 10: 1.0 },
    soil: {
      N_ppm: { 10: 0.8, 30: 1.0, 80: 1.0, 150: 0.9 },
      P_ppm: { 10: 0.8, 25: 1.0, 50: 1.0 },
      K_ppm: { 40: 0.8, 100: 1.0, 180: 1.0 },
      pH: { 5.5: 0.8, 6.5: 1.0, 7.5: 1.0, 8.0: 0.8 },
      compaction_psi: { 0: 1.0, 200: 0.95, 400: 0.8 },
    },
    spacing_plants_per_sq_ft: { 0.8: 1.1, 1.78: 1.0, 3.0: 0.8, 4.0: 0.5 },
    // Moderate drought tolerance; flower weight -38% at 60% FC (Riaz 2013).
    // Low waterlogging tolerance: Pythium root rot within 36-48h. Sources: NC State, UC IPM.
    soil_moisture_pct_fc: { 15: 0.0, 40: 0.35, 60: 0.65, 80: 0.95, 100: 1.0, 115: 0.85, 130: 0.4 },
  },

  nutrition_per_lb: {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
  },

  icon: { emoji: '🌼', color: '#FF8C00' },

  stage_config: {
    stage_sequence: ['seed', 'germinated', 'vegetative', 'flowering', 'done'],
    productive_stages: [],
  },

  phenology: {
    base_temp_f: 50,
    ceiling_temp_f: 95,
    gdd_stages: { germinated: 40, vegetative: 100, flowering: 600, fruiting: 800, mature: 800 },
  },

  layout: {
    spacing: { in_row_in: 8, between_row_in: 8, equidistant_in: 8 },
    shade_tolerance: 'full_sun',
    spread_in: 10,
    root_depth: 'shallow',
    frost_tolerance: 'tender',
    kill_temp_f: 32,
    min_soil_temp_f: 65,
    planting_method: 'direct_sow',
    role: 'pest_control',
    needs_containment: false,
  },

  seed_cost_per_plant: 0.05,

  data_confidence: 'medium',
  sources: [
    {
      claim: 'nematode suppression mechanism — rhizosphere only',
      citation:
        'UF/IFAS Extension — Marigolds for Nematode Management; University of Hawaii — Using Marigold as Alternative to Chemical Nematicides',
      url: 'https://edis.ifas.ufl.edu/publication/NG045',
    },
    {
      claim: 'spacing, growth habit',
      citation:
        'University of Wisconsin-Madison Extension — Marigold (Tagetes)',
      url: 'https://hort.extension.wisc.edu/',
    },
  ],
};
