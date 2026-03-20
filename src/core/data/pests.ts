/**
 * Pest catalog, crop vulnerabilities, and companion benefits.
 *
 * This is the single source of truth for the Companion → Pest → Crop chain.
 * Species files no longer need to embed companion relationships or pest_control
 * data — that information lives here as normalized, queryable data.
 *
 * Data extracted from existing species files + extension sources:
 *   - Marigold: UF/IFAS Extension NG045 (nematode suppression)
 *   - Nasturtium: Holden 2012 (aphid trap cropping evidence gaps)
 *   - Cabbage moth: MSU Extension E-312
 *   - Colorado potato beetle: Purdue Extension E-96
 *   - Corn earworm: UMN Extension, Purdue Extension E-31
 *   - Late blight: Penn State Extension (sporangia dispersal 10-60 km)
 */

import type { Pest, CropVulnerability, CompanionBenefit } from '../types/Pest';

// ---------------------------------------------------------------------------
// Pests
// ---------------------------------------------------------------------------

export const CABBAGE_MOTH: Pest = {
  id: 'cabbage_moth',
  name: 'Cabbage White Butterfly (Pieris rapae)',
  type: 'insect',
  active_months: [4, 5, 6, 7, 8, 9, 10],
  detection_method: 'White butterflies hovering over brassicas; green larvae on leaf undersides',
  damage_description: 'Larvae chew irregular holes in leaves, heavy defoliation of young plants',
};

export const APHID: Pest = {
  id: 'aphid',
  name: 'Aphid (multiple species)',
  type: 'insect',
  active_months: [4, 5, 6, 7, 8, 9, 10],
  detection_method: 'Clusters on new growth, leaf undersides; sticky honeydew on leaves; ants farming colonies',
  damage_description: 'Curled/yellowed leaves, stunted growth, sooty mold on honeydew, virus transmission',
};

export const COLORADO_POTATO_BEETLE: Pest = {
  id: 'colorado_potato_beetle',
  name: 'Colorado Potato Beetle (Leptinotarsa decemlineata)',
  type: 'insect',
  active_months: [5, 6, 7, 8],
  detection_method: 'Yellow-orange eggs on leaf undersides; striped adults on foliage',
  damage_description: 'Complete defoliation of potato plants, larvae and adults both feed',
};

export const CORN_EARWORM: Pest = {
  id: 'corn_earworm',
  name: 'Corn Earworm / Tomato Fruitworm (Helicoverpa zea)',
  type: 'insect',
  active_months: [6, 7, 8, 9],
  detection_method: 'Frass at corn silk entry point; larvae inside ear tips or tomato fruit',
  damage_description: 'Larvae bore into corn ears from silk end; tunnel into tomato fruit near stem',
};

export const WHITEFLY: Pest = {
  id: 'whitefly',
  name: 'Whitefly (Trialeurodes vaporariorum)',
  type: 'insect',
  active_months: [5, 6, 7, 8, 9],
  detection_method: 'Tiny white insects fly up when foliage disturbed; sticky honeydew',
  damage_description: 'Yellowed leaves, stunted growth, honeydew and sooty mold',
};

export const ROOT_KNOT_NEMATODE: Pest = {
  id: 'root_knot_nematode',
  name: 'Root-knot Nematode (Meloidogyne spp.)',
  type: 'nematode',
  active_months: [5, 6, 7, 8, 9, 10],
  detection_method: 'Stunted growth with no visible pest; galled/knotted roots on excavation',
  damage_description: 'Root galls restrict nutrient uptake, wilting despite adequate water, yield loss',
};

export const LATE_BLIGHT: Pest = {
  id: 'late_blight',
  name: 'Late Blight (Phytophthora infestans)',
  type: 'fungal',
  active_months: [6, 7, 8, 9],
  detection_method: 'Dark water-soaked lesions on leaves; white fuzzy growth on undersides in humid conditions; check USABlight.org',
  damage_description: 'Rapid defoliation, brown fruit lesions, tuber rot; can destroy entire crop in days',
};

