/**
 * Zone Optimizer
 *
 * Finds optimal crop-to-zone assignments by computing yield per square foot
 * for each food crop at each garden position, accounting for the sun gradient
 * and soil conditions already defined in the subcell data.
 *
 * Technique: greedy crossover analysis on a 1D sun gradient.
 * The sun gradient is monotonically increasing south-to-north.
 * Each crop's yield response to sun is monotonic. The optimal
 * assignment places shade-tolerant crops south, sun-lovers north.
 * Zone boundaries fall where one crop's yield/sqft overtakes another.
 *
 * Companion plants (marigold, nasturtium, calendula) are interplanted
 * within food crop zones, not assigned their own zones.
 * Tomatoes are fixed to the trellis (channel infrastructure).
 */

import { PlantSpecies } from '../types';
import { computePlantYield } from '../calculators/yieldModel';

import { CORN_NOTHSTINE_DENT } from '../data/species/corn-nothstine-dent';
import { POTATO_KENNEBEC } from '../data/species/potato-kennebec';
import { LETTUCE_BSS } from '../data/species/lettuce-bss';
import { KALE_RED_RUSSIAN } from '../data/species/kale-red-russian';
import { SPINACH_BLOOMSDALE } from '../data/species/spinach-bloomsdale';
import { TOMATO_SUN_GOLD } from '../data/species/tomato-sun-gold';
import { TOMATO_AMISH_PASTE } from '../data/species/tomato-amish-paste';

// ── Garden Dimensions ────────────────────────────────────────────────────────

const PHYS_WIDTH_IN = 360;     // 30ft east-west
const PHYS_LENGTH_IN = 1200;   // 100ft north-south
const ROW_HEIGHT_IN = 12;      // 1ft rows for optimization granularity

// Channel center physX at a given physY (matches sampleGarden.ts)
function channelCenterX(physY: number): number {
  if (physY <= 660) return 336;
  if (physY >= 780) return 240;
  // Linear interpolation through bend
  const t = (physY - 660) / (780 - 660);
  return 336 + t * (240 - 336);
}

// Usable crop width at a given physY (excluding channel + buffer)
function cropWidthIn(physY: number): number {
  const channelX = channelCenterX(physY);
  // Crops can go from physX=0 to channelX - 36 (24" channel + 12" buffer)
  return Math.max(0, channelX - 36);
}

// ── Environment Model ────────────────────────────────────────────────────────

interface SoilConditions {
  N_ppm: number;
  P_ppm: number;
  K_ppm: number;
  pH: number;
  compaction_psi: number;
}

interface Environment {
  sun_hours: number;
  soil: SoilConditions;
}

// Baseline soil (matches sampleGarden.ts subcell defaults)
const BASELINE_SOIL: SoilConditions = {
  N_ppm: 25,
  P_ppm: 40,
  K_ppm: 150,
  pH: 6.5,
  compaction_psi: 0.4,
};

// North 50ft (physY 600+): buckwheat accumulated P, radish broke compaction
const COVER_CROP_SOIL: SoilConditions = {
  N_ppm: 25,
  P_ppm: 52,            // buckwheat root exudates solubilize rock P (~30% boost)
  K_ppm: 150,
  pH: 6.5,
  compaction_psi: 0.15,  // tillage radish breaks hardpan
};

function sunHoursAt(physY: number): number {
  if (physY < 120) return 4;
  if (physY < 240) return 6;
  return 8;
}

function soilAt(physY: number): SoilConditions {
  return physY >= 600 ? COVER_CROP_SOIL : BASELINE_SOIL;
}

function environmentAt(physY: number): Environment {
  return { sun_hours: sunHoursAt(physY), soil: soilAt(physY) };
}

// ── Yield Estimator ──────────────────────────────────────────────────────────

