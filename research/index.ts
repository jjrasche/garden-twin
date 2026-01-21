/**
 * Research exports - completed plant varieties
 *
 * These are the researched PlantSpecies configs ready for use in the simulation.
 * Each variety has been researched with verified data on:
 * - Days to maturity
 * - Yield per plant
 * - Spacing requirements
 * - Seed costs
 * - USDA nutrition data
 * - Growing modifiers
 */

// Corn varieties
export { CORN_GOLDEN_BANTAM } from './golden-bantam-corn/config';
export { CORN_WAPSIE_VALLEY } from './wapsie-valley-corn/config';
export { CORN_STOWELLS_EVERGREEN } from './stowells-evergreen-corn/config';

// Potato varieties
export { POTATO_RUSSET_BURBANK } from './russet-burbank-potato/config';
export { POTATO_RED_NORLAND } from './red-norland-potato/config';
export { POTATO_YUKON_GOLD } from './yukon-gold-potato/config';

/**
 * Note: These exports match the naming convention in src/core/data/plantSpecies.ts
 * for consistency with the existing codebase.
 */
