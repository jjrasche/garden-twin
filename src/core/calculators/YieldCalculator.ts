import { PlantSpecies, SubcellConditions } from '../types';
import { interpolate } from './interpolate';

/**
 * Yield Calculator
 *
 * Calculates expected yield for a plant given specific growing conditions.
 *
 * Formula:
 *   yield = baseline × sun_mod × soil_N × soil_P × soil_K × pH × compaction × spacing × success_rate
 *
 * All modifiers are interpolated from lookup tables defined in the PlantSpecies.
 */
export class YieldCalculator {
  /**
   * Calculate expected yield for a single plant
   *
   * @param species - Plant species definition
   * @param conditions - Growing conditions (sun, soil, type)
   * @param actual_density - Actual planting density (plants per sq ft)
   * @returns Expected yield in lbs
   */
  calculate(
    species: PlantSpecies,
    conditions: SubcellConditions,
    actual_density: number
  ): number {
    // Pathway subcells have zero yield
    if (conditions.type === 'pathway') {
      return 0;
    }

    // Start with baseline yield
    let yield_per_plant = species.baseline_lbs_per_plant;

    // Apply sun modifier
    const sun_modifier = interpolate(species.modifiers.sun, conditions.sun_hours);
    yield_per_plant *= sun_modifier;

    // Apply soil nutrient modifiers
    const n_modifier = interpolate(species.modifiers.soil.N_ppm, conditions.soil.N_ppm);
    yield_per_plant *= n_modifier;

    const p_modifier = interpolate(species.modifiers.soil.P_ppm, conditions.soil.P_ppm);
    yield_per_plant *= p_modifier;

    const k_modifier = interpolate(species.modifiers.soil.K_ppm, conditions.soil.K_ppm);
    yield_per_plant *= k_modifier;

    const ph_modifier = interpolate(species.modifiers.soil.pH, conditions.soil.pH);
    yield_per_plant *= ph_modifier;

    const compaction_modifier = interpolate(
      species.modifiers.soil.compaction_psi,
      conditions.soil.compaction_psi
    );
    yield_per_plant *= compaction_modifier;

    // Apply spacing/density modifier
    const spacing_modifier = interpolate(
      species.modifiers.spacing_plants_per_sq_ft,
      actual_density
    );
    yield_per_plant *= spacing_modifier;

    // Apply success rate
    yield_per_plant *= species.success_rate;

    return yield_per_plant;
  }

  /**
   * Calculate nutrition delivered by a given yield
   *
   * @param species - Plant species
   * @param yield_lbs - Yield in pounds
   * @returns Object with nutritional content
   */
  calculateNutrition(species: PlantSpecies, yield_lbs: number) {
    const nutrition = species.nutrition_per_lb;

    return {
      calories: nutrition.calories * yield_lbs,
      protein_g: nutrition.protein_g * yield_lbs,
      carbs_g: nutrition.carbs_g * yield_lbs,
      fat_g: nutrition.fat_g * yield_lbs,
      fiber_g: nutrition.fiber_g * yield_lbs,
      vitamin_a_mcg: (nutrition.vitamin_a_mcg ?? 0) * yield_lbs,
      vitamin_c_mg: (nutrition.vitamin_c_mg ?? 0) * yield_lbs,
      vitamin_k_mcg: (nutrition.vitamin_k_mcg ?? 0) * yield_lbs,
      calcium_mg: (nutrition.calcium_mg ?? 0) * yield_lbs,
      iron_mg: (nutrition.iron_mg ?? 0) * yield_lbs,
      potassium_mg: (nutrition.potassium_mg ?? 0) * yield_lbs,
    };
  }
}