/** Expected lbs per square foot at given conditions. */
function lbsPerSqFt(species: PlantSpecies, env: Environment): number {
  return computePlantYield(species, {
    sun_hours: env.sun_hours,
    soil: env.soil,
    spacing_plants_per_sq_ft: species.plants_per_sq_ft,
  }) * species.plants_per_sq_ft;
}

/** Expected calories per square foot at given conditions. */
function calPerSqFt(species: PlantSpecies, env: Environment): number {
  return lbsPerSqFt(species, env) * species.nutrition_per_lb.calories;
}

// ── Zone Optimizer ───────────────────────────────────────────────────────────

/** Food crops eligible for zone assignment. Tomatoes are trellis-fixed. */
const ZONE_CROPS: PlantSpecies[] = [
  LETTUCE_BSS,
  SPINACH_BLOOMSDALE,
  KALE_RED_RUSSIAN,
  POTATO_KENNEBEC,
  CORN_NOTHSTINE_DENT,
];

const TRELLIS_CROPS: PlantSpecies[] = [
  TOMATO_SUN_GOLD,
  TOMATO_AMISH_PASTE,
];

interface ZoneResult {
  species: PlantSpecies;
  physY_start: number;
  physY_end: number;
  area_sq_ft: number;
  expected_lbs: number;
  expected_cal: number;
  avg_sun_hours: number;
  avg_per_plant_lbs: number;
}

interface TrellisResult {
  species: PlantSpecies;
  plant_count: number;
  expected_lbs: number;
  expected_cal: number;
}

interface OptimizationResult {
  zones: ZoneResult[];
  trellis: TrellisResult[];
  total_lbs: number;
  total_cal: number;
  total_area_sq_ft: number;
}

/**
 * Score every 1ft row for every food crop.
 * Returns a 2D array: rows[rowIndex][cropIndex] = lbs for that row.
 */
function scoreAllRows(): { lbs: number[][]; cal: number[][]; areas: number[] } {
  const rowCount = Math.floor(PHYS_LENGTH_IN / ROW_HEIGHT_IN);
  const lbs: number[][] = [];
  const cal: number[][] = [];
  const areas: number[] = [];

  for (let row = 0; row < rowCount; row++) {
    const physY = row * ROW_HEIGHT_IN + ROW_HEIGHT_IN / 2; // row center
    const env = environmentAt(physY);
    const widthIn = cropWidthIn(physY);
    const areaSqFt = (widthIn * ROW_HEIGHT_IN) / 144;

    areas.push(areaSqFt);

    const rowLbs: number[] = [];
    const rowCal: number[] = [];
    for (const crop of ZONE_CROPS) {
      rowLbs.push(lbsPerSqFt(crop, env) * areaSqFt);
      rowCal.push(calPerSqFt(crop, env) * areaSqFt);
    }
    lbs.push(rowLbs);
    cal.push(rowCal);
  }

  return { lbs, cal, areas };
}

/**
 * Dynamic programming optimizer.
 *
 * Assigns each row to exactly one food crop. Crops must form contiguous zones.
 * Each crop can appear in at most one zone. Maximizes total calories.
 *
 * State: dp[row][cropSet] where cropSet is a bitmask of crops already used.
 * But with only 5 crops, the bitmask has 32 states, making this trivially fast.
 *
 * Simplified: since sun is monotonically increasing and all crops have monotonic
 * sun curves, the optimal crop ordering is fixed. We just need boundary positions.
 * Use a sweep approach: try all possible boundary combinations.
 */
