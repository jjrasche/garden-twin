import { PlantSpecies } from '../../types';
import type { StageConfig, StressTolerances } from '../../types/PlantState';

export const LETTUCE_BSS: PlantSpecies = {
  id: 'lettuce_bss',
  name: 'Lettuce (Black Seeded Simpson)',

  plants_per_sq_ft: 2.78,
  height_ft: 0.58,

  germination_rate: 0.90,   // Small seeds need good soil contact
  establishment_rate: 0.95, // Hardy once emerged; slug pressure

  growth_response: [
    { factor: 'sun_hours', curve: { 3: 0.67, 4: 0.82, 6: 0.9, 8: 1.0, 10: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'temperature_f', curve: { 32: 0.0, 38: 0.1, 45: 0.5, 55: 0.8, 65: 1.0, 70: 1.0, 75: 0.7, 80: 0.3, 85: 0.0 }, effect: 'growth_rate' as const },
    { factor: 'soil_moisture_pct_fc', curve: { 20: 0.0, 40: 0.2, 60: 0.75, 80: 1.0, 95: 1.0, 110: 0.6, 130: 0.0 }, effect: 'growth_rate' as const },
    { factor: 'spacing_plants_per_sq_ft', curve: { 1.0: 1.1, 2.78: 1.0, 4.0: 0.8, 6.0: 0.5 }, effect: 'growth_rate' as const },
    // Lettuce bolting is gradual — driven by accumulated heat days, not a single-day threshold.
    // The growth_rate temp curve already drops to 0 at 85°F (no useful production in heat).
    // Actual plant death from heat is handled by stress_tolerances.heat (14 days above 85°F).
    // No population_survival curve — bolting is a stress accumulation, not an instant kill.
    { factor: 'N_ppm', curve: { 10: 0.7, 30: 1.0, 60: 1.0, 120: 0.8 }, effect: 'growth_rate' as const },
    { factor: 'P_ppm', curve: { 10: 0.8, 25: 1.0, 50: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'K_ppm', curve: { 40: 0.8, 100: 1.0, 180: 1.0 }, effect: 'growth_rate' as const },
    { factor: 'pH', curve: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 }, effect: 'growth_rate' as const },
    { factor: 'compaction_psi', curve: { 0: 1.0, 200: 0.9, 400: 0.7 }, effect: 'growth_rate' as const },
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
    soil: {
      N_ppm: { 10: 0.7, 30: 1.0, 60: 1.0, 120: 0.8 },
      P_ppm: { 10: 0.8, 25: 1.0, 50: 1.0 },
      K_ppm: { 40: 0.8, 100: 1.0, 180: 1.0 },
      pH: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 },
      compaction_psi: { 0: 1.0, 200: 0.9, 400: 0.7 },
    },
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
    stage_sequence: ['seed', 'germinated', 'vegetative', 'done'],
    productive_stages: ['vegetative'],
  } satisfies StageConfig,

  // Research: lettuce survives 13+ consecutive days above 86°F (ScienceDirect 2022).
  // Bolts (senescent) from accumulated heat well before death. Damage (tipburn, bitterness)
  // starts at 3 days; actual death at ~14 days sustained. The growth_rate curve already
  // drops production to near-zero above 80°F, so the plant is economically dead long before
  // biological death.
  stress_tolerances: {
    heat: { threshold: 85, direction: 'above', days_to_damage: 3, days_to_death: 14 },
  } satisfies StressTolerances,

  phenology: {
    base_temp_f: 40,
    ceiling_temp_f: 80,
    gdd_stages: { germinated: 20, vegetative: 100, flowering: 650, fruiting: 900, mature: 1100 },
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
    thin_at_stage: 'germinated',  // ~10-14 days, when 1-2" tall
    thin_at_height_in: 1.5,
  },

  seed_cost_per_plant: 0.02,

  data_confidence: 'high',
  // Flavor: bitterness (lactucin/sesquiterpene lactones) increases with heat stress.
  // Sugar decreases with heat. Sugar:SL ratio determines perceived flavor.
  // Sources: HortScience 2025, maritimegardening.substack.com, gardenerspath.com
  flavor_response: [
    { factor: 'temperature_f', curve: { 50: 0.1, 60: 0.15, 70: 0.3, 75: 0.5, 80: 0.8, 85: 1.0 }, compound: 'lactucin' },
    { factor: 'temperature_f', curve: { 50: 0.9, 60: 1.0, 65: 1.0, 70: 0.8, 75: 0.5, 80: 0.2, 85: 0.0 }, compound: 'sugar' },
  ],

  quality: {
    min_harvest_lbs: 0.05,
    freshness_curve: { 0: 1.0, 3: 0.8, 5: 0.4, 7: 0.1 },
    must_harvest_floor: 0.3,
  },

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
