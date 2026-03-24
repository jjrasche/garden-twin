import { LifecycleSpec } from '../../types/LifecycleSpec';
import { AMISH_PASTE_LIFECYCLE } from './tomato-amish-paste.lifecycle';
import { CHERRY_TOMATO_LIFECYCLE } from './tomato-cherry.lifecycle';
import { KALE_RED_RUSSIAN_LIFECYCLE } from './kale-red-russian.lifecycle';
import { POTATO_KENNEBEC_LIFECYCLE } from './potato-kennebec.lifecycle';
import { LETTUCE_BSS_LIFECYCLE } from './lettuce-bss.lifecycle';
import { SPINACH_BLOOMSDALE_LIFECYCLE } from './spinach-bloomsdale.lifecycle';
import { CORN_NOTHSTINE_DENT_LIFECYCLE } from './corn-nothstine-dent.lifecycle';
import { MARIGOLD_FRENCH_LIFECYCLE } from './marigold-french.lifecycle';
import { NASTURTIUM_TRAILING_LIFECYCLE } from './nasturtium-trailing.lifecycle';
import { CALENDULA_ALPHA_LIFECYCLE } from './calendula-alpha.lifecycle';

/** All lifecycle specs keyed by species_id. Potato excludes processing (cellar only, no blanching). */
export const LIFECYCLE_SPECS: Map<string, LifecycleSpec> = new Map([
  [AMISH_PASTE_LIFECYCLE.species_id, AMISH_PASTE_LIFECYCLE],
  [CHERRY_TOMATO_LIFECYCLE.species_id, CHERRY_TOMATO_LIFECYCLE],
  [KALE_RED_RUSSIAN_LIFECYCLE.species_id, KALE_RED_RUSSIAN_LIFECYCLE],
  [POTATO_KENNEBEC_LIFECYCLE.species_id, { ...POTATO_KENNEBEC_LIFECYCLE, processing: undefined }],
  [LETTUCE_BSS_LIFECYCLE.species_id, LETTUCE_BSS_LIFECYCLE],
  [SPINACH_BLOOMSDALE_LIFECYCLE.species_id, SPINACH_BLOOMSDALE_LIFECYCLE],
  [CORN_NOTHSTINE_DENT_LIFECYCLE.species_id, CORN_NOTHSTINE_DENT_LIFECYCLE],
  [MARIGOLD_FRENCH_LIFECYCLE.species_id, MARIGOLD_FRENCH_LIFECYCLE],
  [NASTURTIUM_TRAILING_LIFECYCLE.species_id, NASTURTIUM_TRAILING_LIFECYCLE],
  [CALENDULA_ALPHA_LIFECYCLE.species_id, CALENDULA_ALPHA_LIFECYCLE],
]);