function optimizeZones(): OptimizationResult {
  const { lbs, cal, areas } = scoreAllRows();
  const rowCount = lbs.length;
  const cropCount = ZONE_CROPS.length;

  // Precompute prefix sums for each crop's cal and lbs contribution
  // prefixCal[cropIdx][row] = sum of cal for that crop from row 0..row-1
  const prefixCal: number[][] = Array.from({ length: cropCount }, () =>
    new Array(rowCount + 1).fill(0),
  );
  const prefixLbs: number[][] = Array.from({ length: cropCount }, () =>
    new Array(rowCount + 1).fill(0),
  );

  for (let c = 0; c < cropCount; c++) {
    for (let r = 0; r < rowCount; r++) {
      prefixCal[c]![r + 1] = prefixCal[c]![r]! + cal[r]![c]!;
      prefixLbs[c]![r + 1] = prefixLbs[c]![r]! + lbs[r]![c]!;
    }
  }

  // Range sum helpers
  function rangeCal(cropIdx: number, startRow: number, endRow: number): number {
    return prefixCal[cropIdx]![endRow]! - prefixCal[cropIdx]![startRow]!;
  }
  function rangeLbs(cropIdx: number, startRow: number, endRow: number): number {
    return prefixLbs[cropIdx]![endRow]! - prefixLbs[cropIdx]![startRow]!;
  }

  // Try all permutations of crops and all boundary positions.
  // With 5 crops, there are 120 permutations. For each permutation,
  // find optimal boundaries using the prefix sums.
  //
  // For a given ordering [c0, c1, c2, c3, c4], we need 4 boundaries
  // b1 <= b2 <= b3 <= b4 splitting rows into 5 contiguous segments.
  // Each crop gets segment [b_{i}, b_{i+1}).
  //
  // Optimize by nested iteration. With 100 rows and 4 boundaries,
  // worst case is C(100,4) = 3.9M per permutation × 120 = 470M.
  // Too slow. Use DP instead.
  //
  // DP approach: dp[i][k] = max cal using crops perm[0..k-1] for rows 0..i-1
  // where crop perm[k-1] occupies the last contiguous block.
  // Transition: dp[i][k] = max over j < i of (dp[j][k-1] + rangeCal(perm[k-1], j, i))

  let bestTotalCal = -1;
  let bestAssignment: { cropIdx: number; startRow: number; endRow: number }[] = [];

  // Generate permutations of [0, 1, 2, 3, 4]
  function permutations(arr: number[]): number[][] {
    if (arr.length <= 1) return [arr];
    const result: number[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const perm of permutations(rest)) {
        result.push([arr[i]!, ...perm]);
      }
    }
    return result;
  }

  const allPerms = permutations(ZONE_CROPS.map((_, i) => i));

  for (const perm of allPerms) {
    // DP: dp[i][k] = max cal placing perm[0..k-1] in rows 0..i-1
    // boundaries[i][k] = the row where crop perm[k-1] starts
    const dp: number[][] = Array.from({ length: rowCount + 1 }, () =>
      new Array(cropCount + 1).fill(-Infinity),
    );
    const boundary: number[][] = Array.from({ length: rowCount + 1 }, () =>
      new Array(cropCount + 1).fill(0),
    );

    dp[0]![0] = 0;

    for (let k = 1; k <= cropCount; k++) {
      const cropIdx = perm[k - 1]!;
      for (let i = k; i <= rowCount; i++) {
        // Crop perm[k-1] occupies rows j..i-1
        for (let j = k - 1; j < i; j++) {
          if (dp[j]![k - 1]! === -Infinity) continue;
          const candidate = dp[j]![k - 1]! + rangeCal(cropIdx, j, i);
          if (candidate > dp[i]![k]!) {
            dp[i]![k] = candidate;
            boundary[i]![k] = j;
          }
        }
      }
    }

    if (dp[rowCount]![cropCount]! > bestTotalCal) {
      bestTotalCal = dp[rowCount]![cropCount]!;
      // Reconstruct assignment
      bestAssignment = [];
      let endRow = rowCount;
      for (let k = cropCount; k >= 1; k--) {
        const startRow = boundary[endRow]![k]!;
        bestAssignment.unshift({
          cropIdx: perm[k - 1]!,
          startRow,
          endRow,
        });
        endRow = startRow;
      }
    }
  }

  // Build zone results
  const zones: ZoneResult[] = bestAssignment
    .filter((a) => a.endRow > a.startRow)
    .map((a) => {
      const species = ZONE_CROPS[a.cropIdx]!;
      const physY_start = a.startRow * ROW_HEIGHT_IN;
      const physY_end = a.endRow * ROW_HEIGHT_IN;
      let totalArea = 0;
      let totalLbs = 0;
      let totalCal = 0;
      let sunSum = 0;
      let multSum = 0;
      let rowsInZone = 0;

      for (let r = a.startRow; r < a.endRow; r++) {
        totalArea += areas[r]!;
        totalLbs += lbs[r]![a.cropIdx]!;
        totalCal += cal[r]![a.cropIdx]!;
        const physY = r * ROW_HEIGHT_IN + ROW_HEIGHT_IN / 2;
        sunSum += sunHoursAt(physY);
        const rowEnv = environmentAt(physY);
        multSum += computePlantYield(species, {
          sun_hours: rowEnv.sun_hours, soil: rowEnv.soil,
          spacing_plants_per_sq_ft: species.plants_per_sq_ft,
        });
        rowsInZone++;
      }

      return {
        species,
        physY_start,
        physY_end,
        area_sq_ft: totalArea,
        expected_lbs: totalLbs,
        expected_cal: totalCal,
        avg_sun_hours: sunSum / rowsInZone,
        avg_per_plant_lbs: multSum / rowsInZone,
      };
    });

  // Trellis tomatoes (fixed to channel, 18" spacing, physY 240-1200)
  const trellisSpacingIn = 18;
  const trellisStartY = 240;
  const trellis: TrellisResult[] = [];
  let trellisLbsTotal = 0;
  let trellisCalTotal = 0;

  // West side: Sun Gold cherry tomatoes
  // East side: Amish Paste
  let westCount = 0;
  let eastCount = 0;
  for (let physY = trellisStartY; physY < PHYS_LENGTH_IN; physY += trellisSpacingIn) {
    westCount++;
    eastCount++;
  }

  for (const { species, count } of [
    { species: TOMATO_SUN_GOLD, count: westCount },
    { species: TOMATO_AMISH_PASTE, count: eastCount },
  ]) {
    // Average environment along trellis (mostly full sun)
    const avgEnv = environmentAt(720); // midpoint of trellis run
    const plantLbs = computePlantYield(species, {
      sun_hours: avgEnv.sun_hours, soil: avgEnv.soil,
      spacing_plants_per_sq_ft: species.plants_per_sq_ft,
    });
    const totalLbs = plantLbs * count;
    const totalCal = totalLbs * species.nutrition_per_lb.calories;

    trellis.push({
      species,
      plant_count: count,
      expected_lbs: totalLbs,
      expected_cal: totalCal,
    });

    trellisLbsTotal += totalLbs;
    trellisCalTotal += totalCal;
  }

  const zoneLbs = zones.reduce((sum, z) => sum + z.expected_lbs, 0);
  const zoneCal = zones.reduce((sum, z) => sum + z.expected_cal, 0);
  const zoneArea = zones.reduce((sum, z) => sum + z.area_sq_ft, 0);

  return {
    zones,
    trellis,
    total_lbs: zoneLbs + trellisLbsTotal,
    total_cal: zoneCal + trellisCalTotal,
    total_area_sq_ft: zoneArea,
  };
}