export const FLEA_BEETLE: Pest = {
  id: 'flea_beetle',
  name: 'Flea Beetle (Epitrix spp.)',
  type: 'insect',
  active_months: [4, 5, 6, 7],
  detection_method: 'Tiny jumping beetles; numerous small round holes ("shothole" pattern) in leaves',
  damage_description: 'Shothole damage to leaves, severe on young transplants, can kill seedlings',
};

export const ALL_PESTS: Pest[] = [
  CABBAGE_MOTH,
  APHID,
  COLORADO_POTATO_BEETLE,
  CORN_EARWORM,
  WHITEFLY,
  ROOT_KNOT_NEMATODE,
  LATE_BLIGHT,
  FLEA_BEETLE,
];

export const PEST_MAP = new Map<string, Pest>(ALL_PESTS.map((p) => [p.id, p]));

// ---------------------------------------------------------------------------
// Crop Vulnerabilities — pest → crop links
// ---------------------------------------------------------------------------

export const CROP_VULNERABILITIES: CropVulnerability[] = [
  // Kale
  {
    pest_id: 'cabbage_moth',
    crop_species_id: 'kale_red_russian',
    damage_type: 'foliage',
    severity: 'yield_reducing',
    vulnerable_stages: ['vegetative', 'mature'],
  },
  {
    pest_id: 'aphid',
    crop_species_id: 'kale_red_russian',
    damage_type: 'foliage',
    severity: 'yield_reducing',
    vulnerable_stages: ['vegetative', 'mature'],
  },
  {
    pest_id: 'flea_beetle',
    crop_species_id: 'kale_red_russian',
    damage_type: 'foliage',
    severity: 'yield_reducing',
    vulnerable_stages: ['germinated', 'vegetative'],
  },

  // Potato
  {
    pest_id: 'colorado_potato_beetle',
    crop_species_id: 'potato_kennebec',
    damage_type: 'foliage',
    severity: 'plant_killing',
    vulnerable_stages: ['vegetative', 'flowering', 'fruiting'],
  },
  {
    pest_id: 'late_blight',
    crop_species_id: 'potato_kennebec',
    damage_type: 'whole_plant',
    severity: 'plant_killing',
    vulnerable_stages: ['vegetative', 'flowering', 'fruiting', 'mature'],
  },
  {
    pest_id: 'root_knot_nematode',
    crop_species_id: 'potato_kennebec',
    damage_type: 'root',
    severity: 'yield_reducing',
    vulnerable_stages: ['vegetative', 'flowering', 'fruiting', 'mature'],
  },

  // Tomato (Amish Paste)
  {
    pest_id: 'aphid',
    crop_species_id: 'tomato_amish_paste',
    damage_type: 'foliage',
    severity: 'yield_reducing',
    vulnerable_stages: ['vegetative', 'flowering', 'fruiting'],
  },
  {
    pest_id: 'corn_earworm',
    crop_species_id: 'tomato_amish_paste',
    damage_type: 'fruit',
    severity: 'yield_reducing',
    vulnerable_stages: ['fruiting', 'mature'],
  },
  {
    pest_id: 'late_blight',
    crop_species_id: 'tomato_amish_paste',
    damage_type: 'whole_plant',
    severity: 'plant_killing',
    vulnerable_stages: ['vegetative', 'flowering', 'fruiting', 'mature'],
  },

  // Tomato (Sun Gold)
  {
    pest_id: 'aphid',
    crop_species_id: 'tomato_sun_gold',
    damage_type: 'foliage',
    severity: 'yield_reducing',
    vulnerable_stages: ['vegetative', 'flowering', 'fruiting'],
  },
  {
    pest_id: 'corn_earworm',
    crop_species_id: 'tomato_sun_gold',
    damage_type: 'fruit',
    severity: 'yield_reducing',
    vulnerable_stages: ['fruiting', 'mature'],
  },
  {
    pest_id: 'late_blight',
    crop_species_id: 'tomato_sun_gold',
    damage_type: 'whole_plant',
    severity: 'plant_killing',
    vulnerable_stages: ['vegetative', 'flowering', 'fruiting', 'mature'],
  },

  // Corn
  {
    pest_id: 'corn_earworm',
    crop_species_id: 'corn_nothstine_dent',
    damage_type: 'fruit',
    severity: 'yield_reducing',
    vulnerable_stages: ['flowering', 'fruiting', 'mature'],
  },

  // Lettuce
  {
    pest_id: 'aphid',
    crop_species_id: 'lettuce_bss',
    damage_type: 'foliage',
    severity: 'yield_reducing',
    vulnerable_stages: ['vegetative', 'mature'],
  },

  // Spinach
  {
    pest_id: 'aphid',
    crop_species_id: 'spinach_bloomsdale',
    damage_type: 'foliage',
    severity: 'yield_reducing',
    vulnerable_stages: ['vegetative', 'mature'],
  },
  {
    pest_id: 'flea_beetle',
    crop_species_id: 'spinach_bloomsdale',
    damage_type: 'foliage',
    severity: 'yield_reducing',
    vulnerable_stages: ['germinated', 'vegetative'],
  },
];

