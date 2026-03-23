/**
 * Garden state for the real 30x100 ft garden in Grand Rapids, MI
 *
 * Thin orchestrator: defines garden geometry → calls layout solver →
 * converts PlantPlacement[] to PlantInstance[] → builds GardenState.
 *
 * No coordinate math here — imports from gardenGeometry.
 * No layout logic here — imports from layoutSolver.
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
import { GARDEN_SPECIES_MAP } from './gardenSpecies';
import { PRODUCTION_PLAN, type CropPlanting } from '../calculators/ProductionTimeline';
import { resolveZoneCompanions } from './companionResolver';
import { solveLayout } from '../layout/layoutSolver';
import type { GardenDefinition, PlantingRequest, PlantPlacement } from '../layout/types';
import {
  toScreen, toScreenSnapped, createSubcellIdFromPhys, interpolatePolylineX,
  distanceToPolyline, PHYS_WIDTH_IN, PHYS_LENGTH_IN, SUBCELL_SIZE_IN,
  widthWestOfPolyline,
  type Polyline,
} from '../geometry/gardenGeometry';

// Re-export for backward compat
export { toScreenSnapped } from '../geometry/gardenGeometry';

// ── Garden Definition ────────────────────────────────────────────────────────

const CHANNEL_PATH: Polyline = [
  { x: 336, y: 0 },
  { x: 336, y: 660 },
  { x: 288, y: 720 },
  { x: 240, y: 780 },
  { x: 240, y: 1200 },
];

const CHANNEL_BUFFER_IN = 36;
const PROJECTION_DATE = '2025-05-25T00:00:00.000Z';
const COMPANION_DATE = '2025-05-15';

const GARDEN_DEFINITION: GardenDefinition = {
  bounds: { width_in: PHYS_WIDTH_IN, length_in: PHYS_LENGTH_IN },
  obstructions: [
    { id: 'dead_zone', type: 'rect', physX: [0, PHYS_WIDTH_IN], physY: [0, 120] },
    { id: 'channel', type: 'polyline_buffer', polyline: CHANNEL_PATH, buffer_in: CHANNEL_BUFFER_IN },
  ],
  infrastructure: [
    {
      id: 'trellis_tunnel',
      type: 'trellis',
      polyline: CHANNEL_PATH,
      species_ids: ['tomato_sun_gold', 'tomato_amish_paste'],
      spacing_in: 18,
      start_physY: 240,
    },
  ],
};

// ── CropPlanting → PlantingRequest ───────────────────────────────────────────

/** Convert CropPlanting[] to PlantingRequest[], linking succession pairs. */
function toPlantingRequests(plantings: CropPlanting[]): PlantingRequest[] {
  const requests: PlantingRequest[] = [];
  const consumed = new Set<number>(); // indices of plantings consumed as successors

  for (let i = 0; i < plantings.length; i++) {
    if (consumed.has(i)) continue;
    const planting = plantings[i]!;

    // Check for explicit successor on this planting
    let successor: PlantingRequest | undefined;
    if (planting.successor) {
      successor = {
        species_id: planting.successor.species.id,
        plant_count: planting.successor.plant_count,
        planting_date: planting.successor.delay_days ? '' : planting.planting_date,
        stagger_days: planting.successor.stagger_days,
        harvest_strategy_id: planting.successor.harvest_strategy_id,
      };
    }

    // Auto-detect succession: same shade tolerance, later planting date, same role
    // (e.g., spring lettuce → fall spinach: both shade_preferred food_crops)
    if (!successor) {
      const primaryShade = planting.species.layout?.shade_tolerance;
      const primaryRole = planting.species.layout?.role;
      for (let j = i + 1; j < plantings.length; j++) {
        if (consumed.has(j)) continue;
        const candidate = plantings[j]!;
        const candShade = candidate.species.layout?.shade_tolerance;
        const candRole = candidate.species.layout?.role;
        if (candShade === primaryShade && candRole === primaryRole
          && candidate.planting_date > planting.planting_date) {
          successor = {
            species_id: candidate.species.id,
            plant_count: candidate.plant_count,
            planting_date: candidate.planting_date,
            stagger_days: candidate.stagger_days,
            harvest_strategy_id: candidate.harvest_strategy_id,
          };
          consumed.add(j);
          break;
        }
      }
    }

    requests.push({
      species_id: planting.species.id,
      plant_count: planting.plant_count,
      planting_date: planting.planting_date,
      stagger_days: planting.stagger_days,
      harvest_strategy_id: planting.harvest_strategy_id,
      successor,
    });
  }

  return requests;
}

