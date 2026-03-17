import { PlantSpecies } from '../../types';
import type { StageConfig, StressTolerances } from '../../types/PlantState';
import { SOIL_LIGHT_FEEDER, SOIL_LIGHT_FEEDER_RESPONSES } from './shared-modifiers';

export const LETTUCE_BSS: PlantSpecies = {
  id: 'lettuce_bss',
  name: 'Lettuce (Black Seeded Simpson)',

  plants_per_sq_ft: 2.78,
  height_ft: 0.58,

  days_to_first_harvest: 28,
  germination_rate: 0.90,   // Small seeds need good soil contact
  establishment_rate: 0.95, // Hardy once emerged; slug pressure

  growth_response: [
    { factor: 'sun_hours', curve: { 3: 0.67, 4: 0.82, 6: 0.9, 8: 1.0, 10: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'temperature_f', curve: { 32: 0.0, 38: 0.1, 45: 0.5, 55: 0.8, 65: 1.0, 70: 1.0, 75: 0.7, 80: 0.3, 85: 0.0 }, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: { 20: 0.0, 40: 0.2, 60: 0.75, 80: 1.0, 95: 1.0, 110: 0.6, 130: 0.0 }, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 1.0: 1.1, 2.78: 1.0, 4.0: 0.8, 6.0: 0.5 }, effect: 'growth_rate' as const },
    ...SOIL_LIGHT_FEEDER_RESPONSES,
  ],

  modifiers: {
    // MONOTONIC — more DLI = more photosynthesis = more growth.
    // Bolting is triggered by photoperiod (day length > 12hrs) + temperature
    // (> 70-75F), NOT by sun exposure intensity. Shade does NOT change day
    // length — it only reduces temperature slightly.
    // Agrivoltaic research (ScienceDirect 2012): lettuce at 75% radiation
    // achieves 80%+ yield via increased leaf area. Diffuse light during
    // Michigan's 15h summer photoperiod supplements direct sun hours.
    sun: { 3: 0.67, 4: 0.82, 6: 0.9, 8: 1.0, 10: 1.0 },
    soil: SOIL_LIGHT_FEEDER,
    spacing_plants_per_sq_ft: { 1.0: 1.1, 2.78: 1.0, 4.0: 0.8, 6.0: 0.5 },
    // Lettuce bolting is primarily temperature-driven. Molecular evidence:
    // LsMYB15 and LsARF3 mediate thermally induced bolting (Frontiers in
    // Plant Science 2022). Photoperiod amplifies but isn't required.
    // >75°F avg high: stress begins. >80°F: rapid bolting. >85°F: also
    // causes thermoinhibition of seed germination (NC State Extension).
    // Below 40°F: near-dormant but alive (kill_temp 28°F). Optimal 55-70°F.
    // Above 80°F: rapid bolting, bitter leaves. 85°F: crop failure.
    temperature_f: { 32: 0.0, 38: 0.1, 45: 0.5, 55: 0.8, 65: 1.0, 70: 1.0, 75: 0.7, 80: 0.3, 85: 0.0 },
    // FAO p=0.30, Ky~1.0. Shallow roots — very waterlogging-sensitive.
    // Optimal 75-95% FC. Sources: FAO 56 Table 22, PMC10974498.
    soil_moisture_pct_fc: { 20: 0.0, 40: 0.2, 60: 0.75, 80: 1.0, 95: 1.0, 110: 0.6, 130: 0.0 },
  },

  nutrition_per_lb: {
    calories: 50,
    protein_g: 5,
    carbs_g: 10,
    fat_g: 0.7,
    fiber_g: 5,
  },

  icon: { emoji: '🥬', color: '#7BC67E' },

  stage_config: {
    stage_sequence: ['seed', 'vegetative', 'done'],
    productive_stages: ['vegetative'],
  } satisfies StageConfig,

  stress_tolerances: {
    heat: { threshold: 85, direction: 'above', days_to_damage: 2, days_to_death: 5 },
  } satisfies StressTolerances,

  phenology: {
    base_temp_f: 40,
    gdd_stages: { vegetative: 100, flowering: 650, fruiting: 900, mature: 1100 },
  },

  layout: {
    spacing: { in_row_in: 6, between_row_in: 12, equidistant_in: 6 },
    shade_tolerance: 'shade_preferred',
    spread_in: 10,
    root_depth: 'shallow',
    frost_tolerance: 'semi_hardy',
    kill_temp_f: 28,
    min_soil_temp_f: 35,
    planting_method: 'direct_sow',
    role: 'food_crop',
    needs_containment: false,
  },

  seed_cost_per_plant: 0.02,

  data_confidence: 'high',
  sources: [
    {
      claim: 'yield, spacing, days to harvest',
      citation:
        'University of Maryland Extension — Growing Lettuce in the Home Garden',
      url: 'https://extension.umd.edu/',
    },
    {
      claim: 'nutrition',
      citation: 'USDA FoodData Central — Lettuce, green leaf, raw',
      url: 'https://fdc.nal.usda.gov/',
    },
  ],
};
