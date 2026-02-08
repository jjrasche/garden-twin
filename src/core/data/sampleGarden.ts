/**
 * Garden state for the real 40×100 ft garden in Grand Rapids, MI
 *
 * Physical garden (real world):
 *   X: 0=west, 480"=east (40 ft wide)
 *   Y: 0=south, 1200"=north (100 ft long)
 *   South end: Trees casting shade northward
 *   Y 0-240": Lettuce zone (shade-tolerant, succession planted)
 *   Y 240-1200": Three Sisters mounds (west) + tomato trellises (east)
 *   Channel runs along east side, curves west at 60 ft
 *
 * Screen orientation (data coordinates):
 *   Screen left = North, Screen right = South
 *   Screen top = East, Screen bottom = West
 *   data_x = 1200 - physY  (north-south → left-right)
 *   data_y = 480 - physX   (east-west → top-bottom)
 *   Grid: 100ft wide (x) × 40ft tall (y)
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
  LETTUCE_NEVADA,
  TOMATO_CHERRY,
  TOMATO_SAN_MARZANO,
  CORN_DENT,
  BEAN_POLE,
  SQUASH_WINTER,
} from './plantSpecies';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Physical garden dimensions */
const PHYS_WIDTH_IN = 480;   // 40 ft east-west
const PHYS_LENGTH_IN = 1200; // 100 ft north-south

/** Screen grid dimensions (after rotation) */
const GRID_WIDTH_FT = 100;   // x-axis on screen (north-south)
const GRID_LENGTH_FT = 40;   // y-axis on screen (east-west)

const SUBCELL_SIZE_IN = 3;
const PROJECTION_DATE = '2025-05-25T00:00:00.000Z';

// Channel path in PHYSICAL coordinates (polyline)
// Gradual bend between physY=660-780 instead of hard 90° jog at physY=720
const CHANNEL_PATH_PHYS = [
  { x: 456, y: 0 },       // Near east edge at south end (2ft from east edge)
  { x: 456, y: 660 },     // Straight run ends 5ft before bend
  { x: 408, y: 720 },     // Midpoint of bend (halfway between 456 and 360)
  { x: 360, y: 780 },     // Bend completes 5ft after midpoint
  { x: 360, y: 1200 },    // Continues north to end (~10ft from east edge)
];

// Mound grid in PHYSICAL coordinates: 5 columns × 6 rows
const MOUND_COLUMNS_X_PHYS = [30, 90, 150, 210, 270];
const MOUND_ROWS_Y_PHYS = [300, 460, 620, 780, 940, 1100];

// Lettuce succession dates (12 batches, ~2 weeks apart)
const LETTUCE_DATES = [
  '2025-04-01', '2025-04-15', '2025-04-29',
  '2025-05-13', '2025-05-27', '2025-06-10',
  '2025-06-24', '2025-07-08', '2025-07-22',
  '2025-08-05', '2025-08-19', '2025-09-02',
];

// Three Sisters batch corn planting dates
const MOUND_BATCH_DATES = ['2025-05-25', '2025-06-08', '2025-06-22'];

// ─── Coordinate Transform ────────────────────────────────────────────────────

/**
 * Transform physical garden coordinates to screen data coordinates.
 *
 * Physical: X=0(west)→480(east), Y=0(south)→1200(north)
 * Screen:   x=0(north/left)→1200(south/right), y=0(east/top)→480(west/bottom)
 */
function toScreen(physX: number, physY: number): { x_in: number; y_in: number } {
  return {
    x_in: PHYS_LENGTH_IN - physY,
    y_in: PHYS_WIDTH_IN - physX,
  };
}

/**
 * Transform physical coordinate to screen and snap to subcell grid.
 */
