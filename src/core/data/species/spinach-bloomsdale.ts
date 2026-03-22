import { PlantSpecies } from '../../types';
import type { StageConfig, StressTolerances } from '../../types/PlantState';

export const SPINACH_BLOOMSDALE: PlantSpecies = {
  id: 'spinach_bloomsdale',
  name: 'Spinach (Bloomsdale Long Standing)',

  plants_per_sq_ft: 4.0,
  height_ft: 0.83,

  germination_rate: 0.90,   // Seeds benefit from cold stratification
  establishment_rate: 0.95, // Very cold-hardy once emerged

  growth_response: [
    { factor: 'sun_hours', curve: { 3: 0.67, 4: 0.82, 6: 0.9, 8: 1.0, 10: 1.0 }, effect: 'growth_rate' as const },
    // Cool-season crop: optimal 50-60°F, good to 75°F, stress above 80°F.
    // Sources: UNH Extension, Fedco Seeds. Germinates poorly above 85°F soil temp.
    { factor: 'temperature_f', curve: { 28: 0.0, 35: 0.2, 45: 0.7, 55: 1.0, 65: 0.9, 75: 0.6, 80: 0.2, 85: 0.0 }, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: { 20: 0.0, 40: 0.1, 60: 0.65, 80: 1.0, 90: 0.95, 100: 0.75, 120: 0.0 }, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 2.0: 1.1, 4.0: 1.0, 6.0: 0.8, 9.0: 0.5 }, effect: 'growth_rate' as const },
    { factor: 'N_ppm', curve: { 10: 0.7, 30: 1.0, 60: 1.0, 120: 0.8 }, effect: 'growth_rate' as const },
    { factor: 'P_ppm', curve: { 10: 0.8, 25: 1.0, 50: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'K_ppm', curve: { 40: 0.8, 100: 1.0, 180: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'pH', curve: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 }, effect: 'growth_rate' as const },
    { factor: 'compaction_psi', curve: { 0: 1.0, 200: 0.9, 400: 0.7 }, effect: 'growth_rate' as const },
    { factor: 'photoperiod_h', curve: { 10: 1.0, 13: 1.0, 14: 0.6, 14.5: 0.3, 15: 0.1, 16: 0.0 }, effect: 'population_survival' as const, name: 'bolt' },
    { factor: 'photoperiod_h', curve: { 10: 0.6, 12: 0.8, 13: 1.0, 14: 1.4, 15: 2.0 }, effect: 'development_rate' as const, name: 'photoperiod_development', active_stages: ['vegetative', 'flowering'] },
  ],

  modifiers: {
    // MONOTONIC — more DLI = more photosynthesis = more growth.
    // Spinach bolting is triggered by photoperiod (day length > 14hrs),
    // NOT by sun exposure intensity. A plant in shade experiences the
    // same 15-hour June day as one in full sun.
    // Same diffuse-light compensation as lettuce — low-light-saturation
    // crop benefits from Michigan's 15h summer photoperiod at 4h direct sun.
    sun: { 3: 0.67, 4: 0.82, 6: 0.9, 8: 1.0, 10: 1.0 },
    soil: {
      N_ppm: { 10: 0.7, 30: 1.0, 60: 1.0, 120: 0.8 },
      P_ppm: { 10: 0.8, 25: 1.0, 50: 1.0 },
      K_ppm: { 40: 0.8, 100: 1.0, 180: 1.0 },
      pH: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 },
      compaction_psi: { 0: 1.0, 200: 0.9, 400: 0.7 },
    },
    spacing_plants_per_sq_ft: { 2.0: 1.1, 4.0: 1.0, 6.0: 0.8, 9.0: 0.5 },
    // Spinach bolting is photoperiod-driven — a threshold event that kills
    // individual plants, not a yield scaler. Long-day plant: >14h triggers
    // flowering in 40-60% of Bloomsdale (bolt-resistant) plants; >15h kills
    // the crop. Research: 0% bolt at 10h, critical threshold 13-15h, 85%+ at
    // 16h (Chun et al. 2000, HortScience 35:624). Bloomsdale curve shifted
    // right ~1h vs standard varieties.
    // FAO p=0.20 — most drought-sensitive vegetable. Optimal 65-85% FC.
    // Excess moisture (>85% FC) impairs N uptake. Sources: FAO 56, MDPI Agronomy 13/3/657.
    soil_moisture_pct_fc: { 20: 0.0, 40: 0.1, 60: 0.65, 80: 1.0, 90: 0.95, 100: 0.75, 120: 0.0 },
    bolt_trigger: {
      condition: 'photoperiod_h',
      // Fraction of population that SURVIVES (non-bolted) at given day length
      survival_curve: { 10: 1.0, 13: 1.0, 14: 0.6, 14.5: 0.3, 15: 0.1, 16: 0.0 },
    },
  },

  nutrition_per_lb: {
    calories: 105,
    protein_g: 13,
    carbs_g: 16,
    fat_g: 1.8,
    fiber_g: 10,
  },

  icon: { emoji: '🥬', color: '#2E8B57' },

  stage_config: {
    stage_sequence: ['seed', 'germinated', 'vegetative', 'done'],
    productive_stages: ['vegetative'],
  } satisfies StageConfig,

  stress_tolerances: {
    drought: { threshold: 25, direction: 'below', days_to_damage: 3, days_to_death: 7 },
    heat: { threshold: 85, direction: 'above', days_to_damage: 2, days_to_death: 5 },
  } satisfies StressTolerances,

  phenology: {
    base_temp_f: 35,
    ceiling_temp_f: 80,
    gdd_stages: { germinated: 20, vegetative: 80, flowering: 350, fruiting: 550, mature: 700 },
  },

  layout: {
    spacing: { in_row_in: 6, between_row_in: 12, equidistant_in: 6 },
    shade_tolerance: 'shade_preferred',
    spread_in: 7,
    root_depth: 'shallow',
    frost_tolerance: 'very_hardy',
    kill_temp_f: 15,
    min_soil_temp_f: 35,
    planting_method: 'direct_sow',
    role: 'food_crop',
    needs_containment: false,
  },

  seed_cost_per_plant: 0.02,

  // Flavor: spinach sweetness increases with cold like kale. Heat makes it bitter
  // (oxalic acid increases). Best flavor in fall when temps are 40-55°F.
  flavor_response: [
    { factor: 'temperature_f', curve: { 25: 0.9, 35: 0.95, 45: 1.0, 55: 0.8, 65: 0.5, 75: 0.2, 85: 0.0 }, compound: 'sugar' },
    { factor: 'temperature_f', curve: { 25: 0.0, 35: 0.05, 45: 0.1, 55: 0.2, 65: 0.4, 75: 0.7, 85: 1.0 }, compound: 'bitterness' },
  ],

  data_confidence: 'high',
  sources: [
    {
      claim: 'yield, spacing, bolt resistance',
      citation:
        'Cornell University Extension — Spinach for the Home Garden',
      url: 'https://gardening.cals.cornell.edu/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central — Spinach, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