// ── Yield Comparison Table ────────────────────────────────────────────────────

/** Per-crop yield at each sun level for side-by-side comparison. */
function formatYieldTable(): string {
  const sunLevels = [4, 6, 8];
  const allCrops = [...ZONE_CROPS, ...TRELLIS_CROPS];
  const lines: string[] = [];

  lines.push('=== Yield Comparison Table ===');
  lines.push('');
  lines.push('lbs/sqft at each sun level (soil: N=25, P=40, K=150, pH=6.5):');
  lines.push('');

  // Header
  const nameWidth = 28;
  const colWidth = 12;
  let header = 'Crop'.padEnd(nameWidth);
  for (const sun of sunLevels) header += `${sun}h sun`.padStart(colWidth);
  header += 'cal/lb'.padStart(colWidth);
  header += 'cal/sqft@8h'.padStart(colWidth);
  lines.push(header);
  lines.push('-'.repeat(header.length));

  for (const crop of allCrops) {
    let row = `${crop.icon.emoji} ${crop.name}`.slice(0, nameWidth).padEnd(nameWidth);
    for (const sun of sunLevels) {
      const env: Environment = { sun_hours: sun, soil: BASELINE_SOIL };
      const val = lbsPerSqFt(crop, env);
      row += val.toFixed(3).padStart(colWidth);
    }
    row += crop.nutrition_per_lb.calories.toString().padStart(colWidth);
    const env8: Environment = { sun_hours: 8, soil: BASELINE_SOIL };
    row += calPerSqFt(crop, env8).toFixed(0).padStart(colWidth);
    lines.push(row);
  }

  lines.push('');
  lines.push('Cover crop soil bonus (physY 600+, P=52, compaction=0.15):');

  let bonusHeader = 'Crop'.padEnd(nameWidth);
  bonusHeader += 'lbs/sqft'.padStart(colWidth);
  bonusHeader += 'cal/sqft'.padStart(colWidth);
  bonusHeader += 'vs baseline'.padStart(colWidth);
  lines.push(bonusHeader);
  lines.push('-'.repeat(bonusHeader.length));

  for (const crop of [POTATO_KENNEBEC, CORN_NOTHSTINE_DENT]) {
    const baseEnv: Environment = { sun_hours: 8, soil: BASELINE_SOIL };
    const coverEnv: Environment = { sun_hours: 8, soil: COVER_CROP_SOIL };
    const baseCal = calPerSqFt(crop, baseEnv);
    const coverCal = calPerSqFt(crop, coverEnv);
    const pctBoost = ((coverCal / baseCal - 1) * 100).toFixed(1);

    let row = `${crop.icon.emoji} ${crop.name}`.slice(0, nameWidth).padEnd(nameWidth);
    row += lbsPerSqFt(crop, coverEnv).toFixed(3).padStart(colWidth);
    row += coverCal.toFixed(0).padStart(colWidth);
    row += `+${pctBoost}%`.padStart(colWidth);
    lines.push(row);
  }

  return lines.join('\n');
}

