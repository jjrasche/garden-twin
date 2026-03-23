/**
 * Layout Solver — polygon-based plant placement.
 *
 * Takes: garden definition (polygon, obstructions, infrastructure) +
 *        planting requests (species, count) + species catalog
 * Returns: physical positions for every plant, paths, capacity report
 *
 * Species placement is derived from biological properties (height, shade tolerance,
 * access needs) — not display groups or hardcoded orderings.
 *
 * Zones don't store width — the east boundary is the plantable polygon's edge.
 * The solver queries region.widthAtY() at each physY during placement.
 */

import type { PlantSpecies } from '../types/PlantSpecies';
import {
  type GardenDefinition,
  type PlantingRequest,
  type PlantPlacement,
  type PathSegment,
  type LayoutResult,
} from './types';

/** Solver-internal: a N-S band allocated to a species group. Not exposed in output. */
interface SolverBand {
  physY: [number, number];
  access: 'bordered' | 'block';
  species_ids: string[];
}
import {
  widthWestOfPolyline, interpolatePolylineX,
  type Polyline,
} from '../geometry/gardenGeometry';

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ZONE_WIDTH_IN = 48;
const DEFAULT_PATH_WIDTH_IN = 12;
const SHADE_RANK: Record<string, number> = {
  full_sun: 0,
  partial_shade: 1,
  shade_preferred: 2,
};

// ── Plantable Region ─────────────────────────────────────────────────────────

interface PlantableRegion {
  physY: [number, number];
  widthAtY: (y: number) => number;
}

function buildPlantableRegion(garden: GardenDefinition): PlantableRegion {
  let minY = 0;
  const maxY = garden.bounds.length_in;
  const polylineBuffers: Array<{ polyline: Polyline; buffer: number }> = [];
  const rectExclusions: Array<{ physX: [number, number]; physY: [number, number] }> = [];

  for (const obs of garden.obstructions) {
    if (obs.type === 'rect') {
      rectExclusions.push({ physX: obs.physX, physY: obs.physY });
      if (obs.physY[0] === 0) minY = Math.max(minY, obs.physY[1]);
    } else if (obs.type === 'polyline_buffer') {
      polylineBuffers.push({ polyline: obs.polyline, buffer: obs.buffer_in });
    }
  }

  return {
    physY: [minY, maxY],
    widthAtY: (y: number) => {
      let width = garden.bounds.width_in;
      for (const pb of polylineBuffers) {
        width = Math.min(width, widthWestOfPolyline(y, pb.polyline, pb.buffer));
      }
      for (const rect of rectExclusions) {
        if (y >= rect.physY[0] && y <= rect.physY[1]) {
          width = Math.min(width, rect.physX[0]);
        }
      }
      return Math.max(0, width);
    },
  };
}

// ── Species Sorting ──────────────────────────────────────────────────────────

interface SpeciesGroup {
  request: PlantingRequest;
  species: PlantSpecies;
  accessType: 'bordered' | 'block';
  heightFt: number;
  shadeRank: number;
  requiredAreaSqft: number;
  successor?: { request: PlantingRequest; species: PlantSpecies; requiredAreaSqft: number };
}

function buildSpeciesGroups(
  requests: PlantingRequest[],
  catalog: Map<string, PlantSpecies>,
): SpeciesGroup[] {
  const groups: SpeciesGroup[] = [];

  for (const req of requests) {
    const species = catalog.get(req.species_id);
    if (!species) continue;
    if (species.layout?.role !== 'food_crop') continue;

    const density = species.plants_per_sq_ft || 1;
    const area = req.plant_count / density;

    let successor: SpeciesGroup['successor'];
    if (req.successor) {
      const succSpecies = catalog.get(req.successor.species_id);
      if (succSpecies) {
        const succDensity = succSpecies.plants_per_sq_ft || 1;
        successor = {
          request: req.successor,
          species: succSpecies,
          requiredAreaSqft: req.successor.plant_count / succDensity,
        };
      }
    }

    groups.push({
      request: req,
      species,
      accessType: species.layout?.access_type ?? 'bordered',
      heightFt: species.height_ft,
      shadeRank: SHADE_RANK[species.layout?.shade_tolerance ?? 'partial_shade'] ?? 1,
      requiredAreaSqft: successor ? Math.max(area, successor.requiredAreaSqft) : area,
      successor,
    });
  }

  groups.sort((a, b) => {
    if (b.heightFt !== a.heightFt) return b.heightFt - a.heightFt;
    if (a.shadeRank !== b.shadeRank) return a.shadeRank - b.shadeRank;
    if (a.accessType !== b.accessType) return a.accessType === 'block' ? -1 : 1;
    return 0;
  });

  return groups;
}

