import { SoilModifiers } from '../../types';
import type { GrowthResponse } from '../../types/PlantSpecies';

// ---------------------------------------------------------------------------
// Shared soil modifier presets
// ---------------------------------------------------------------------------

/** Heavy feeders benefit strongly from nitrogen; no penalty at high levels. */
export const SOIL_HEAVY_FEEDER: SoilModifiers = {
  N_ppm: { 20: 0.6, 50: 1.0, 100: 1.3, 150: 1.3 },
  P_ppm: { 10: 0.7, 30: 1.0, 60: 1.2 },
  K_ppm: { 50: 0.7, 120: 1.0, 200: 1.1 },
  pH: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 },
  compaction_psi: { 0: 1.0, 200: 0.9, 400: 0.7 },
};

/** Light feeders plateau quickly on N; excess causes rank growth. */
export const SOIL_LIGHT_FEEDER: SoilModifiers = {
  N_ppm: { 10: 0.7, 30: 1.0, 60: 1.0, 120: 0.8 },
  P_ppm: { 10: 0.8, 25: 1.0, 50: 1.0 },
  K_ppm: { 40: 0.8, 100: 1.0, 180: 1.0 },
  pH: { 5.5: 0.7, 6.5: 1.0, 7.5: 0.9, 8.0: 0.7 },
  compaction_psi: { 0: 1.0, 200: 0.9, 400: 0.7 },
};

/** Convert SoilModifiers to GrowthResponse[] for growth_response arrays. */
function soilToResponses(soil: SoilModifiers): GrowthResponse[] {
  return [
    { factor: 'N_ppm', curve: soil.N_ppm, effect: 'growth_rate' },
    { factor: 'P_ppm', curve: soil.P_ppm, effect: 'growth_rate' },
    { factor: 'K_ppm', curve: soil.K_ppm, effect: 'growth_rate' },
    { factor: 'pH', curve: soil.pH, effect: 'growth_rate' },
    { factor: 'compaction_psi', curve: soil.compaction_psi, effect: 'growth_rate' },
  ];
}

export const SOIL_HEAVY_FEEDER_RESPONSES = soilToResponses(SOIL_HEAVY_FEEDER);
export const SOIL_LIGHT_FEEDER_RESPONSES = soilToResponses(SOIL_LIGHT_FEEDER);

/** Companion / non-food plants — minimal nutrient sensitivity. */
export const SOIL_COMPANION: SoilModifiers = {
  N_ppm: { 10: 0.8, 30: 1.0, 80: 1.0, 150: 0.9 },
  P_ppm: { 10: 0.8, 25: 1.0, 50: 1.0 },
  K_ppm: { 40: 0.8, 100: 1.0, 180: 1.0 },
  pH: { 5.5: 0.8, 6.5: 1.0, 7.5: 1.0, 8.0: 0.8 },
  compaction_psi: { 0: 1.0, 200: 0.95, 400: 0.8 },
};

export const SOIL_COMPANION_RESPONSES = soilToResponses(SOIL_COMPANION);

// ---------------------------------------------------------------------------
// Shared tomato constants
// ---------------------------------------------------------------------------

/** Shared companion entries for all three tomato cultivars. */
export const TOMATO_COMPANIONS = [
  {
    target_species_id: 'marigold_french',
    effect: 'beneficial' as const,
    mechanism: 'visual pest confusion, pollinator attraction near tomatoes',
    max_distance_in: 18,
  },
  {
    target_species_id: 'nasturtium',
    effect: 'beneficial' as const,
    // Primary value: hoverfly/lacewing attraction (aphid predators).
    // No evidence-based separation distance for aphids (Holden 2012).
    // Requires management: remove heavily infested nasturtium foliage weekly.
    mechanism: 'attracts hoverflies + lacewings near tomatoes; aphid trap crop with management',
  },
  {
    target_species_id: 'corn_nothstine_dent',
    effect: 'beneficial' as const,
    // Corn silks are preferred earworm oviposition site, diverting moths
    // from tomato fruit during silking (Purdue Extension E-31). No
    // evidence-based separation distance: moths fly 30+ km/night.
    mechanism: 'corn silks divert earworm moths during silking period',
    max_distance_in: 240,
  },
  {
    target_species_id: 'potato_kennebec',
    effect: 'beneficial' as const,
    // Late blight sporangia travel 10-60 km on wind (Penn State Extension).
    // Within-garden separation provides zero protection. Shared disease
    // susceptibility managed by monitoring (USABlight.org), resistant
    // varieties, and preventive fungicide -- not distance.
    mechanism: 'shared blight susceptibility managed by monitoring, not distance',
    max_distance_in: 240,
  },
];

/** Shared tomato moisture — paste types slightly more drought-sensitive than cherry.
  * FAO p=0.40, Ky=1.05. BER risk below 55% FC. Waterlogging: Phytophthora within 4-8h.
  * Sources: FAO Paper 33/56, Zhu et al. 2019 (PMC6436690), Vegetable Research 2023. */
export const TOMATO_MOISTURE_PASTE = { 20: 0.0, 40: 0.25, 55: 0.6, 70: 0.92, 80: 1.0, 90: 1.0, 100: 0.8, 115: 0.5, 130: 0.1 };

/** Cherry tomatoes: better osmotic adjustment than paste (PMC8720120).
  * Shifted drought-tolerant ~+0.05-0.10 on dry end, same waterlogging response. */
export const TOMATO_MOISTURE_CHERRY = { 20: 0.0, 40: 0.3, 55: 0.7, 70: 0.95, 80: 1.0, 90: 1.0, 100: 0.8, 115: 0.5, 130: 0.1 };

/** Shared tomato sun modifiers — monotonic (more DLI = more fruit). */
export const TOMATO_SUN = { 4: 0.2, 6: 0.6, 8: 1.0, 10: 1.0 };

/** Shared tomato temperature response. Fruit set fails <55°F night / >92°F day.
  * Pollen sterility at 95°F+. Sources: Purdue Extension, UC Davis. */
export const TOMATO_TEMPERATURE = { 50: 0.0, 60: 0.5, 70: 0.9, 80: 1.0, 90: 0.7, 95: 0.3, 100: 0.0 };

/** Shared tomato nutrition per lb (fresh weight). */
export const TOMATO_NUTRITION = {
  calories: 90,
  protein_g: 4,
  carbs_g: 18,
  fat_g: 0.9,
  fiber_g: 5.4,
};

/** Shared tomato layout base (all trained on trellis, 18" in-row spacing). */
export const TOMATO_LAYOUT_BASE = {
  spacing: { in_row_in: 18, between_row_in: 36 },
  shade_tolerance: 'full_sun' as const,
  spread_in: 28,
  root_depth: 'deep' as const,
  frost_tolerance: 'tender' as const,
  kill_temp_f: 33,
  min_soil_temp_f: 60,
  planting_method: 'transplant' as const,
  role: 'food_crop' as const,
  needs_containment: false,
  companions: TOMATO_COMPANIONS,
};

export const TOMATO_SOURCES = [
  {
    claim: 'nutrition',
    citation: 'USDA FoodData Central — Tomatoes, red, ripe, raw',
    url: 'https://fdc.nal.usda.gov/',
  },
  {
    claim: 'companion planting — blight and earworm distance',
    citation:
      'Penn State Extension — Late Blight of Potato and Tomato; UMN Extension — Corn Earworm',
    url: 'https://extension.psu.edu/',
  },
];