// ── Current Layout Estimator ─────────────────────────────────────────────────

interface CurrentZone {
  name: string;
  species: PlantSpecies;
  physY_start: number;
  physY_end: number;
}

/** The zone boundaries from the current sampleGarden.ts layout. */
const CURRENT_ZONES: CurrentZone[] = [
  { name: 'Shade zone (lettuce)', species: LETTUCE_BSS, physY_start: 0, physY_end: 240 },
  { name: 'Shade zone (spinach)', species: SPINACH_BLOOMSDALE, physY_start: 0, physY_end: 240 },
  { name: 'Shade zone (kale)', species: KALE_RED_RUSSIAN, physY_start: 0, physY_end: 240 },
  { name: 'Potato zone', species: POTATO_KENNEBEC, physY_start: 270, physY_end: 540 },
  { name: 'Corn field', species: CORN_NOTHSTINE_DENT, physY_start: 600, physY_end: 1080 },
];

/** Estimate yields for the current layout zones. */
function estimateCurrentLayout(): string {
  const lines: string[] = [];
  lines.push('=== Current Layout Yield Estimate ===');
  lines.push('');

  let grandTotalLbs = 0;
  let grandTotalCal = 0;

  // Shade zone: lettuce/spinach/kale share the space
  // 12 succession batches, each 20" strip, ~33 plants each
  // Approximately: lettuce gets 8 batches, spinach 2, kale 2 (from sampleGarden.ts)
  const shadeSpecies: { species: PlantSpecies; batchCount: number }[] = [
    { species: LETTUCE_BSS, batchCount: 8 },
    { species: SPINACH_BLOOMSDALE, batchCount: 2 },
    { species: KALE_RED_RUSSIAN, batchCount: 2 },
  ];

  lines.push('-- Shade Zone (physY 0-240, 20ft) --');
  for (const { species, batchCount } of shadeSpecies) {
    const plantsPerBatch = 33;
    const plantCount = plantsPerBatch * batchCount;
    // Average sun across shade zone
    const avgEnv = environmentAt(120); // midpoint
    const plantLbs = computePlantYield(species, {
      sun_hours: avgEnv.sun_hours, soil: avgEnv.soil,
      spacing_plants_per_sq_ft: species.plants_per_sq_ft,
    });
    const totalLbs = plantLbs * plantCount;
    const totalCal = totalLbs * species.nutrition_per_lb.calories;

    lines.push(`  ${species.icon.emoji} ${species.name}: ${plantCount} plants, ${totalLbs.toFixed(0)} lbs, ${totalCal.toFixed(0)} cal`);
    grandTotalLbs += totalLbs;
    grandTotalCal += totalCal;
  }

  // Potato zone: 7 rows × 30" spacing, 12" plant spacing, physY 276-540
  lines.push('');
  lines.push('-- Potato Zone (physY 270-540, 22.5ft) --');
  {
    const rowCount = 7;
    const plantsPerRow = Math.floor((540 - 276) / 12);
    const plantCount = rowCount * plantsPerRow;
    const avgEnv = environmentAt(405); // midpoint
    const plantLbs = computePlantYield(POTATO_KENNEBEC, {
      sun_hours: avgEnv.sun_hours, soil: avgEnv.soil,
      spacing_plants_per_sq_ft: POTATO_KENNEBEC.plants_per_sq_ft,
    });
    const totalLbs = plantLbs * plantCount;
    const totalCal = totalLbs * POTATO_KENNEBEC.nutrition_per_lb.calories;

    lines.push(`  ${POTATO_KENNEBEC.icon.emoji} ${POTATO_KENNEBEC.name}: ${plantCount} plants, ${totalLbs.toFixed(0)} lbs, ${totalCal.toFixed(0)} cal`);
    grandTotalLbs += totalLbs;
    grandTotalCal += totalCal;
  }

  // Corn field: 18" grid, physX 18-204, physY 600-1068
  lines.push('');
  lines.push('-- Corn Field (physY 600-1080, 40ft) --');
  {
    const colCount = Math.floor((204 - 18) / 18) + 1; // physX 18 to 204 at 18" spacing
    const rowCount = Math.floor((1068 - 600) / 18) + 1;
    const plantCount = colCount * rowCount;
    const avgEnv = environmentAt(840); // midpoint
    const plantLbs = computePlantYield(CORN_NOTHSTINE_DENT, {
      sun_hours: avgEnv.sun_hours, soil: avgEnv.soil,
      spacing_plants_per_sq_ft: CORN_NOTHSTINE_DENT.plants_per_sq_ft,
    });
    const totalLbs = plantLbs * plantCount;
    const totalCal = totalLbs * CORN_NOTHSTINE_DENT.nutrition_per_lb.calories;

    lines.push(`  ${CORN_NOTHSTINE_DENT.icon.emoji} ${CORN_NOTHSTINE_DENT.name}: ${plantCount} plants, ${totalLbs.toFixed(0)} lbs, ${totalCal.toFixed(0)} cal`);
    grandTotalLbs += totalLbs;
    grandTotalCal += totalCal;
  }

  // Trellis tomatoes: 18" spacing, physY 240-1200
  lines.push('');
  lines.push('-- Trellis Tomatoes (physY 240-1200, along channel) --');
  {
    let count = 0;
    for (let physY = 240; physY < PHYS_LENGTH_IN; physY += 18) count++;

    const pasteCount = count;

    for (const { species, plantCount } of [
      { species: TOMATO_SUN_GOLD, plantCount: count },
      { species: TOMATO_AMISH_PASTE, plantCount: pasteCount },
    ]) {
      const avgEnv = environmentAt(720);
      const plantLbs = computePlantYield(species, {
        sun_hours: avgEnv.sun_hours, soil: avgEnv.soil,
        spacing_plants_per_sq_ft: species.plants_per_sq_ft,
      });
      const totalLbs = plantLbs * plantCount;
      const totalCal = totalLbs * species.nutrition_per_lb.calories;

      lines.push(`  ${species.icon.emoji} ${species.name}: ${plantCount} plants, ${totalLbs.toFixed(0)} lbs, ${totalCal.toFixed(0)} cal`);
      grandTotalLbs += totalLbs;
      grandTotalCal += totalCal;
    }
  }

  lines.push('');
  lines.push(`TOTAL: ${grandTotalLbs.toFixed(0)} lbs, ${grandTotalCal.toFixed(0)} cal (${(grandTotalCal / 2000).toFixed(0)} person-days)`);

  return lines.join('\n');
}