// ── Zone Allocation ──────────────────────────────────────────────────────────

function allocateZones(
  groups: SpeciesGroup[],
  region: PlantableRegion,
  zoneWidth: number,
  pathWidth: number,
): { bands: SolverBand[]; paths: PathSegment[]; warnings: string[] } {
  const bands: SolverBand[] = [];
  const paths: PathSegment[] = [];
  const warnings: string[] = [];
  let cursor = region.physY[1];

  for (const group of groups) {
    if (cursor <= region.physY[0]) {
      warnings.push(`No space remaining for ${group.species.name}`);
      continue;
    }

    const isBlock = group.accessType === 'block';
    const spacing = group.species.layout?.spacing;
    const inRow = spacing?.in_row_in ?? 6;
    const betweenRow = spacing?.between_row_in ?? 12;
    const eqSpacing = spacing?.equidistant_in ?? inRow;

    let zoneHeightIn: number;

    if (isBlock) {
      const estWidth = region.widthAtY(cursor - 50);
      zoneHeightIn = Math.ceil(group.requiredAreaSqft * 144 / estWidth);
      const estBottom = Math.max(region.physY[0], cursor - zoneHeightIn);
      let sumWidth = 0;
      const samples = 5;
      for (let i = 0; i < samples; i++) {
        sumWidth += region.widthAtY(estBottom + (i + 0.5) * (cursor - estBottom) / samples);
      }
      zoneHeightIn = Math.ceil(group.requiredAreaSqft * 144 / (sumWidth / samples));
    } else {
      // Sample width at multiple points to handle variable-width polygon
      const widthSamples = [
        region.widthAtY(cursor - 50),
        region.widthAtY(Math.max(region.physY[0], cursor - 200)),
        region.widthAtY(Math.max(region.physY[0], cursor - 400)),
      ];
      const avgWidth = Math.max(...widthSamples);
      let maxZoneRows = 1;
      // Check primary + successor to find max zone rows needed
      const plantingsToCheck = [{ count: group.request.plant_count, inRow, betweenRow }];
      if (group.successor) {
        const succSpacing = group.successor.species.layout?.spacing;
        plantingsToCheck.push({
          count: group.successor.request.plant_count,
          inRow: succSpacing?.in_row_in ?? 6,
          betweenRow: succSpacing?.between_row_in ?? 12,
        });
      }
      for (const { count, inRow: ir, betweenRow: br } of plantingsToCheck) {
        const rowsPerZoneRow = Math.floor(zoneWidth / br);
        const plantsPerRow = Math.floor(avgWidth / ir);
        const plantsPerZoneRow = Math.max(1, rowsPerZoneRow * plantsPerRow);
        maxZoneRows = Math.max(maxZoneRows, Math.ceil(count / plantsPerZoneRow));
      }
      zoneHeightIn = maxZoneRows * (zoneWidth + pathWidth) + pathWidth;
    }

    // Block species need minimum area for pollination/viability (~100 sqft for corn)
    const MIN_BLOCK_AREA_SQFT = 100;
    const zoneTop = cursor;
    const zoneBottom = Math.max(region.physY[0], cursor - zoneHeightIn);
    const allocatedHeight = zoneTop - zoneBottom;

    if (allocatedHeight < (isBlock ? eqSpacing : betweenRow)) {
      warnings.push(`Insufficient space for ${group.species.name}: ${allocatedHeight}" available`);
      continue;
    }

    if (isBlock) {
      const blockWidth = region.widthAtY((zoneTop + zoneBottom) / 2);
      const blockAreaSqft = (allocatedHeight * blockWidth) / 144;
      if (blockAreaSqft < MIN_BLOCK_AREA_SQFT) {
        warnings.push(`${group.species.name}: block area ${blockAreaSqft.toFixed(0)} sqft < ${MIN_BLOCK_AREA_SQFT} sqft minimum`);
      }
    }

    const speciesIds = [group.request.species_id];
    if (group.successor) speciesIds.push(group.successor.request.species_id);

    bands.push({
      physY: [zoneBottom, zoneTop],
      access: group.accessType,
      species_ids: speciesIds,
    });

    cursor = zoneBottom - pathWidth;
    if (cursor > region.physY[0]) {
      const pathWidth_actual = region.widthAtY(zoneBottom);
      paths.push({
        physY: zoneBottom - pathWidth / 2,
        physX: [0, pathWidth_actual],
        width_in: pathWidth,
      });
    }
  }

  return { bands, paths, warnings };
}

