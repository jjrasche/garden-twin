import { PlantSpecies } from '../../types';
import { SOIL_COMPANION } from './shared-modifiers';

export const NASTURTIUM: PlantSpecies = {
  id: 'nasturtium',
  name: 'Nasturtium (Tropaeolum majus)',

  plants_per_sq_ft: 1.0,
  height_ft: 1.0,

  days_to_first_harvest: 45,
  harvest_type: 'continuous',

  baseline_lbs_per_plant: 0,
  germination_rate: 0.95,   // Large seeds; direct sow after frost
  establishment_rate: 0.95, // Frost-tender but planted post-frost

  modifiers: {
    sun: { 4: 0.4, 6: 0.8, 8: 1.0, 10: 1.0 },
    soil: SOIL_COMPANION,
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

  phenology: {
    base_temp_f: 50,
    gdd_stages: { vegetative: 100, flowering: 500, fruiting: 700, mature: 700 },
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
    pest_control: {
      repels: [],
      attracts_beneficial: [
        'hoverflies',      // larvae eat 200+ aphids each
        'lacewings',       // larvae are voracious aphid predators
        'predatory_wasps',
        'bees',
      ],
      // Hoverfly/lacewing foraging range, not aphid trap distance.
      // Aphids walk 3-12 m/hr; no garden-scale distance prevents movement.
      effective_radius_in: 72,
      is_trap_crop: true,
      // No evidence-based distance for aphid trap cropping (Holden 2012).
      // Aphids walk trivially between plants at any garden scale.
      // Value is primarily beneficial insect attraction, not aphid diversion.
      // Requires active management: remove heavily infested foliage
      // weekly to prevent colony spillover (retention management).
    },
    companions: [
      {
        target_species_id: 'tomato_sun_gold',
        effect: 'beneficial',
        // Primary value: hoverfly/lacewing attraction (aphid predators).
        // Secondary: aphid trap crop IF managed (remove infested foliage).
        mechanism: 'attracts hoverflies + lacewings (aphid predators); aphid trap crop with management',
      },
{
        target_species_id: 'tomato_amish_paste',
        effect: 'beneficial',
        mechanism: 'attracts hoverflies + lacewings (aphid predators); aphid trap crop with management',
      },
    ],
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