// ── Constraint Checker ───────────────────────────────────────────────────────

/** Check planting distance constraints. */
function checkConstraints(): string {
  const lines: string[] = [];
  lines.push('=== Constraint Checks ===');
  lines.push('');

  // Corn-tomato: no separation needed. Moths fly 30+ km/night.
  // Corn silks divert earworm oviposition from tomatoes (Purdue E-31).
  lines.push('Corn-Tomato: NO separation required');
  lines.push('  Moths fly 30+ km/night. Corn silks divert earworm from tomatoes.');

  // Potato-tomato: no separation needed. Blight sporangia travel 10-60 km.
  lines.push('Potato-Tomato: NO separation required');
  lines.push('  Blight sporangia travel 10-60 km on wind. Monitor USABlight.org instead.');

  // Nasturtium-tomato: no distance constraint (Holden 2012).
  // Aphids walk 3-12 m/hr. Garden-scale separation is irrelevant.
  lines.push('Nasturtium-Tomato: no distance constraint');
  lines.push('  Aphids walk 3-12 m/hr. Value is hoverfly/lacewing attraction, not distance.');

  return lines.join('\n');
}

// ── Report (unconstrained DP result) ─────────────────────────────────────────

function formatReport(result: OptimizationResult): string {
  const lines: string[] = [];

  lines.push('=== Unconstrained Calorie-Max (DP result) ===');
  lines.push(`Garden: 30x100 ft (${result.total_area_sq_ft.toFixed(0)} sq ft crop area)`);
  lines.push('');

  for (const zone of result.zones) {
    const startFt = (zone.physY_start / 12).toFixed(0);
    const endFt = (zone.physY_end / 12).toFixed(0);
    const plantCount = Math.floor(zone.area_sq_ft * zone.species.plants_per_sq_ft);

    lines.push(`${zone.species.icon.emoji} ${zone.species.name}: ${startFt}-${endFt}ft, ${zone.area_sq_ft.toFixed(0)} sqft, ~${plantCount} plants, ${zone.expected_lbs.toFixed(0)} lbs`);
  }
  lines.push('');
  lines.push(`Total: ${result.total_lbs.toFixed(0)} lbs, ${result.total_cal.toFixed(0)} cal`);
  lines.push('(Degenerate: assigns nearly all space to potato because potato and corn');
  lines.push(' have equal cal/sqft at 8h sun, but potato handles shade 14% better.)');

  return lines.join('\n');
}

// ── Exports ──────────────────────────────────────────────────────────────────

export {
  lbsPerSqFt,
  calPerSqFt,
  environmentAt,
  sunHoursAt,
  soilAt,
  channelCenterX,
  cropWidthIn,
  optimizeZones,
  formatReport,
  formatYieldTable,
  estimateCurrentLayout,
  checkConstraints,
  ZONE_CROPS,
  TRELLIS_CROPS,
};

export type {
  Environment,
  SoilConditions,
  ZoneResult,
  TrellisResult,
  OptimizationResult,
};