// ── PlantPlacement → PlantInstance ───────────────────────────────────────────

function toPlantInstance(placement: PlantPlacement): PlantInstance {
  const pos = toScreenSnapped(placement.physX, placement.physY);
  const occupied = createRectFootprint(pos.x_in, pos.y_in, 2, 2);

  return {
    plant_id: placement.plant_id,
    species_id: placement.species_id,
    root_subcell_id: createSubcellId(pos.x_in, pos.y_in),
    occupied_subcells: occupied,
    planted_date: placement.planted_date,
    current_stage: 'seed',
    accumulated_gdd: 0,
    measurements: { height_cm: 0 },
    last_observed: PROJECTION_DATE,
    health_status: 'healthy',
    harvest_strategy_id: placement.harvest_strategy_id,
    position: { physX: placement.physX, physY: placement.physY },
    density_plants_per_sqft: placement.density_plants_per_sqft,
  };
}

function createRectFootprint(x_in: number, y_in: number, dx: number, dy: number): string[] {
  const subcells: string[] = [];
  for (let ix = 0; ix < dx; ix++) {
    for (let iy = 0; iy < dy; iy++) {
      subcells.push(createSubcellId(x_in + ix * SUBCELL_SIZE_IN, y_in + iy * SUBCELL_SIZE_IN));
    }
  }
  return subcells;
}

// ── Subcell Generation (from layout zones + paths) ───────────────────────────

function generateSubcells(
  paths: import('../layout/types').PathSegment[],
): SubcellState[] {
  const subcells: SubcellState[] = [];

  // Build path lookup: which physY ranges are paths?
  const pathRanges = paths.map(p => ({
    yMin: p.physY - p.width_in / 2,
    yMax: p.physY + p.width_in / 2,
    xMin: p.physX[0],
    xMax: p.physX[1],
  }));

  for (let physX = 0; physX < PHYS_WIDTH_IN; physX += SUBCELL_SIZE_IN) {
    for (let physY = 0; physY < PHYS_LENGTH_IN; physY += SUBCELL_SIZE_IN) {
      const centerX = physX + SUBCELL_SIZE_IN / 2;
      const centerY = physY + SUBCELL_SIZE_IN / 2;

      // Determine subcell type
      let type: SubcellState['type'] = 'planting';

      // Check channel proximity
      const distToChannel = distanceToPolyline(centerX, centerY, CHANNEL_PATH);
      if (distToChannel <= 6) {
        type = 'water';
      } else if (distToChannel <= 12) {
        type = 'pathway';
      }

      // Check if in a path
      if (type === 'planting') {
        for (const pr of pathRanges) {
          if (centerY >= pr.yMin && centerY <= pr.yMax && centerX >= pr.xMin && centerX <= pr.xMax) {
            type = 'pathway';
            break;
          }
        }
      }

      // Dead zone
      if (physY < 120) type = 'tree';

      // Shade map
      let shade_map: SubcellState['shade_map'];
      if (physY < 120) {
        shade_map = {
          summer: { early_morning: true, mid_morning: false, early_afternoon: true, late_afternoon: true },
          winter: { early_morning: true, mid_morning: true, early_afternoon: true, late_afternoon: true },
        };
      } else if (physY < 240) {
        shade_map = {
          summer: { early_morning: false, mid_morning: false, early_afternoon: true, late_afternoon: true },
          winter: { early_morning: false, mid_morning: false, early_afternoon: true, late_afternoon: true },
        };
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
          N_ppm: 25, P_ppm: 40, K_ppm: 150, pH: 6.5,
          compaction_psi: 0.4, organic_matter_pct: 4,
        },
        ...(shade_map ? { shade_map } : {}),
      });
    }
  }

  return subcells;
}