function toScreenSnapped(physX: number, physY: number): { x_in: number; y_in: number } {
  const s = toScreen(physX, physY);
  return {
    x_in: Math.floor(s.x_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN,
    y_in: Math.floor(s.y_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Snap a value to the subcell grid */
function snapToSubcell(x: number, y: number): { x_in: number; y_in: number } {
  return {
    x_in: Math.floor(x / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN,
    y_in: Math.floor(y / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN,
  };
}

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

/** Seeded PRNG (mulberry32) — deterministic pseudo-random from integer seed */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate realistic vine sprawl pattern for a squash plant.
 *
 * Instead of a filled circle, generates 3-5 directed vine arms radiating
 * outward from the root position (away from mound center). Each arm has
 * organic sinusoidal curvature and varying length/width, simulating how
 * gardeners train squash vines into gaps between mounds for ground cover.
 */
function generateSquashVineSubcells(
  rootPhysX: number,
  rootPhysY: number,
  moundCenterPhysX: number,
  moundIdx: number
): string[] {
  const rand = mulberry32(moundIdx * 1000 + 42);

  // Direction away from mound center (squash root is at east edge, so "away" ≈ east)
  const awayAngle = Math.atan2(0, rootPhysX - moundCenterPhysX); // ~0 radians (east)

  // Generate 3-5 arms in a 240° fan facing away from mound center
  const numArms = 3 + Math.floor(rand() * 3); // 3, 4, or 5
  const fanSpread = (4 * Math.PI) / 3; // 240 degrees

  const armAngles: number[] = [];
  for (let i = 0; i < numArms; i++) {
    const t = numArms === 1 ? 0.5 : i / (numArms - 1);
    const baseAngle = awayAngle - fanSpread / 2 + t * fanSpread;
    const jitter = (rand() - 0.5) * (Math.PI / 6); // ±15°
    armAngles.push(baseAngle + jitter);
  }

  const subcellSet = new Set<string>();

  for (const angle of armAngles) {
    const armLength = 72 + rand() * 108; // 72-180" (6-15ft)
    const armWidthSubcells = 2 + Math.floor(rand() * 2); // 2-3 subcells wide (6-9")
    const wobbleAmp = rand() * 6; // 0-6" wobble amplitude
    const wobblePeriod = 30 + rand() * 30; // 30-60" wobble period
    const perpAngle = angle + Math.PI / 2;

    for (let step = 0; step <= armLength; step += SUBCELL_SIZE_IN) {
      // Sinusoidal wobble perpendicular to arm direction
      const wobble = wobbleAmp * Math.sin((step / wobblePeriod) * 2 * Math.PI);
      const centerPhysX = rootPhysX + Math.cos(angle) * step + Math.cos(perpAngle) * wobble;
      const centerPhysY = rootPhysY + Math.sin(angle) * step + Math.sin(perpAngle) * wobble;

      // Width: lay subcells perpendicular to vine direction
      for (let w = 0; w < armWidthSubcells; w++) {
        const offset = (w - (armWidthSubcells - 1) / 2) * SUBCELL_SIZE_IN;
        const physX = centerPhysX + Math.cos(perpAngle) * offset;
        const physY = centerPhysY + Math.sin(perpAngle) * offset;

        // Bounds check: stay within garden, avoid water channel zone
        if (physX < 0 || physX >= PHYS_WIDTH_IN) continue;
        if (physY < 0 || physY >= PHYS_LENGTH_IN) continue;
        if (physX >= 432) continue; // Don't sprawl into channel

        const screenPos = toScreenSnapped(physX, physY);
        subcellSet.add(createSubcellId(screenPos.x_in, screenPos.y_in));
      }
    }
  }

  return Array.from(subcellSet);
}

/** Add days to an ISO date string, return new ISO date string */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0] ?? dateStr;
}

// ─── Subcell Generation ──────────────────────────────────────────────────────

function generateSubcells(): SubcellState[] {
  const subcells: SubcellState[] = [];

  // Iterate in PHYSICAL coordinates, then transform to screen
  for (let physX = 0; physX < PHYS_WIDTH_IN; physX += SUBCELL_SIZE_IN) {
    for (let physY = 0; physY < PHYS_LENGTH_IN; physY += SUBCELL_SIZE_IN) {
      // Determine sun hours and shade map by physY (shade from south trees)
      let sun_hours: number;
      let shade_map: SubcellState['shade_map'];

      if (physY < 120) {
        // 0-10 ft from south: Heavy shade (4 hrs sun)
        sun_hours = 4;
        shade_map = {
          summer: { early_morning: true, mid_morning: false, early_afternoon: true, late_afternoon: true },
          winter: { early_morning: true, mid_morning: true, early_afternoon: true, late_afternoon: true },
        };
      } else if (physY < 240) {
        // 10-20 ft from south: Moderate shade (6 hrs sun)
        sun_hours = 6;
        shade_map = {
          summer: { early_morning: false, mid_morning: false, early_afternoon: true, late_afternoon: true },
          winter: { early_morning: false, mid_morning: false, early_afternoon: true, late_afternoon: true },
        };
      } else {
        // 20+ ft from south: Full sun (8 hrs)
        sun_hours = 8;
      }

      // Default soil baseline
      let moisture_pct = 50;
      let type: SubcellState['type'] = 'planting';

      // Channel terrain: fast bounding box pre-check in PHYSICAL coords, then precise distance
      // Channel runs physX=360-456, so only subcells within 36" of that range need checking
      const centerPhysX = physX + SUBCELL_SIZE_IN / 2;
      const centerPhysY = physY + SUBCELL_SIZE_IN / 2;
      if (centerPhysX >= 324 && centerPhysX <= 492) {
        const distToChannel = distanceToPolylinePhys(centerPhysX, centerPhysY, CHANNEL_PATH_PHYS);

        if (distToChannel <= 6) {
          // Center 12" of channel (within 6" of centerline) = water
          type = 'water';
          moisture_pct = 80;
        } else if (distToChannel <= 12) {
          // 6" log border on each side = pathway
          type = 'pathway';
          moisture_pct = 70;
        } else if (distToChannel <= 36) {
          // Moisture bonus zone (within 3 ft of channel)
          moisture_pct = 70;
        }
      }

      // Transform to screen coordinates
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

// ─── Infrastructure Generation ───────────────────────────────────────────────

function generateInfrastructure(): InfrastructureFeature[] {
  const features: InfrastructureFeature[] = [];

  // Drainage channel (transform physical path to screen coords)
  features.push({
    feature_id: 'channel_1',
    type: 'channel',
    path: CHANNEL_PATH_PHYS.map(p => toScreen(p.x, p.y)),
    width_in: 24,
  });

  // Single trellis IN the channel — follows channel path exactly, posts every 10ft
  // The trellis structure IS the channel: posts sit in the water, wire runs between them
  features.push({
    feature_id: 'trellis_channel',
    type: 'trellis',
    start: toScreen(CHANNEL_PATH_PHYS[0]!.x, CHANNEL_PATH_PHYS[0]!.y),
    end: toScreen(CHANNEL_PATH_PHYS[CHANNEL_PATH_PHYS.length - 1]!.x, CHANNEL_PATH_PHYS[CHANNEL_PATH_PHYS.length - 1]!.y),
    height_in: 72,
  });

  // 30 mounds in 5×6 grid (transform each center)
  let moundIdx = 0;
  for (const physY of MOUND_ROWS_Y_PHYS) {
    for (const physX of MOUND_COLUMNS_X_PHYS) {
      features.push({
        feature_id: `mound_${moundIdx}`,
        type: 'mound',
        center: toScreen(physX, physY),
        diameter_in: 36,
        height_in: 8,
      });
      moundIdx++;
    }
  }

  return features;
}

// ─── Plant Generation ────────────────────────────────────────────────────────

function generateLettucePlants(): PlantInstance[] {
  const plants: PlantInstance[] = [];
  const spacing = 6; // 6" = 4 plants/sqft
  let counter = 0;

  for (let batch = 0; batch < LETTUCE_DATES.length; batch++) {
    const plantedDate = LETTUCE_DATES[batch]!;
    // Each batch occupies a 2 ft (24") strip, rotating physY position
    const stripPhysY = batch * 20; // 12 batches × 20" = 240" zone, no overlap
    let plantsInBatch = 0;

    for (let physX = 6; physX < PHYS_WIDTH_IN - 6 && plantsInBatch < 33; physX += spacing) {
      // Skip if this position falls in the channel zone (east side)
      if (physX >= 432 && physX <= 480) continue;

      const pos = toScreenSnapped(physX, stripPhysY + 6);
      const plant_id = `lettuce_${counter++}`;
      const root_subcell_id = createSubcellId(pos.x_in, pos.y_in);

      // 2×2 subcell footprint (6" diameter)
      const occupied_subcells = [
        createSubcellId(pos.x_in, pos.y_in),
        createSubcellId(pos.x_in + 3, pos.y_in),
        createSubcellId(pos.x_in, pos.y_in + 3),
        createSubcellId(pos.x_in + 3, pos.y_in + 3),
      ];

      plants.push({
        plant_id,
        species_id: LETTUCE_NEVADA.id,
        root_subcell_id,
        occupied_subcells,
        planted_date: plantedDate,
        current_stage: 'seed',
        height_cm: 0,
        health_score: 1.0,
        last_observed: PROJECTION_DATE,
        health_status: 'healthy',
      });

      plantsInBatch++;
    }
  }

  return plants;
}

/**
 * Get the channel center X at a given physY by interpolating the channel path.
 * The channel transitions gradually from physX=456 (south) to physX=360 (north)
 * over the bend zone between physY=660 and physY=780.
 */
function getChannelCenterX(physY: number): number {
  if (physY <= 660) return 456;  // South straight segment
  if (physY >= 780) return 360;  // North straight segment
  // Bend zone: linear interpolation from 456 to 360 over physY 660→780
  const t = (physY - 660) / (780 - 660);
  return 456 + (360 - 456) * t; // 456 → 360
}

function generateTomatoPlants(): PlantInstance[] {
  const plants: PlantInstance[] = [];
  let cherryCounter = 0;
  let pasteCounter = 0;

  // Tomatoes flank the channel logs on either side
  // Channel: 12" water center + 6" log border each side = 24" total
  // Cherry planted 15" west of channel center (3" outside west log border)
  // Paste planted 15" east of channel center (3" outside east log border)
  const CHERRY_OFFSET = -12; // At west log boundary (roots at log edge, foliage over water)
  const PASTE_OFFSET = 12;   // At east log boundary (roots at log edge, foliage over water)

  // Plant along channel length, 24" spacing — skip shade zone (physY < 240)
  for (let physY = 240; physY < PHYS_LENGTH_IN; physY += 24) {
    const channelX = getChannelCenterX(physY);

    // Cherry tomato (west side of channel)
    {
      const physX = channelX + CHERRY_OFFSET;
      const pos = toScreenSnapped(physX, physY);
      const plant_id = `tomato_cherry_${cherryCounter++}`;
      const root_subcell_id = createSubcellId(pos.x_in, pos.y_in);

      // Narrow trellis footprint: 2×6 subcells (6" wide × 18" extending EASTWARD over water)
      // Cherry is on the west side → -dy = eastward toward channel
      const occupied_subcells: string[] = [];
      for (let dx = 0; dx < 6; dx += 3) {
        for (let dy = 0; dy < 18; dy += 3) {
          occupied_subcells.push(createSubcellId(pos.x_in + dx, pos.y_in - dy));
        }
      }

      plants.push({
        plant_id,
        species_id: TOMATO_CHERRY.id,
        root_subcell_id,
        occupied_subcells,
        planted_date: '2025-05-25',
        current_stage: 'seed',
        height_cm: 0,
        health_score: 1.0,
        last_observed: PROJECTION_DATE,
        health_status: 'healthy',
      });
    }

    // Paste tomato (east side of channel)
    {
      const physX = channelX + PASTE_OFFSET;
      const pos = toScreenSnapped(physX, physY);
      const plant_id = `tomato_paste_${pasteCounter++}`;
      const root_subcell_id = createSubcellId(pos.x_in, pos.y_in);

      // Narrow trellis footprint: 2×6 subcells (6" wide × 18" extending WESTWARD over water)
      // Paste is on the east side → +dy = westward toward channel
      const occupied_subcells: string[] = [];
      for (let dx = 0; dx < 6; dx += 3) {
        for (let dy = 0; dy < 18; dy += 3) {
          occupied_subcells.push(createSubcellId(pos.x_in + dx, pos.y_in + dy));
        }
      }

      plants.push({
        plant_id,
        species_id: TOMATO_SAN_MARZANO.id,
        root_subcell_id,
        occupied_subcells,
        planted_date: '2025-05-25',
        current_stage: 'seed',
        height_cm: 0,
        health_score: 1.0,
        last_observed: PROJECTION_DATE,
        health_status: 'healthy',
      });
    }
  }

  return plants;
}

function generateThreeSistersPlants(): PlantInstance[] {
  const plants: PlantInstance[] = [];
  let moundIdx = 0;

  for (const physY of MOUND_ROWS_Y_PHYS) {
    for (const physX of MOUND_COLUMNS_X_PHYS) {
      // Determine batch (0-9 = batch 1, 10-19 = batch 2, 20-29 = batch 3)
      const batchNum = Math.floor(moundIdx / 10);
      const cornDate = MOUND_BATCH_DATES[batchNum]!;
      const beanDate = addDays(cornDate, 14);
      const squashDate = addDays(cornDate, 21);
      const moundId = `mound_${moundIdx}`;

      // 6 corn in circle, radius 5" from center, 60° intervals
      const cornIds: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const cornPhysX = physX + Math.cos(angle) * 5;
        const cornPhysY = physY + Math.sin(angle) * 5;
        const pos = toScreenSnapped(cornPhysX, cornPhysY);
        const plant_id = `${moundId}_corn_${i}`;
        cornIds.push(plant_id);

        // 2×2 subcell footprint
        const occupied_subcells = [
          createSubcellId(pos.x_in, pos.y_in),
          createSubcellId(pos.x_in + 3, pos.y_in),
          createSubcellId(pos.x_in, pos.y_in + 3),
          createSubcellId(pos.x_in + 3, pos.y_in + 3),
        ];

        plants.push({
          plant_id,
          species_id: CORN_DENT.id,
          root_subcell_id: createSubcellId(pos.x_in, pos.y_in),
          occupied_subcells,
          planted_date: cornDate,
          current_stage: 'seed',
          height_cm: 0,
          health_score: 1.0,
          last_observed: PROJECTION_DATE,
          health_status: 'healthy',
        });
      }

      // 2 beans at ±6" physX offset from center
      for (let i = 0; i < 2; i++) {
        const beanPhysX = physX + (i === 0 ? -6 : 6);
        const pos = toScreenSnapped(beanPhysX, physY);
        const plant_id = `${moundId}_bean_${i}`;

        // 1×1 subcell footprint (climbs vertically)
        plants.push({
          plant_id,
          species_id: BEAN_POLE.id,
          root_subcell_id: createSubcellId(pos.x_in, pos.y_in),
          occupied_subcells: [createSubcellId(pos.x_in, pos.y_in)],
          planted_date: beanDate,
          current_stage: 'seed',
          height_cm: 0,
          health_score: 1.0,
          last_observed: PROJECTION_DATE,
          health_status: 'healthy',
          // Bean climbs nearest corn stalk
          support_plant_id: cornIds[i * 3],
        });
      }

      // 1 squash at +18" physX from center — vine arms sprawl into gaps between mounds
      {
        const squashPhysX = physX + 18;
        const pos = toScreenSnapped(squashPhysX, physY);
        const plant_id = `${moundId}_squash_0`;

        // Realistic vine sprawl: directed arms growing away from mound center
        const occupied_subcells = generateSquashVineSubcells(
          squashPhysX,
          physY,
          physX, // mound center X (vines grow AWAY from this)
          moundIdx
        );

        plants.push({
          plant_id,
          species_id: SQUASH_WINTER.id,
          root_subcell_id: createSubcellId(pos.x_in, pos.y_in),
          occupied_subcells,
          planted_date: squashDate,
          current_stage: 'seed',
          height_cm: 0,
          health_score: 1.0,
          last_observed: PROJECTION_DATE,
          health_status: 'healthy',
        });
      }

      moundIdx++;
    }
  }

  return plants;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Create the projected GardenState for 2025 season
 *
 * Garden: 40×100 ft (4000 sq ft) in Grand Rapids, MI
 *
 * Screen orientation:
 *   ← North (left)                    South (right) →
 *   ┌──────────────────────────────────────────────────┐  ← East (top)
 *   │               │Cherry│ Channel │Paste│           │
 *   │  Mounds       │ toms │(trellis)│toms │           │
 *   │  (west half)  │      │ in it   │     │           │
 *   │──────────────────────────────── Lettuce ─────────│
 *   └──────────────────────────────────────────────────┘  ← West (bottom)
 */
export function createSampleGardenState(): GardenState {
  const now = new Date().toISOString();

  // Generate all components
  const subcells = generateSubcells();
  const infrastructure = generateInfrastructure();
  const lettuce = generateLettucePlants();
  const tomatoes = generateTomatoPlants();
  const threeSisters = generateThreeSistersPlants();
  const plants = [...lettuce, ...tomatoes, ...threeSisters];

  // Build subcell lookup map for O(1) plant linking
  const subcellMap = new Map<string, SubcellState>();
  for (const s of subcells) {
    subcellMap.set(s.subcell_id, s);
  }

  // Link plants to their root subcells
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
      width_ft: GRID_WIDTH_FT,    // 100 ft (x-axis, north-south)
      length_ft: GRID_LENGTH_FT,   // 40 ft (y-axis, east-west)
      subcell_size_in: SUBCELL_SIZE_IN,
      total_subcells: subcells.length,
    },

    plants,
    subcells,
    infrastructure,

    environment: {
      temp_f: 68,         // Late May in Grand Rapids
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

/**
 * Get garden description for UI
 */
export function getSampleGardenInfo() {
  return {
    name: 'Garden Plan (4000 sq ft)',
    description: '40×100 ft garden with lettuce, tomatoes, and Three Sisters mounds',
    location: 'Grand Rapids, MI',
    crops: [
      'Lettuce (Nevada)',
      'Tomato (Cherry)',
      'Tomato (San Marzano)',
      'Corn (Dent)',
      'Bean (Pole)',
      'Squash (Winter)',
    ],
  };
}
