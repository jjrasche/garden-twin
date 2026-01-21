import { Subcell } from '../types';

/**
 * Cell data aggregated from subcells
 */
export interface CellData {
  cell_x_ft: number;
  cell_y_ft: number;
  total_subcells: number;
  plant_counts: Record<string, number>; // species_id → count
  avg_sun: number;
  is_pathway: boolean;
}

/**
 * Zone data aggregated from subcells
 */
export interface ZoneData {
  zone_x: number;
  zone_y: number;
  total_plants: number;
  plant_counts: Record<string, number>; // species_id → count
  avg_sun: number;
  plant_density: number; // plants per sq ft
}

/**
 * Get all subcells for a given 1×1 ft cell
 *
 * @param subcells - All subcells in the garden
 * @param cell_x_ft - Cell X coordinate (in feet)
 * @param cell_y_ft - Cell Y coordinate (in feet)
 * @returns Array of subcells in this cell
 */
export function getCellSubcells(
  subcells: Subcell[],
  cell_x_ft: number,
  cell_y_ft: number
): Subcell[] {
  return subcells.filter(
    s => s.computed.cell_x_ft === cell_x_ft && s.computed.cell_y_ft === cell_y_ft
  );
}

/**
 * Get aggregated cell data
 *
 * @param subcells - All subcells in the garden
 * @param cell_x_ft - Cell X coordinate
 * @param cell_y_ft - Cell Y coordinate
 * @returns Aggregated cell data
 */
export function getCellData(
  subcells: Subcell[],
  cell_x_ft: number,
  cell_y_ft: number
): CellData {
  const cellSubcells = getCellSubcells(subcells, cell_x_ft, cell_y_ft);

  // Count plants by species
  const plantCounts: Record<string, number> = {};
  for (const subcell of cellSubcells) {
    if (subcell.plant) {
      const speciesId = subcell.plant.species_id;
      plantCounts[speciesId] = (plantCounts[speciesId] || 0) + 1;
    }
  }

  // Calculate average sun hours
  const avgSun =
    cellSubcells.length > 0
      ? cellSubcells.reduce((sum, s) => sum + s.conditions.sun_hours, 0) / cellSubcells.length
      : 0;

  // Check if pathway (if any subcell is pathway, consider cell as pathway)
  const isPathway = cellSubcells.some(s => s.conditions.type === 'pathway');

  return {
    cell_x_ft,
    cell_y_ft,
    total_subcells: cellSubcells.length,
    plant_counts: plantCounts,
    avg_sun: avgSun,
    is_pathway: isPathway,
  };
}

/**
 * Get all subcells for a given 10×10 ft zone
 *
 * @param subcells - All subcells in the garden
 * @param zone_x - Zone X coordinate
 * @param zone_y - Zone Y coordinate
 * @returns Array of subcells in this zone
 */
export function getZoneSubcells(
  subcells: Subcell[],
  zone_x: number,
  zone_y: number
): Subcell[] {
  return subcells.filter(
    s => s.computed.zone_x === zone_x && s.computed.zone_y === zone_y
  );
}

/**
 * Get aggregated zone data
 *
 * @param subcells - All subcells in the garden
 * @param zone_x - Zone X coordinate
 * @param zone_y - Zone Y coordinate
 * @returns Aggregated zone data
 */
export function getZoneData(
  subcells: Subcell[],
  zone_x: number,
  zone_y: number
): ZoneData {
  const zoneSubcells = getZoneSubcells(subcells, zone_x, zone_y);

  // Count plants by species
  const plantCounts: Record<string, number> = {};
  for (const subcell of zoneSubcells) {
    if (subcell.plant) {
      const speciesId = subcell.plant.species_id;
      plantCounts[speciesId] = (plantCounts[speciesId] || 0) + 1;
    }
  }

  // Count total plants
  const totalPlants = zoneSubcells.filter(s => s.plant !== undefined).length;

  // Calculate average sun hours
  const avgSun =
    zoneSubcells.length > 0
      ? zoneSubcells.reduce((sum, s) => sum + s.conditions.sun_hours, 0) / zoneSubcells.length
      : 0;

  // Plant density: plants per sq ft (zone is 10×10 = 100 sq ft)
  const plantDensity = totalPlants / 100;

  return {
    zone_x,
    zone_y,
    total_plants: totalPlants,
    plant_counts: plantCounts,
    avg_sun: avgSun,
    plant_density: plantDensity,
  };
}

/**
 * Helper: Calculate average of an array
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
