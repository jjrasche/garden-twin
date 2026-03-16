import { PlantSpecies, SubcellConditions } from '../types';
import { computePlantYield } from './yieldModel';

/**
 * Yield Calculator — spatial yield per plant at a specific subcell.
 *
 * Delegates to computePlantYield with subcell conditions mapped to YieldConditions.
 */
export class YieldCalculator {
  calculate(
    species: PlantSpecies,
    conditions: SubcellConditions,
    actual_density: number,
    moisture_pct_fc?: number,
  ): number {
    if (conditions.type === 'pathway') return 0;

    return computePlantYield(species, {
      sun_hours: conditions.sun_hours,
      soil: conditions.soil,
      spacing_plants_per_sq_ft: actual_density,
      soil_moisture_pct_fc: moisture_pct_fc,
    });
  }

  calculateNutrition(species: PlantSpecies, yield_lbs: number) {
    const n = species.nutrition_per_lb;
    return {
      calories: n.calories * yield_lbs,
      protein_g: n.protein_g * yield_lbs,
      carbs_g: n.carbs_g * yield_lbs,
      fat_g: n.fat_g * yield_lbs,
      fiber_g: n.fiber_g * yield_lbs,
      vitamin_a_mcg: (n.vitamin_a_mcg ?? 0) * yield_lbs,
      vitamin_c_mg: (n.vitamin_c_mg ?? 0) * yield_lbs,
      vitamin_k_mcg: (n.vitamin_k_mcg ?? 0) * yield_lbs,
      calcium_mg: (n.calcium_mg ?? 0) * yield_lbs,
      iron_mg: (n.iron_mg ?? 0) * yield_lbs,
      potassium_mg: (n.potassium_mg ?? 0) * yield_lbs,
    };
  }
}
