/**
 * Bridge between GardenState (spatial model) and ProductionTimeline (planning model).
 *
 * Converts PlantInstance[] into CropPlanting[] grouped by species + planting date,
 * with sun zone assigned from physY position.
 */

import { PlantSpecies } from '../types/PlantSpecies';
import { GardenState } from '../types/GardenState';
import { CropPlanting, DisplayGroup } from '../calculators/ProductionTimeline';
import { SunZone } from '../calculators/growthMath';

/** Assign sun zone from screen y_in (converted back to physY). */
function assignZone(physY: number): SunZone {
  if (physY < 240) return 'shade';
  if (physY < 300) return 'boundary';
  return 'full_sun';
}

/** Default display group from species ID. */
function inferDisplayGroup(species_id: string): DisplayGroup {
  if (species_id.includes('lettuce')) return 'Lettuce';
  if (species_id.includes('spinach')) return 'Spinach';
  if (species_id.includes('kale')) return 'Kale';
  if (species_id.includes('paste') || species_id.includes('amish')) return 'Paste';
  if (species_id.includes('sun_gold') || species_id.includes('sweetie') || species_id.includes('cherry')) return 'Cherry';
  if (species_id.includes('potato') || species_id.includes('kennebec')) return 'Potato';
  if (species_id.includes('corn') || species_id.includes('nothstine') || species_id.includes('dent')) return 'Corn';
  return 'Lettuce'; // fallback
}

/**
 * Convert a GardenState's plant list into CropPlanting[] for production timeline.
 *
 * Groups plants by (species_id, planting_date) to match how PRODUCTION_PLAN works.
 * physYLookup converts a plant's root_subcell_id to its physY coordinate.
 */
export function convertGardenStateToPlan(
  state: GardenState,
  speciesMap: Map<string, PlantSpecies>,
  physYLookup: (root_subcell_id: string) => number,
): CropPlanting[] {
  // Group by species_id + planting_date
  const groups = new Map<string, { species: PlantSpecies; physYs: number[]; count: number; date: string }>();

  for (const plant of state.plants) {
    const species = speciesMap.get(plant.species_id);
    if (!species) continue;

    const key = `${plant.species_id}|${plant.planted_date}`;
    const existing = groups.get(key);
    const physY = physYLookup(plant.root_subcell_id);

    if (existing) {
      existing.count++;
      existing.physYs.push(physY);
    } else {
      groups.set(key, { species, physYs: [physY], count: 1, date: plant.planted_date });
    }
  }

  const plantings: CropPlanting[] = [];
  for (const group of groups.values()) {
    const avg_physY = group.physYs.reduce((a, b) => a + b, 0) / group.physYs.length;
    plantings.push({
      species: group.species,
      display_group: inferDisplayGroup(group.species.id),
      plant_count: group.count,
      planting_date: group.date,
      zone: assignZone(avg_physY),
    });
  }

  return plantings;
}