// ── Infrastructure ───────────────────────────────────────────────────────────

function generateInfrastructure(): InfrastructureFeature[] {
  return [
    {
      feature_id: 'channel_1',
      type: 'channel',
      path: CHANNEL_PATH.map(p => toScreen(p.x, p.y)),
      width_in: 24,
    },
    {
      feature_id: 'trellis_tunnel',
      type: 'trellis',
      start: toScreen(CHANNEL_PATH[0]!.x, CHANNEL_PATH[0]!.y),
      end: toScreen(CHANNEL_PATH[CHANNEL_PATH.length - 1]!.x, CHANNEL_PATH[CHANNEL_PATH.length - 1]!.y),
      height_in: 72,
    },
  ];
}

// ── Companion Resolution ─────────────────────────────────────────────────────

/** Derive species group boundaries from placements and place companions at borders. */
function resolveAllCompanions(placements: PlantPlacement[]): PlantInstance[] {
  // Group placements by species to find each species' spatial extent
  const extents = new Map<string, { minY: number; maxY: number; species_ids: string[] }>();
  for (const p of placements) {
    const ext = extents.get(p.species_id);
    if (ext) {
      ext.minY = Math.min(ext.minY, p.physY);
      ext.maxY = Math.max(ext.maxY, p.physY);
    } else {
      extents.set(p.species_id, { minY: p.physY, maxY: p.physY, species_ids: [p.species_id] });
    }
  }

  const plants: PlantInstance[] = [];
  for (const [speciesId, ext] of extents) {
    const midY = (ext.minY + ext.maxY) / 2;
    const eastX = widthWestOfPolyline(midY, CHANNEL_PATH, CHANNEL_BUFFER_IN);
    plants.push(...resolveZoneCompanions(
      speciesId, [speciesId], [ext.minY, ext.maxY], eastX,
      GARDEN_SPECIES_MAP, COMPANION_DATE,
    ));
  }
  return plants;
}

// ── Exports ──────────────────────────────────────────────────────────────────

export function getChannelCenterX(physY: number): number {
  return interpolatePolylineX(physY, CHANNEL_PATH);
}

export function createGardenStateFromPlan(plan: CropPlanting[]): GardenState {
  const now = new Date().toISOString();

  const requests = toPlantingRequests(plan);
  const layout = solveLayout(GARDEN_DEFINITION, requests, GARDEN_SPECIES_MAP);

  if (layout.warnings.length > 0) {
    for (const w of layout.warnings) console.warn(`Layout: ${w}`);
  }

  const layoutPlants = layout.placements.map(toPlantInstance);
  const companions = resolveAllCompanions(layout.placements);
  const plants = [...layoutPlants, ...companions];

  const subcells = generateSubcells(layout.paths);
  const infrastructure = generateInfrastructure();

  // Link plants to root subcells
  const subcellMap = new Map<string, SubcellState>();
  for (const s of subcells) subcellMap.set(s.subcell_id, s);
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
      lat: 42.9634, lon: -85.6681,
      city: 'Grand Rapids', state: 'MI', country: 'USA',
      timezone: 'America/Detroit',
    },
    grid: {
      width_ft: 100, length_ft: 30,
      subcell_size_in: SUBCELL_SIZE_IN,
      total_subcells: subcells.length,
    },
    plants, subcells, infrastructure,
    created_at: now, updated_at: now,
  };
}

export function createSampleGardenState(): GardenState {
  return createGardenStateFromPlan(PRODUCTION_PLAN);
}

export function getSampleGardenInfo() {
  return {
    name: 'Garden Plan (3000 sq ft)',
    description: '30x100 ft garden — polygon-based layout, 11 species',
    location: 'Grand Rapids, MI',
    crops: [
      'Corn (Nothstine Dent)', 'Potato (Kennebec)',
      'Tomato (Sun Gold F1)', 'Tomato (Amish Paste OP)',
      'Lettuce (Black Seeded Simpson)', 'Kale (Red Russian)',
      'Spinach (Bloomsdale)', 'French Marigold', 'Nasturtium', 'Calendula',
    ],
  };
}
