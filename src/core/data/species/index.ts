import { PlantSpecies } from '../../types';

export { CORN_NOTHSTINE_DENT } from './corn-nothstine-dent';
export { POTATO_KENNEBEC } from './potato-kennebec';
export { TOMATO_SUN_GOLD } from './tomato-sun-gold';
export { TOMATO_AMISH_PASTE } from './tomato-amish-paste';
export { LETTUCE_BSS } from './lettuce-bss';
export { KALE_RED_RUSSIAN } from './kale-red-russian';
export { SPINACH_BLOOMSDALE } from './spinach-bloomsdale';
export { MARIGOLD_FRENCH } from './marigold-french';
export { NASTURTIUM } from './nasturtium-trailing';
export { CALENDULA } from './calendula-alpha';

import { CORN_NOTHSTINE_DENT } from './corn-nothstine-dent';
import { POTATO_KENNEBEC } from './potato-kennebec';
import { TOMATO_SUN_GOLD } from './tomato-sun-gold';
import { TOMATO_AMISH_PASTE } from './tomato-amish-paste';
import { LETTUCE_BSS } from './lettuce-bss';
import { KALE_RED_RUSSIAN } from './kale-red-russian';
import { SPINACH_BLOOMSDALE } from './spinach-bloomsdale';
import { MARIGOLD_FRENCH } from './marigold-french';
import { NASTURTIUM } from './nasturtium-trailing';
import { CALENDULA } from './calendula-alpha';

/** All 10 garden species as an array. */
export const GARDEN_SPECIES: PlantSpecies[] = [
  CORN_NOTHSTINE_DENT,
  POTATO_KENNEBEC,
  TOMATO_SUN_GOLD,
  TOMATO_AMISH_PASTE,
  LETTUCE_BSS,
  KALE_RED_RUSSIAN,
  SPINACH_BLOOMSDALE,
  MARIGOLD_FRENCH,
  NASTURTIUM,
  CALENDULA,
];

/** All 10 garden species indexed by id for O(1) lookup. */
export const GARDEN_SPECIES_MAP: Map<string, PlantSpecies> = new Map(
  GARDEN_SPECIES.map((species) => [species.id, species]),
);