// ---------------------------------------------------------------------------
// Companion Benefits — companion → pest links
// ---------------------------------------------------------------------------

export const COMPANION_BENEFITS: CompanionBenefit[] = [
  // Marigold benefits
  {
    companion_species_id: 'marigold_french',
    pest_id: 'cabbage_moth',
    mechanism: 'visual_confusion',
    effective_radius_in: 18,
    efficacy: 'probable',
    source: 'MSU Extension — interplanting disrupts host-finding behavior of Pieris rapae',
  },
  {
    companion_species_id: 'marigold_french',
    pest_id: 'colorado_potato_beetle',
    mechanism: 'visual_confusion',
    effective_radius_in: 18,
    efficacy: 'probable',
    source: 'Purdue Extension E-96 — mixed plantings reduce CPB colonization',
  },
  {
    companion_species_id: 'marigold_french',
    pest_id: 'aphid',
    mechanism: 'chemical_repellent',
    effective_radius_in: 7,
    efficacy: 'probable',
    source: 'UF/IFAS Extension — marigold volatiles deter some aphid species',
  },
  {
    companion_species_id: 'marigold_french',
    pest_id: 'whitefly',
    mechanism: 'chemical_repellent',
    effective_radius_in: 7,
    efficacy: 'probable',
    source: 'UF/IFAS Extension — volatile compounds deter whitefly',
  },
  {
    companion_species_id: 'marigold_french',
    pest_id: 'root_knot_nematode',
    mechanism: 'nematode_suppression',
    effective_radius_in: 7,
    efficacy: 'proven',
    management_required: 'Rhizosphere-only effect (3-7" from roots). Cover-crop protocol (20 plants/m², 2-4 months) required for area suppression.',
    source: 'UF/IFAS Extension NG045 — Marigolds for Nematode Management',
  },

  // Nasturtium benefits
  {
    companion_species_id: 'nasturtium',
    pest_id: 'aphid',
    mechanism: 'trap_crop',
    effective_radius_in: 72,
    efficacy: 'probable',
    management_required: 'Remove heavily infested foliage weekly to prevent colony spillover',
    source: 'Holden 2012 — no evidence-based distance for aphid trap cropping; primary value is beneficial insect attraction',
  },
  {
    companion_species_id: 'nasturtium',
    pest_id: 'aphid',
    mechanism: 'predator_attraction',
    effective_radius_in: 72,
    efficacy: 'proven',
    management_required: 'Flowers must be blooming; hoverfly/lacewing larvae are the actual predators',
    source: 'Multiple sources — hoverfly larvae consume 200+ aphids each; lacewing larvae equally voracious',
  },

  // Calendula benefits
  {
    companion_species_id: 'calendula',
    pest_id: 'aphid',
    mechanism: 'predator_attraction',
    effective_radius_in: 120,
    efficacy: 'proven',
    source: 'Multiple extension sources — calendula attracts ladybugs, hoverflies, lacewings, parasitic wasps',
  },
  {
    companion_species_id: 'calendula',
    pest_id: 'colorado_potato_beetle',
    mechanism: 'predator_attraction',
    effective_radius_in: 120,
    efficacy: 'probable',
    source: 'Predatory insects attracted by calendula also prey on CPB larvae',
  },
];
