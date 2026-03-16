import { PlantSpecies } from '../../types';
import { SOIL_COMPANION } from './shared-modifiers';

export const MARIGOLD_FRENCH: PlantSpecies = {
  id: 'marigold_french',
  name: 'French Marigold (Tagetes patula)',

  plants_per_sq_ft: 1.78,
  height_ft: 1.5,

  days_to_first_harvest: 55,
  harvest_type: 'continuous',

  baseline_lbs_per_plant: 0,
  germination_rate: 0.95,   // Reliable germinator
  establishment_rate: 0.95, // Hardy annual, low pest pressure

  modifiers: {
    sun: { 4: 0.3, 6: 0.8, 8: 1.0, 10: 1.0 },
    soil: SOIL_COMPANION,
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

  phenology: {
    base_temp_f: 50,
    gdd_stages: { vegetative: 100, flowering: 600, fruiting: 800, mature: 800 },
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
    pest_control: {
      // Nematode suppression only works within rhizosphere (3-7" from roots).
      // Interplanted marigolds provide visual pest confusion and pollinator
      // attraction, NOT broadcast nematode suppression. Cover-crop protocol
      // (20 plants/m², 2-4 months) required for actual nematode control.
      repels: ['aphids', 'whiteflies'],
      attracts_beneficial: ['ladybugs', 'hoverflies'],
      effective_radius_in: 7,
      is_trap_crop: false,
    },
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
