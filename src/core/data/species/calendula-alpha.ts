import { PlantSpecies } from '../../types';
import { SOIL_COMPANION, SOIL_COMPANION_RESPONSES } from './shared-modifiers';

export const CALENDULA: PlantSpecies = {
  id: 'calendula',
  name: 'Calendula (Calendula officinalis)',

  plants_per_sq_ft: 1.44,
  height_ft: 2,

  days_to_first_harvest: 40,
  germination_rate: 0.95,   // Reliable germinator
  establishment_rate: 0.95, // Semi-hardy; tolerates light frost

  growth_response: [
    { factor: 'sun_hours', curve: { 4: 0.5, 6: 0.8, 8: 1.0, 10: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: { 15: 0.0, 35: 0.4, 50: 0.65, 75: 1.0, 100: 1.0, 115: 0.7, 130: 0.25 }, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 0.7: 1.1, 1.44: 1.0, 2.5: 0.8, 4.0: 0.5 }, effect: 'growth_rate' as const },
    ...SOIL_COMPANION_RESPONSES,
  ],

  modifiers: {
    sun: { 4: 0.5, 6: 0.8, 8: 1.0, 10: 1.0 },
    soil: SOIL_COMPANION,
    spacing_plants_per_sq_ft: { 0.7: 1.1, 1.44: 1.0, 2.5: 0.8, 4.0: 0.5 },
    // Moderate drought tolerance. Flower mass +18% at 75% FC vs 100% FC (Moalem 2023).
    // -38% flower weight at 30% FC (Sardoei 2025). Root rot in wet soil (Asteraceae).
    soil_moisture_pct_fc: { 15: 0.0, 35: 0.4, 50: 0.65, 75: 1.0, 100: 1.0, 115: 0.7, 130: 0.25 },
  },

  nutrition_per_lb: {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
  },

  icon: { emoji: '🌼', color: '#FFD700' },

  stage_config: {
    stage_sequence: ['seed', 'germinated', 'vegetative', 'flowering', 'done'],
    productive_stages: [],
  },

  phenology: {
    base_temp_f: 40,
    gdd_stages: { germinated: 30, vegetative: 80, flowering: 600, fruiting: 800, mature: 800 },
  },

  layout: {
    spacing: { in_row_in: 10, between_row_in: 12, equidistant_in: 10 },
    shade_tolerance: 'partial_shade',
    spread_in: 18,
    root_depth: 'shallow',
    frost_tolerance: 'semi_hardy',
    kill_temp_f: 25,
    min_soil_temp_f: 60,
    planting_method: 'direct_sow',
    role: 'pest_control',
    needs_containment: false,
  },

  seed_cost_per_plant: 0.05,

  data_confidence: 'medium',
  sources: [
    {
      claim: 'beneficial insect attraction',
      citation:
        'Fiedler et al. (2008) — Maximizing ecosystem services from conservation biological control, Biological Control',
      url: 'https://doi.org/10.1016/j.biocontrol.2008.02.014',
    },
    {
      claim: 'spacing, frost tolerance',
      citation:
        'University of Wisconsin-Madison Extension — Calendula',
      url: 'https://hort.extension.wisc.edu/',
    },
  ],
};
