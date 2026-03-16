/**
 * Garden state for the real 30x100 ft garden in Grand Rapids, MI
 *
 * Physical garden (real world):
 *   X: 0=west, 360"=east (30 ft wide)
 *   Y: 0=south, 1200"=north (100 ft long)
 *   South end: 40ft deciduous tree casting shade northward, root competition
 *
 * Zone layout (physY south to north):
 *   0-120:   Dead zone — heavy shade + tree root competition, pathways only
 *   120-240: Shade kale comparison (~20 plants, moderate shade)
 *   240-360: Kale main block (100 plants, full sun)
 *   360-420: Companion buffer (calendula, nasturtium)
 *   420-540: Potato E-W rows (88 plants, full sun)
 *   540-660: Greens — lettuce + spinach (full sun, 45-55ft from tree)
 *   660-1080: Corn field (Nothstine Dent, 18" equidistant, May 25)
 *   Channel east side: Tomato trellis — paste + cherry (May 25)
 *
 * Plant counts driven by PRODUCTION_PLAN (single source of truth).
 * Fall crops share greens zone with spring — subcell overlap is intentional.
 *
 * Screen orientation (data coordinates):
 *   Screen left = North, Screen right = South
 *   Screen top = East, Screen bottom = West
 *   data_x = 1200 - physY  (north-south -> left-right)
 *   data_y = 360 - physX   (east-west -> top-bottom)
 */

import {
  GardenState,
  PlantInstance,
  SubcellState,
  InfrastructureFeature,
  createSubcellId,
  computeSubcellAggregation,
  createGardenStateId,
} from '../types';
import {
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
} from './gardenSpecies';
import { PRODUCTION_PLAN, type CropPlanting } from '../calculators/ProductionTimeline';

// --- Constants ---

const PHYS_WIDTH_IN = 360;   // 30 ft east-west
const PHYS_LENGTH_IN = 1200; // 100 ft north-south

const GRID_WIDTH_FT = 100;   // x-axis on screen (north-south)
const GRID_LENGTH_FT = 30;   // y-axis on screen (east-west)

const SUBCELL_SIZE_IN = 3;
const PROJECTION_DATE = '2025-05-25T00:00:00.000Z';

// Channel path in PHYSICAL coordinates (polyline)
// 24" from east edge (336), bends 96" westward to 240 between physY 660-780
const CHANNEL_PATH_PHYS = [
  { x: 336, y: 0 },
  { x: 336, y: 660 },
  { x: 288, y: 720 },
  { x: 240, y: 780 },
  { x: 240, y: 1200 },
];

// Crop zones limited by channel proximity
const CROP_ZONE_SOUTH_EAST_X = 300;  // physY < 660: channel at 336
const CROP_ZONE_NORTH_EAST_X = 204;  // physY >= 660: channel at 240

// --- Zone Config (single source of truth for layout) ---
// To rearrange the garden: change physY ranges and spacing here.
// Generators read from this config. No procedural code changes needed.

export const ZONE_CONFIG = {
  dead:       { physY: [0, 120]     as [number, number] },
  shade_kale: { physY: [120, 240]   as [number, number], count: 20, spacing: { row: 12, plant: 12 } },
  kale_main:  { physY: [240, 360]   as [number, number], spacing: { row: 12, plant: 12 } },
  buffer:     { physY: [360, 420]   as [number, number] },
  potato:     { physY: [420, 540]   as [number, number], spacing: { row: 30, plant: 12 }, rows: 'ew' as const },
  greens:     { physY: [540, 660]   as [number, number], spacing: { row: 12, plant: 6 } },
  corn:       { physY: [660, 1080]  as [number, number], spacing: { row: 18, plant: 18 } },
};

// --- Planting Dates ---

const CORN_DATE = '2025-05-25';
const POTATO_DATE = '2025-04-20';
const TOMATO_DATE = '2025-05-25';
const COMPANION_DATE = '2025-05-15';
const KALE_DATE = '2025-05-15';

