import { HarvestStrategy } from '../types/HarvestStrategy';

/**
 * Harvest strategies for food-producing species.
 *
 * Companion plants (marigold, nasturtium, calendula) have no harvest strategy
 * because they produce no food yield.
 *
 * Values extracted from species data files during Phase 2 restructure.
 * baseline_lbs_per_plant and cut parameters now live here instead of PlantSpecies.
 */

export const HARVEST_CORN_SHELL_DRY: HarvestStrategy = {
  id: 'corn_shell_dry',
  type: 'bulk',
  baseline_lbs_per_plant: 0.24,
  maturity_indicator: 'husk_dry',
};

export const HARVEST_POTATO_CELLAR: HarvestStrategy = {
  id: 'potato_cellar',
  type: 'bulk',
  baseline_lbs_per_plant: 1.5,
  maturity_indicator: 'vine_die_back',
};

export const HARVEST_TOMATO_CHERRY_FRESH: HarvestStrategy = {
  id: 'tomato_cherry_fresh',
  type: 'continuous',
  baseline_lbs_per_plant: 10.0,
  pick_frequency_days: 3,
};

export const HARVEST_TOMATO_PASTE_CAN: HarvestStrategy = {
  id: 'tomato_paste_can',
  type: 'continuous',
  baseline_lbs_per_plant: 15.0,
  pick_frequency_days: 3,
  processing: [
    {
      activity_id: 'can_marinara',
      name: 'Can marinara sauce',
      input_lbs_per_batch: 21,
      output_per_batch: 7,
      output_unit: 'quart',
      duration_minutes_per_batch: 240,
      equipment: [
        'large stockpot (16+ qt)',
        'food mill or immersion blender',
        'canning jars (quart)',
        'lids and bands',
        'water bath canner',
        'jar lifter',
        'ladle',
        'wide-mouth funnel',
      ],
      skill_level: 'intermediate',
      instructions: 'Wash and core tomatoes. Blanch 60s, ice bath, slip skins. Crush in pot, bring to boil. Add 2 tbsp lemon juice per quart. Simmer 30-45 min. Mill or blend. Fill hot jars leaving 1/2" headspace. Process in boiling water bath 45 min for quarts.',
      storage_method: 'canned_shelf',
      storage_volume_per_unit: '1 quart jar',
      shelf_life_months: 18,
    },
  ],
};

export const HARVEST_LETTUCE_CUT: HarvestStrategy = {
  id: 'lettuce_cut',
  type: 'cut_and_come_again',
  baseline_lbs_per_plant: 0.5,
  max_cuts: 4,
  regrowth_days: 14,
  cut_yield_curve: { 1: 1.0, 2: 0.8, 3: 0.6, 4: 0.4 },
};

export const HARVEST_KALE_CUT: HarvestStrategy = {
  id: 'kale_cut',
  type: 'cut_and_come_again',
  baseline_lbs_per_plant: 1.75,
  // No max_cuts — biennial kale produces indefinitely until bolt (year 2) or hard freeze.
  // Death comes from frost (kill_temp 10°F via probabilistic model), not cut exhaustion.
  // Sources: gardenerspath.com, foxrunenvironmentaleducationcenter.org
  regrowth_days: 14,
  // Vigor is flat at 1.0 — kale yield decline is environmental (temperature),
  // NOT cut-number-based. Collard study: 174% leaf recovery at 21 days with
  // 50% harvest (Tuskegee PAWJ). Mild ramp on first cut (small plant).
  // Seasonal decline handled by growth_mod from temperature curve.
  cut_yield_curve: {
    1: 0.7, 2: 0.9, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0, 7: 1.0, 8: 1.0,
    9: 1.0, 10: 1.0, 11: 1.0, 12: 1.0, 13: 1.0, 14: 1.0, 15: 1.0,
    16: 1.0, 17: 1.0, 18: 1.0, 19: 1.0, 20: 1.0,
  },
};

export const HARVEST_SPINACH_CUT: HarvestStrategy = {
  id: 'spinach_cut',
  type: 'cut_and_come_again',
  baseline_lbs_per_plant: 0.28,
  max_cuts: 6,
  regrowth_days: 10,
  // Gentler taper — bolting (population_survival on photoperiod) handles the
  // real decline. Cut-based decline is minor for spinach. Portland trial:
  // 5+ cuts with regenerative technique over 9 weeks.
  cut_yield_curve: { 1: 0.8, 2: 1.0, 3: 1.0, 4: 0.9, 5: 0.8, 6: 0.7 },
};

/** All harvest strategies indexed by id. */
export const HARVEST_STRATEGIES: Map<string, HarvestStrategy> = new Map([
  [HARVEST_CORN_SHELL_DRY.id, HARVEST_CORN_SHELL_DRY],
  [HARVEST_POTATO_CELLAR.id, HARVEST_POTATO_CELLAR],
  [HARVEST_TOMATO_CHERRY_FRESH.id, HARVEST_TOMATO_CHERRY_FRESH],
  [HARVEST_TOMATO_PASTE_CAN.id, HARVEST_TOMATO_PASTE_CAN],
  [HARVEST_LETTUCE_CUT.id, HARVEST_LETTUCE_CUT],
  [HARVEST_KALE_CUT.id, HARVEST_KALE_CUT],
  [HARVEST_SPINACH_CUT.id, HARVEST_SPINACH_CUT],
]);

/** Default harvest strategy for each species. */
export const DEFAULT_HARVEST_STRATEGY: Record<string, string> = {
  corn_nothstine_dent: 'corn_shell_dry',
  potato_kennebec: 'potato_cellar',
  tomato_sun_gold: 'tomato_cherry_fresh',
  tomato_amish_paste: 'tomato_paste_can',
  lettuce_bss: 'lettuce_cut',
  kale_red_russian: 'kale_cut',
  spinach_bloomsdale: 'spinach_cut',
};
