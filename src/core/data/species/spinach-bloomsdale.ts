import { PlantSpecies } from '../../types';
import { SOIL_LIGHT_FEEDER } from './shared-modifiers';

export const SPINACH_BLOOMSDALE: PlantSpecies = {
  id: 'spinach_bloomsdale',
  name: 'Spinach (Bloomsdale Long Standing)',

  plants_per_sq_ft: 4.0,
  height_ft: 0.83,

  days_to_first_harvest: 45,
  harvest_type: 'cut_and_come_again',
  cut_and_come_again: {
    max_cuts: 6,
    regrowth_days: 10,
    // Spinach regrows well in cool weather; peaks at cuts 2-3.
    // Source: Cornell Extension — Bloomsdale produces 3-6 cuttings.
    cut_yield_curve: { 1: 0.8, 2: 1.0, 3: 1.0, 4: 0.8, 5: 0.6, 6: 0.4 },
  },

  // Research-validated: 0.20-0.40 lbs/plant range.
  // 0.28 is moderate for cut-and-come-again over 3-5 harvests.
  baseline_lbs_per_plant: 0.28,
  germination_rate: 0.90,   // Seeds benefit from cold stratification
  establishment_rate: 0.95, // Very cold-hardy once emerged

  modifiers: {
    // MONOTONIC — more DLI = more photosynthesis = more growth.
    // Spinach bolting is triggered by photoperiod (day length > 14hrs),
    // NOT by sun exposure intensity. A plant in shade experiences the
    // same 15-hour June day as one in full sun.
    // Same diffuse-light compensation as lettuce — low-light-saturation
    // crop benefits from Michigan's 15h summer photoperiod at 4h direct sun.
    sun: { 3: 0.67, 4: 0.82, 6: 0.9, 8: 1.0, 10: 1.0 },
    soil: SOIL_LIGHT_FEEDER,
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

  phenology: {
    base_temp_f: 35,
    gdd_stages: { vegetative: 80, flowering: 350, fruiting: 550, mature: 700 },
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