// --- Zone Allocation ---

interface ZonePlantRequest {
  species_id: string;
  plant_count: number;
  planting_date: string;
}

interface ZoneAllocation {
  greens: { lettuce: ZonePlantRequest[]; spinach: ZonePlantRequest[] };
  kale: ZonePlantRequest[];
  potato: ZonePlantRequest[];
  corn: ZonePlantRequest[];
  trellis: { cherry: ZonePlantRequest[]; paste: ZonePlantRequest[] };
}

function extractZoneAllocation(plan: CropPlanting[]): ZoneAllocation {
  const alloc: ZoneAllocation = {
    greens: { lettuce: [], spinach: [] },
    kale: [],
    potato: [],
    corn: [],
    trellis: { cherry: [], paste: [] },
  };

  for (const entry of plan) {
    const req: ZonePlantRequest = {
      species_id: entry.species.id,
      plant_count: entry.plant_count,
      planting_date: entry.planting_date,
    };

    switch (entry.display_group) {
      case 'Lettuce': alloc.greens.lettuce.push(req); break;
      case 'Spinach': alloc.greens.spinach.push(req); break;
      case 'Kale': alloc.kale.push(req); break;
      case 'Potato': alloc.potato.push(req); break;
      case 'Corn': alloc.corn.push(req); break;
      case 'Cherry': alloc.trellis.cherry.push(req); break;
      case 'Paste': alloc.trellis.paste.push(req); break;
    }
  }

  return alloc;
}

// --- Coordinate Transform ---

/**
 * Transform physical garden coordinates to screen data coordinates.
 *
 * Physical: X=0(west)->360(east), Y=0(south)->1200(north)
 * Screen:   x=0(north/left)->1200(south/right), y=0(east/top)->360(west/bottom)
 */
function toScreen(physX: number, physY: number): { x_in: number; y_in: number } {
  return {
    x_in: PHYS_LENGTH_IN - physY,
    y_in: PHYS_WIDTH_IN - physX,
  };
}