// ── Plant Placement ──────────────────────────────────────────────────────────

function computeStaggerDate(baseDate: string, index: number, total: number, staggerDays: number): string {
  if (staggerDays <= 0) return baseDate;
  const base = new Date(baseDate);
  const offset = Math.floor(index * staggerDays / total);
  const date = new Date(base);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function placePlantsInBand(
  band: SolverBand,
  group: SpeciesGroup,
  region: PlantableRegion,
  zoneWidth: number,
  pathWidth: number,
): { placements: PlantPlacement[]; innerPaths: PathSegment[] } {
  const placements: PlantPlacement[] = [];
  const innerPaths: PathSegment[] = [];
  const [zoneSouth, zoneNorth] = band.physY;

  const placeSpecies = (
    req: PlantingRequest, species: PlantSpecies, idPrefix: string,
  ): number => {
    const spacing = species.layout?.spacing;
    const inRow = spacing?.in_row_in ?? 6;
    const betweenRow = spacing?.between_row_in ?? spacing?.equidistant_in ?? 12;
    const isBlock = band.access === 'block';
    const eqSpacing = spacing?.equidistant_in ?? inRow;

    let placed = 0;

    if (isBlock) {
      for (let physY = zoneSouth; physY <= zoneNorth && placed < req.plant_count; physY += eqSpacing) {
        const eastX = region.widthAtY(physY);
        for (let physX = eqSpacing; physX <= eastX && placed < req.plant_count; physX += eqSpacing) {
          placements.push({
            plant_id: `${idPrefix}_${placed}`,
            species_id: req.species_id,
            physX,
            physY,
            planted_date: computeStaggerDate(req.planting_date, placed, req.plant_count, req.stagger_days ?? 0),
            density_plants_per_sqft: 0,
            harvest_strategy_id: req.harvest_strategy_id,
          });
          placed++;
        }
      }
    } else {
      let physY = zoneSouth + pathWidth;

      innerPaths.push({
        physY: zoneSouth + pathWidth / 2,
        physX: [0, region.widthAtY(zoneSouth)],
        width_in: pathWidth,
      });

      while (physY + zoneWidth <= zoneNorth && placed < req.plant_count) {
        const rowSouth = physY;
        const rowNorth = physY + zoneWidth;

        for (let row = rowSouth + betweenRow / 2; row < rowNorth && placed < req.plant_count; row += betweenRow) {
          const eastX = region.widthAtY(row);
          for (let col = inRow; col < eastX && placed < req.plant_count; col += inRow) {
            placements.push({
              plant_id: `${idPrefix}_${placed}`,
              species_id: req.species_id,
              physX: col,
              physY: row,
              planted_date: computeStaggerDate(req.planting_date, placed, req.plant_count, req.stagger_days ?? 0),
              density_plants_per_sqft: 0,
              harvest_strategy_id: req.harvest_strategy_id,
            });
            placed++;
          }
        }

        physY = rowNorth + pathWidth;
        innerPaths.push({
          physY: rowNorth + pathWidth / 2,
          physX: [0, region.widthAtY(rowNorth)],
          width_in: pathWidth,
        });
      }
    }

    return placed;
  };

  const primaryPlaced = placeSpecies(group.request, group.species, group.species.id);

  let successorPlaced = 0;
  if (group.successor) {
    successorPlaced = placeSpecies(
      group.successor.request, group.successor.species, group.successor.species.id,
    );
  }

  // Compute density from actual placement and band area
  const sampleCount = 10;
  let bandAreaSqIn = 0;
  const dY = (band.physY[1] - band.physY[0]) / sampleCount;
  for (let i = 0; i < sampleCount; i++) {
    const y = band.physY[0] + (i + 0.5) * dY;
    bandAreaSqIn += region.widthAtY(y) * dY;
  }
  const bandAreaSqft = bandAreaSqIn / 144;

  for (const p of placements) {
    if (p.species_id === group.request.species_id) {
      p.density_plants_per_sqft = primaryPlaced / bandAreaSqft;
    } else if (group.successor && p.species_id === group.successor.request.species_id) {
      p.density_plants_per_sqft = successorPlaced / bandAreaSqft;
    }
  }

  return { placements, innerPaths };
}

// ── Infrastructure Plants (Trellis) ──────────────────────────────────────────

function placeInfrastructurePlants(
  garden: GardenDefinition,
  requests: PlantingRequest[],
): PlantPlacement[] {
  const placements: PlantPlacement[] = [];

  for (const infra of garden.infrastructure) {
    if (infra.type !== 'trellis') continue;

    const infraRequests = requests.filter(r => infra.species_ids.includes(r.species_id));
    const WEST_OFFSET = -12;
    const EAST_OFFSET = 12;
    const sides = infraRequests.slice(0, 2);
    const maxCount = Math.max(...sides.map(s => s.plant_count), 0);
    const trellisLengthIn = maxCount * infra.spacing_in;
    const trellisAreaSqft = (trellisLengthIn * infra.spacing_in) / 144;

    for (let i = 0; i < maxCount; i++) {
      const physY = infra.start_physY + i * infra.spacing_in;
      const cx = interpolatePolylineX(physY, infra.polyline);

      if (sides[0] && i < sides[0].plant_count) {
        placements.push({
          plant_id: `${sides[0].species_id}_${i}`,
          species_id: sides[0].species_id,
          physX: cx + WEST_OFFSET,
          physY,
          planted_date: sides[0].planting_date,
          density_plants_per_sqft: sides[0].plant_count / trellisAreaSqft,
          harvest_strategy_id: sides[0].harvest_strategy_id,
        });
      }

      if (sides[1] && i < sides[1].plant_count) {
        placements.push({
          plant_id: `${sides[1].species_id}_${i}`,
          species_id: sides[1].species_id,
          physX: cx + EAST_OFFSET,
          physY,
          planted_date: sides[1].planting_date,
          density_plants_per_sqft: sides[1].plant_count / trellisAreaSqft,
          harvest_strategy_id: sides[1].harvest_strategy_id,
        });
      }
    }
  }

  return placements;
}

// ── Main Solver ──────────────────────────────────────────────────────────────

export function solveLayout(
  garden: GardenDefinition,
  requests: PlantingRequest[],
  catalog: Map<string, PlantSpecies>,
  options?: { zoneWidth?: number; pathWidth?: number },
): LayoutResult {
  const zoneWidth = options?.zoneWidth ?? DEFAULT_ZONE_WIDTH_IN;
  const pathWidth = options?.pathWidth ?? DEFAULT_PATH_WIDTH_IN;

  const region = buildPlantableRegion(garden);

  const infraSpeciesIds = new Set(garden.infrastructure.flatMap(i => i.species_ids));
  const groundRequests = requests.filter(r => !infraSpeciesIds.has(r.species_id));
  const infraRequests = requests.filter(r => infraSpeciesIds.has(r.species_id));

  const groups = buildSpeciesGroups(groundRequests, catalog);

  const { bands, paths: interBandPaths, warnings } = allocateZones(groups, region, zoneWidth, pathWidth);

  const allPlacements: PlantPlacement[] = [];
  const allPaths: PathSegment[] = [...interBandPaths];
  const capacity: Record<string, { requested: number; placed: number }> = {};

  for (let i = 0; i < groups.length && i < bands.length; i++) {
    const group = groups[i]!;
    const band = bands[i]!;
    const { placements, innerPaths } = placePlantsInBand(band, group, region, zoneWidth, pathWidth);
    allPlacements.push(...placements);
    allPaths.push(...innerPaths);

    const primaryPlaced = placements.filter(p => p.species_id === group.request.species_id).length;
    capacity[group.request.species_id] = {
      requested: group.request.plant_count,
      placed: primaryPlaced,
    };
    if (primaryPlaced < group.request.plant_count) {
      warnings.push(`${group.species.name}: ${group.request.plant_count} requested, ${primaryPlaced} placed`);
    }

    if (group.successor) {
      const succPlaced = placements.filter(p => p.species_id === group.successor!.request.species_id).length;
      capacity[group.successor.request.species_id] = {
        requested: group.successor.request.plant_count,
        placed: succPlaced,
      };
      if (succPlaced < group.successor.request.plant_count) {
        warnings.push(`${group.successor.species.name}: ${group.successor.request.plant_count} requested, ${succPlaced} placed`);
      }
    }
  }

  const infraPlacements = placeInfrastructurePlants(garden, infraRequests);
  allPlacements.push(...infraPlacements);
  for (const p of infraPlacements) {
    if (!capacity[p.species_id]) {
      const req = infraRequests.find(r => r.species_id === p.species_id);
      capacity[p.species_id] = { requested: req?.plant_count ?? 0, placed: 0 };
    }
    capacity[p.species_id]!.placed++;
  }

  return { placements: allPlacements, paths: allPaths, capacity, warnings };
}
