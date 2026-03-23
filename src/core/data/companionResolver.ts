/**
 * Resolve companion plant placements from the normalized pest model.
 *
 * Traverses the Companion → Pest → Crop chain to find which companion
 * species protect a zone's crops, then places them at zone borders.
 * Trap crops are skipped (handled by trellis/inline generators).
 */

import type { PlantInstance } from '../types';
import type { PlantSpecies } from '../types/PlantSpecies';
import type { CompanionBenefit } from '../types/Pest';
import { createSubcellId } from '../types';
import { findProtectorsForCrop } from '../types/Pest';
import { CROP_VULNERABILITIES, COMPANION_BENEFITS } from './pests';
import { toScreenSnapped, SUBCELL_SIZE_IN } from '../geometry/gardenGeometry';

function createRectFootprint(x: number, y: number, dx: number, dy: number): string[] {
  const cells: string[] = [];
  for (let ix = 0; ix < dx * SUBCELL_SIZE_IN; ix += SUBCELL_SIZE_IN) {
    for (let iy = 0; iy < dy * SUBCELL_SIZE_IN; iy += SUBCELL_SIZE_IN) {
      cells.push(createSubcellId(x + ix, y + iy));
    }
  }
  return cells;
}

const PROJECTION_DATE = '2025-05-25T00:00:00.000Z';

/** Species that have ANY trap_crop benefit — placed inline, not at borders. */
function isTrapCropSpecies(speciesId: string): boolean {
  return COMPANION_BENEFITS.some(
    (b) => b.companion_species_id === speciesId && b.mechanism === 'trap_crop',
  );
}

/** Find companion species that protect a zone's crops, excluding trap crops. */
function findBorderCompanions(
  cropIds: string[],
  catalog: Map<string, PlantSpecies>,
): Array<{ companionId: string; maxRadius: number }> {
  const companionRadii = new Map<string, number>();

  for (const cropId of cropIds) {
    const protectors = findProtectorsForCrop(cropId, CROP_VULNERABILITIES, COMPANION_BENEFITS);

    for (const { benefit } of protectors) {
      if (isTrapCropSpecies(benefit.companion_species_id)) continue;
      if (!catalog.has(benefit.companion_species_id)) continue;

      const existing = companionRadii.get(benefit.companion_species_id) ?? 0;
      companionRadii.set(
        benefit.companion_species_id,
        Math.max(existing, benefit.effective_radius_in),
      );
    }
  }

  return [...companionRadii.entries()].map(([companionId, maxRadius]) => ({
    companionId,
    maxRadius,
  }));
}

/** Compute physX positions along a zone border for a companion species. */
function computeBorderPositions(zoneEastX: number, maxDistanceIn: number): number[] {
  const westEdge = 6;
  const spacing = Math.max(maxDistanceIn * 4, 60);
  const positions: number[] = [];

  for (let physX = westEdge; physX < zoneEastX; physX += spacing) {
    positions.push(physX);
  }

  return positions;
}

/**
 * Resolve companion plant placements for a single rectangular zone.
 *
 * Traverses pest model to find companions that protect the zone's crops,
 * then places them at north and south zone borders. Trap crops are
 * skipped (handled by trellis/inline generators).
 */
export function resolveZoneCompanions(
  zoneName: string,
  cropIds: string[],
  physYRange: [number, number],
  cropEastX: number,
  catalog: Map<string, PlantSpecies>,
  plantingDate: string,
): PlantInstance[] {
  const companions = findBorderCompanions(cropIds, catalog);
  if (companions.length === 0) return [];

  const plants: PlantInstance[] = [];

  for (const { companionId, maxRadius } of companions) {
    const xPositions = computeBorderPositions(cropEastX, maxRadius);

    let count = 0;
    const southBorderY = physYRange[0] - 6;
    const northBorderY = physYRange[1] + 6;

    for (const physX of xPositions) {
      const southPos = toScreenSnapped(physX, southBorderY);
      plants.push({
        plant_id: `companion_${companionId}_${zoneName}_${count++}`,
        species_id: companionId,
        root_subcell_id: createSubcellId(southPos.x_in, southPos.y_in),
        occupied_subcells: createRectFootprint(southPos.x_in, southPos.y_in, 2, 2),
        planted_date: plantingDate,
        current_stage: 'seed',
        accumulated_gdd: 0,
        measurements: { height_cm: 0 },
        last_observed: PROJECTION_DATE,
        health_status: 'healthy',
      });

      const northPos = toScreenSnapped(physX, northBorderY);
      plants.push({
        plant_id: `companion_${companionId}_${zoneName}_${count++}`,
        species_id: companionId,
        root_subcell_id: createSubcellId(northPos.x_in, northPos.y_in),
        occupied_subcells: createRectFootprint(northPos.x_in, northPos.y_in, 2, 2),
        planted_date: plantingDate,
        current_stage: 'seed',
        accumulated_gdd: 0,
        measurements: { height_cm: 0 },
        last_observed: PROJECTION_DATE,
        health_status: 'healthy',
      });
    }
  }

  return plants;
}