/** Transform physical coordinate to screen and snap to subcell grid. */
function toScreenSnapped(physX: number, physY: number): { x_in: number; y_in: number } {
  const s = toScreen(physX, physY);
  return {
    x_in: Math.floor(s.x_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN,
    y_in: Math.floor(s.y_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN,
  };
}

// --- Helpers ---

/** Compute minimum distance from a point to a polyline (in physical coords) */
function distanceToPolylinePhys(
  px: number,
  py: number,
  path: Array<{ x: number; y: number }>
): number {
  let minDist = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const ax = path[i]!.x, ay = path[i]!.y;
    const bx = path[i + 1]!.x, by = path[i + 1]!.y;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    const cx = ax + t * dx, cy = ay + t * dy;
    const dist = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

/**
 * Get the channel center X at a given physY by interpolating the channel path.
 * Straight at physX=336 south of bend, transitions to physX=240 north of bend.
 */
function getChannelCenterX(physY: number): number {
  if (physY <= 660) return 336;
  if (physY >= 780) return 240;
  const t = (physY - 660) / (780 - 660);
  return 336 + (240 - 336) * t;
}

/** Create NxM subcell footprint from a screen position (positive dx/dy direction) */
function createRectFootprint(x_in: number, y_in: number, countX: number, countY: number): string[] {
  const subcells: string[] = [];
  for (let dx = 0; dx < countX; dx++) {
    for (let dy = 0; dy < countY; dy++) {
      subcells.push(createSubcellId(x_in + dx * SUBCELL_SIZE_IN, y_in + dy * SUBCELL_SIZE_IN));
    }
  }
  return subcells;
}

/** Create a standard plant instance with rectangular footprint */
function createPlant(
  plantId: string,
  speciesId: string,
  physX: number,
  physY: number,
  footprintDx: number,
  footprintDy: number,
  plantedDate: string,
): PlantInstance {
  const pos = toScreenSnapped(physX, physY);
  return {
    plant_id: plantId,
    species_id: speciesId,
    root_subcell_id: createSubcellId(pos.x_in, pos.y_in),
    occupied_subcells: createRectFootprint(pos.x_in, pos.y_in, footprintDx, footprintDy),
    planted_date: plantedDate,
    current_stage: 'seed',
    height_cm: 0,
    last_observed: PROJECTION_DATE,
    health_status: 'healthy',
  };
}

// --- Subcell Generation ---

function generateSubcells(): SubcellState[] {
  const subcells: SubcellState[] = [];

  for (let physX = 0; physX < PHYS_WIDTH_IN; physX += SUBCELL_SIZE_IN) {
    for (let physY = 0; physY < PHYS_LENGTH_IN; physY += SUBCELL_SIZE_IN) {
      let sun_hours: number;
      let shade_map: SubcellState['shade_map'];

      if (physY < 120) {
        sun_hours = 4;
        shade_map = {
          summer: { early_morning: true, mid_morning: false, early_afternoon: true, late_afternoon: true },
          winter: { early_morning: true, mid_morning: true, early_afternoon: true, late_afternoon: true },
        };
      } else if (physY < 240) {
        sun_hours = 6;
        shade_map = {
          summer: { early_morning: false, mid_morning: false, early_afternoon: true, late_afternoon: true },
          winter: { early_morning: false, mid_morning: false, early_afternoon: true, late_afternoon: true },
        };
      } else {
        sun_hours = 8;
      }

      let moisture_pct = 50;
      let type: SubcellState['type'] = 'planting';

      const centerPhysX = physX + SUBCELL_SIZE_IN / 2;
      const centerPhysY = physY + SUBCELL_SIZE_IN / 2;
      if (centerPhysX >= 204 && centerPhysX <= 372) {
        const distToChannel = distanceToPolylinePhys(centerPhysX, centerPhysY, CHANNEL_PATH_PHYS);

        if (distToChannel <= 6) {
          type = 'water';
          moisture_pct = 80;
        } else if (distToChannel <= 12) {
          type = 'pathway';
          moisture_pct = 70;
        } else if (distToChannel <= 36) {
          moisture_pct = 70;
        }
      }

      const screen = toScreen(physX, physY);
      const sx = Math.floor(screen.x_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN;
      const sy = Math.floor(screen.y_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN;

      subcells.push({
        subcell_id: createSubcellId(sx, sy),
        position: { x_in: sx, y_in: sy },
        computed: computeSubcellAggregation(sx, sy),
        type,
        soil: {
          N_ppm: 25,
          P_ppm: 40,
          K_ppm: 150,
          pH: 6.5,
          compaction_psi: 0.4,
          organic_matter_pct: 4,
          moisture_pct,
        },
        sun_hours,
        ...(shade_map ? { shade_map } : {}),
      });
    }
  }

  return subcells;
}

// --- Infrastructure Generation ---

function generateInfrastructure(): InfrastructureFeature[] {
  const features: InfrastructureFeature[] = [];

  features.push({
    feature_id: 'channel_1',
    type: 'channel',
    path: CHANNEL_PATH_PHYS.map(p => toScreen(p.x, p.y)),
    width_in: 24,
  });

  features.push({
    feature_id: 'trellis_channel',
    type: 'trellis',
    start: toScreen(CHANNEL_PATH_PHYS[0]!.x, CHANNEL_PATH_PHYS[0]!.y),
    end: toScreen(CHANNEL_PATH_PHYS[CHANNEL_PATH_PHYS.length - 1]!.x, CHANNEL_PATH_PHYS[CHANNEL_PATH_PHYS.length - 1]!.y),
    height_in: 72,
  });

  return features;
}

function generateShadeKalePlants(totalKale: number): PlantInstance[] {
  const plants: PlantInstance[] = [];
  const shadeCount = Math.min(ZONE_CONFIG.shade_kale.count, totalKale);
  let count = 0;

  const { row: skRow, plant: skPlant } = ZONE_CONFIG.shade_kale.spacing;
  for (let physY = ZONE_CONFIG.shade_kale.physY[0]; physY < ZONE_CONFIG.shade_kale.physY[1] && count < shadeCount; physY += skRow) {
    for (let physX = 6; physX < CROP_ZONE_SOUTH_EAST_X && count < shadeCount; physX += skPlant) {
      plants.push(createPlant(
        `kale_shade_${count++}`, KALE_RED_RUSSIAN.id,
        physX, physY, 2, 2, KALE_DATE,
      ));
    }
  }

  return plants;
}

function generateKaleMainPlants(totalKale: number): PlantInstance[] {
  const plants: PlantInstance[] = [];
  const mainCount = Math.max(0, totalKale - ZONE_CONFIG.shade_kale.count);
  let count = 0;

  // 12" spacing both directions
  const { row: kmRow, plant: kmPlant } = ZONE_CONFIG.kale_main.spacing;
  for (let physY = ZONE_CONFIG.kale_main.physY[0]; physY < ZONE_CONFIG.kale_main.physY[1] && count < mainCount; physY += kmRow) {
    for (let physX = 6; physX < CROP_ZONE_SOUTH_EAST_X && count < mainCount; physX += kmPlant) {
      plants.push(createPlant(
        `kale_main_${count++}`, KALE_RED_RUSSIAN.id,
        physX, physY, 2, 2, KALE_DATE,
      ));
    }
  }

  // Marigolds near kale (disrupts cabbage moth host-finding)
  let marigoldCount = 0;
  for (const physX of [6, 90, 174]) {
    plants.push(createPlant(
      `marigold_kale_${marigoldCount++}`, MARIGOLD_FRENCH.id,
      physX, ZONE_CONFIG.kale_main.physY[0] - 6, 2, 2, COMPANION_DATE,
    ));
  }

  return plants;
}

function generateGreensPlants(greens: ZoneAllocation['greens']): PlantInstance[] {
  const plants: PlantInstance[] = [];

  // Grid: 6" in-row (physX), 12" between rows (physY)
  const positions: Array<{ physX: number; physY: number }> = [];
  const { row: gRow, plant: gPlant } = ZONE_CONFIG.greens.spacing;
  for (let physY = ZONE_CONFIG.greens.physY[0]; physY < ZONE_CONFIG.greens.physY[1]; physY += gRow) {
    for (let physX = 6; physX < CROP_ZONE_SOUTH_EAST_X; physX += gPlant) {
      positions.push({ physX, physY });
    }
  }

  // Spring greens (before July)
  const FALL_CUTOFF = '2025-07-01';
  const springReqs = greens.lettuce.filter(r => r.planting_date < FALL_CUTOFF);
  let springIdx = 0;
  let lettuceCount = 0;
  for (const req of springReqs) {
    for (let i = 0; i < req.plant_count && springIdx < positions.length; i++) {
      const pos = positions[springIdx++]!;
      plants.push(createPlant(
        `lettuce_${lettuceCount++}`, req.species_id,
        pos.physX, pos.physY, 2, 2, req.planting_date,
      ));
    }
  }

  // Fall greens (July+) — restart grid, overlaps spring subcells intentionally
  const fallSpinach = greens.spinach.filter(r => r.planting_date >= FALL_CUTOFF);
  const fallLettuce = greens.lettuce.filter(r => r.planting_date >= FALL_CUTOFF);

  let fallIdx = 0;
  let spinachCount = 0;
  let fallLettuceCount = 0;
  for (const req of fallSpinach) {
    for (let i = 0; i < req.plant_count && fallIdx < positions.length; i++) {
      const pos = positions[fallIdx++]!;
      plants.push(createPlant(
        `spinach_${spinachCount++}`, req.species_id,
        pos.physX, pos.physY, 2, 2, req.planting_date,
      ));
    }
  }
  for (const req of fallLettuce) {
    for (let i = 0; i < req.plant_count && fallIdx < positions.length; i++) {
      const pos = positions[fallIdx++]!;
      plants.push(createPlant(
        `lettuce_fall_${fallLettuceCount++}`, req.species_id,
        pos.physX, pos.physY, 2, 2, req.planting_date,
      ));
    }
  }

  return plants;
}

function generatePotatoZonePlants(reqs: ZonePlantRequest[]): PlantInstance[] {
  const plants: PlantInstance[] = [];
  const totalPotatoes = reqs.reduce((sum, r) => sum + r.plant_count, 0);
  const potatoDate = reqs[0]?.planting_date ?? POTATO_DATE;

  let potatoCount = 0;
  let marigoldCount = 0;

  // E-W rows: physY steps by 30" (row spacing), physX steps by 12" (plant spacing)
  const { row: pRow, plant: pPlant } = ZONE_CONFIG.potato.spacing;
  for (let physY = ZONE_CONFIG.potato.physY[0] + 6; potatoCount < totalPotatoes && physY < ZONE_CONFIG.potato.physY[1]; physY += pRow) {
    for (let physX = 18; physX < CROP_ZONE_SOUTH_EAST_X && potatoCount < totalPotatoes; physX += pPlant) {
      plants.push(createPlant(
        `potato_${potatoCount++}`, POTATO_KENNEBEC.id,
        physX, physY, 2, 2, potatoDate,
      ));
    }

    // Marigolds at both ends of every other row (Colorado potato beetle)
    if (Math.floor((physY - ZONE_CONFIG.potato.physY[0]) / 30) % 2 === 0) {
      plants.push(createPlant(
        `marigold_potato_${marigoldCount++}`, MARIGOLD_FRENCH.id,
        6, physY, 2, 2, COMPANION_DATE,
      ));
      plants.push(createPlant(
        `marigold_potato_${marigoldCount++}`, MARIGOLD_FRENCH.id,
        CROP_ZONE_SOUTH_EAST_X, physY, 2, 2, COMPANION_DATE,
      ));
    }
  }

  return plants;
}

function generateCornFieldPlants(reqs: ZonePlantRequest[]): PlantInstance[] {
  const plants: PlantInstance[] = [];
  const totalCorn = reqs.reduce((sum, r) => sum + r.plant_count, 0);
  const cornDate = reqs[0]?.planting_date ?? CORN_DATE;
  let count = 0;

  // 18" equidistant grid, capped at plan count
  const { row: cRow, plant: cPlant } = ZONE_CONFIG.corn.spacing;
  for (let physX = 18; physX <= CROP_ZONE_NORTH_EAST_X && count < totalCorn; physX += cPlant) {
    for (let physY = ZONE_CONFIG.corn.physY[0]; physY <= ZONE_CONFIG.corn.physY[1] && count < totalCorn; physY += cRow) {
      plants.push(createPlant(
        `corn_${count++}`, CORN_NOTHSTINE_DENT.id,
        physX, physY, 2, 2, cornDate,
      ));
    }
  }

  return plants;
}

function generateTrellisPlants(
  cherryReqs: ZonePlantRequest[],
  pasteReqs: ZonePlantRequest[],
): PlantInstance[] {
  const plants: PlantInstance[] = [];

  let sunGoldCount = 0;
  let pasteCount = 0;
  let nasturtiumCount = 0;

  const CHERRY_OFFSET = -12; // physX offset: west of channel center
  const PASTE_OFFSET = 12;   // physX offset: east of channel center
  const cherryTotal = cherryReqs.reduce((sum, r) => sum + r.plant_count, 0);
  const pasteTotal = pasteReqs.reduce((sum, r) => sum + r.plant_count, 0);
  const maxPositions = Math.max(cherryTotal, pasteTotal);

  for (let i = 0; i < maxPositions; i++) {
    const physY = 240 + i * 18;
    const channelX = getChannelCenterX(physY);

    // West side: all Sun Gold cherry tomatoes
    if (i < cherryTotal) {
      const physX = channelX + CHERRY_OFFSET;
      const pos = toScreenSnapped(physX, physY);

      // 2x6 footprint extending eastward (-dy) toward channel
      const occupied_subcells: string[] = [];
      for (let dx = 0; dx < 6; dx += 3) {
        for (let dy = 0; dy < 18; dy += 3) {
          occupied_subcells.push(createSubcellId(pos.x_in + dx, pos.y_in - dy));
        }
      }

      plants.push({
        plant_id: `tomato_sungold_${sunGoldCount++}`,
        species_id: TOMATO_SUN_GOLD.id,
        root_subcell_id: createSubcellId(pos.x_in, pos.y_in),
        occupied_subcells,
        planted_date: TOMATO_DATE,
        current_stage: 'seed',
        height_cm: 0,
        last_observed: PROJECTION_DATE,
        health_status: 'healthy',
      });
    }

    // East side: Amish Paste
    if (i < pasteTotal) {
      const physX = channelX + PASTE_OFFSET;
      const pos = toScreenSnapped(physX, physY);

      // 2x6 footprint extending westward (+dy) toward channel
      const occupied_subcells: string[] = [];
      for (let dx = 0; dx < 6; dx += 3) {
        for (let dy = 0; dy < 18; dy += 3) {
          occupied_subcells.push(createSubcellId(pos.x_in + dx, pos.y_in + dy));
        }
      }

      plants.push({
        plant_id: `tomato_paste_${pasteCount++}`,
        species_id: TOMATO_AMISH_PASTE.id,
        root_subcell_id: createSubcellId(pos.x_in, pos.y_in),
        occupied_subcells,
        planted_date: TOMATO_DATE,
        current_stage: 'seed',
        height_cm: 0,
        last_observed: PROJECTION_DATE,
        health_status: 'healthy',
      });
    }

    // Nasturtium trap crop every 3 cherry positions
    if (i < cherryTotal && i % 3 === 0) {
      const nastPhysX = channelX + CHERRY_OFFSET - 72;
      if (nastPhysX > 0) {
        plants.push(createPlant(
          `nasturtium_trellis_${nasturtiumCount++}`, NASTURTIUM.id,
          nastPhysX, physY, 2, 2, COMPANION_DATE,
        ));
      }
    }
  }

  return plants;
}

function generateBufferZonePlants(): PlantInstance[] {
  const plants: PlantInstance[] = [];

  // Calendula: beneficial insect attractor strip between potato and kale zones
  let calendulaCount = 0;
  for (let physX = 30; physX < CROP_ZONE_SOUTH_EAST_X; physX += 36) {
    plants.push(createPlant(
      `calendula_${calendulaCount++}`, CALENDULA.id,
      physX, ZONE_CONFIG.buffer.physY[0] + 15, 2, 2, COMPANION_DATE,
    ));
  }

  // Nasturtium strip
  let nastCount = 0;
  for (let physX = 30; physX < CROP_ZONE_SOUTH_EAST_X; physX += 36) {
    plants.push(createPlant(
      `nasturtium_buffer_${nastCount++}`, NASTURTIUM.id,
      physX, ZONE_CONFIG.buffer.physY[0] + 30, 2, 2, COMPANION_DATE,
    ));
  }

  return plants;
}

// --- Zone Capacity Validation ---

function validateZoneCapacity(alloc: ZoneAllocation): void {
  const limits: Array<{ name: string; requested: number; capacity: number }> = [
    { name: 'Greens', requested: sumReqs([...alloc.greens.lettuce, ...alloc.greens.spinach]), capacity: 490 },
    { name: 'Kale (total)', requested: sumReqs(alloc.kale), capacity: 270 },
    { name: 'Potato', requested: sumReqs(alloc.potato), capacity: 96 },
    { name: 'Corn', requested: sumReqs(alloc.corn), capacity: 264 },
    { name: 'Cherry trellis', requested: sumReqs(alloc.trellis.cherry), capacity: 53 },
    { name: 'Paste trellis', requested: sumReqs(alloc.trellis.paste), capacity: 53 },
  ];

  for (const { name, requested, capacity } of limits) {
    if (requested > capacity) {
      console.warn(`Zone "${name}" overflow: ${requested} requested, ${capacity} max. Filling to capacity.`);
    }
  }
}

function sumReqs(reqs: ZonePlantRequest[]): number {
  return reqs.reduce((sum, r) => sum + r.plant_count, 0);
}

// --- Main Export ---

/**
 * Create GardenState from a production plan (single source of truth).
 * Plan drives plant counts; zone generators handle physical placement.
 */
export function createGardenStateFromPlan(plan: CropPlanting[]): GardenState {
  const now = new Date().toISOString();
  const allocation = extractZoneAllocation(plan);
  validateZoneCapacity(allocation);

  const totalKale = sumReqs(allocation.kale);

  const subcells = generateSubcells();
  const infrastructure = generateInfrastructure();
  const shadeKale = generateShadeKalePlants(totalKale);
  const kaleMain = generateKaleMainPlants(totalKale);
  const greens = generateGreensPlants(allocation.greens);
  const potatoes = generatePotatoZonePlants(allocation.potato);
  const corn = generateCornFieldPlants(allocation.corn);
  const trellis = generateTrellisPlants(allocation.trellis.cherry, allocation.trellis.paste);
  const buffer = generateBufferZonePlants();
  const plants = [...shadeKale, ...kaleMain, ...greens, ...potatoes, ...corn, ...trellis, ...buffer];

  // Link plants to their root subcells
  const subcellMap = new Map<string, SubcellState>();
  for (const s of subcells) {
    subcellMap.set(s.subcell_id, s);
  }

  for (const plant of plants) {
    const subcell = subcellMap.get(plant.root_subcell_id);
    if (subcell) subcell.plant_id = plant.plant_id;
  }

  return {
    state_id: createGardenStateId('grand-rapids-garden', PROJECTION_DATE, 'projected'),
    schema_version: '1.0',
    storage_strategy: 'snapshot',
    timestamp: PROJECTION_DATE,
    type: 'projected',
    projection_date: now,

    garden_id: 'grand-rapids-garden',

    location: {
      lat: 42.9634,
      lon: -85.6681,
      city: 'Grand Rapids',
      state: 'MI',
      country: 'USA',
      timezone: 'America/Detroit',
    },

    grid: {
      width_ft: GRID_WIDTH_FT,
      length_ft: GRID_LENGTH_FT,
      subcell_size_in: SUBCELL_SIZE_IN,
      total_subcells: subcells.length,
    },

    plants,
    subcells,
    infrastructure,

    environment: {
      temp_f: 68,
      humidity_pct: 60,
      precipitation_in: 0,
      wind_mph: 8,
      soil_temp_f: 62,
      avg_soil_moisture_pct: 50,
    },

    summary: {
      total_plants: plants.length,
      healthy_count: plants.length,
      attention_count: 0,
      critical_count: 0,
      tasks_pending: 0,
      labor_hours_this_week: 0,
      expected_yield_lbs: 0,
    },

    created_at: now,
    updated_at: now,
  };
}

/** Backwards-compatible wrapper. */
export function createSampleGardenState(): GardenState {
  return createGardenStateFromPlan(PRODUCTION_PLAN);
}

/**
 * Get garden description for UI
 */
export function getSampleGardenInfo() {
  return {
    name: 'Garden Plan (3000 sq ft)',
    description: '30x100 ft garden — 11 species across shade, potato, corn, and trellis zones',
    location: 'Grand Rapids, MI',
    crops: [
      'Corn (Nothstine Dent)',
      'Potato (Kennebec)',
      'Tomato (Sun Gold F1)',
      'Tomato (Amish Paste OP)',
      'Lettuce (Black Seeded Simpson)',
      'Kale (Red Russian)',
      'Spinach (Bloomsdale)',
      'French Marigold',
      'Nasturtium',
      'Calendula',
    ],
  };
}
