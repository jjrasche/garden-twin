/**
 * Shared technique steps — reusable across species lifecycle activities.
 *
 * Each step describes a discrete sub-action with its own scaling model:
 *   plant: scales with plant count (per-plant action)
 *   row: scales with row count (row-level prep/cleanup)
 *   fixed: constant regardless of scale (setup/teardown)
 */

import type { TaskStep } from '../../types/LifecycleSpec';

// ── Row Prep ────────────────────────────────────────────────────────────────

export const HOE_FURROW: TaskStep = {
  name: 'Hoe furrow',
  scale: 'row',
  minutes: 2,
  instructions: 'Draw hoe along string line to open a 1" deep furrow the length of the row.',
};

export const COVER_AND_FIRM: TaskStep = {
  name: 'Cover and firm soil',
  scale: 'row',
  minutes: 3,
  instructions: 'Rake soil back over furrow. Firm gently with back of rake or hand.',
};

export const WATER_IN_ROW: TaskStep = {
  name: 'Water in',
  scale: 'row',
  minutes: 2,
  instructions: 'Water row with fine spray until soil is moist 1" deep. Avoid puddling.',
};

export const WALK_ROW_INSPECT: TaskStep = {
  name: 'Walk row',
  scale: 'row',
  minutes: 1,
  instructions: 'Walk the row to assess plants. Note any pest damage, disease, or gaps.',
};

// ── Setup / Teardown ────────────────────────────────────────────────────────

export const GATHER_TOOLS: TaskStep = {
  name: 'Gather tools',
  scale: 'fixed',
  minutes: 5,
  instructions: 'Collect required tools and carry to bed.',
};

export const CLEANUP: TaskStep = {
  name: 'Clean up',
  scale: 'fixed',
  minutes: 5,
  instructions: 'Return tools, dispose of debris, wash hands.',
};

export const GATHER_HARVEST_GEAR: TaskStep = {
  name: 'Gather harvest gear',
  scale: 'fixed',
  minutes: 3,
  instructions: 'Get harvest knife, bucket/basket. Bring to bed.',
};

export const RINSE_AND_STORE: TaskStep = {
  name: 'Rinse and refrigerate',
  scale: 'fixed',
  minutes: 5,
  instructions: 'Rinse harvest in cold water. Spin or shake dry. Refrigerate within 30 minutes of cutting.',
};

// ── Seed Starting (indoor) ──────────────────────────────────────────────────

export const FILL_BLOCKS: TaskStep = {
  name: 'Fill and press soil blocks',
  scale: 'plant',
  minutes: 0.125, // Mini 4 makes 4 blocks per press in ~25-30s = 6-7s per block
  instructions: 'Fill block maker with moist mix, press firmly. Eject onto tray. Mini 4 = 4 blocks per press.',
};

export const DROP_SEED: TaskStep = {
  name: 'Drop seed into block',
  scale: 'plant',
  minutes: 0.083, // ~5 seconds
  instructions: 'Place 1 seed per block indent. Cover lightly with vermiculite if needed.',
};

export const SETUP_TRAY: TaskStep = {
  name: 'Set up tray under lights',
  scale: 'fixed',
  minutes: 5,
  instructions: 'Place tray under grow light. Cover with humidity dome. Set timer for 16h/day.',
};

// ── Direct Sow ──────────────────────────────────────────────────────────────

export const PRESS_SEEDS: TaskStep = {
  name: 'Press seeds into soil',
  scale: 'plant',
  minutes: 0.167, // ~10 seconds
  instructions: 'Press 2 seeds per station at spacing marks. Push 1/4-1/2" deep with finger.',
};

export const PRESS_LARGE_SEEDS: TaskStep = {
  name: 'Press seeds into soil',
  scale: 'plant',
  minutes: 0.25, // ~15 seconds (larger seeds like corn, potato)
  instructions: 'Place seed in prepared hole. Push to correct depth.',
};

// ── Thinning ────────────────────────────────────────────────────────────────

export const SNIP_THIN: TaskStep = {
  name: 'Snip weaker seedling',
  scale: 'plant',
  minutes: 0.083, // ~5 seconds
  instructions: 'Identify the weaker of each pair. Snip at soil level with scissors. Do not pull.',
};

// ── Harvest (CAC) ───────────────────────────────────────────────────────────

export const CUT_OUTER_LEAVES: TaskStep = {
  name: 'Cut outer leaves',
  scale: 'plant',
  minutes: 0.083, // ~5 seconds per plant for practiced gardener
  instructions: 'Cut outer leaves 1-2" above soil/crown. Leave growing center and 4-6 inner leaves intact.',
};

export const SWAP_BASKET: TaskStep = {
  name: 'Swap full basket',
  scale: 'row',
  minutes: 1,
  instructions: 'When basket fills, set aside and grab empty. Continue down row.',
};

// ── Harvest (fruit) ─────────────────────────────────────────────────────────

export const PICK_FRUIT: TaskStep = {
  name: 'Pick ripe fruit',
  scale: 'plant',
  minutes: 0.5,
  instructions: 'Twist ripe fruit gently to detach from stem. Set in bucket without stacking deep.',
};

export const PICK_CHERRY_FRUIT: TaskStep = {
  name: 'Pick ripe cherry tomatoes',
  scale: 'plant',
  minutes: 0.75,
  instructions: 'Pick all fully colored fruit. Cherry tomatoes crack if left too long. Twist gently.',
};

// ── Trellis ─────────────────────────────────────────────────────────────────

export const LOWER_VINE: TaskStep = {
  name: 'Lower and re-clip vine',
  scale: 'plant',
  minutes: 1.5,
  instructions: 'Unclip leader from wire. Lower entire vine 12-18" along trellis. Re-clip at new position.',
};

export const REMOVE_LOWER_LEAVES: TaskStep = {
  name: 'Remove leaves below lowest fruit',
  scale: 'plant',
  minutes: 0.5,
  instructions: 'Snap or cut all leaves below the lowest fruit cluster. Improves airflow and reduces disease.',
};

export const SNAP_SUCKERS: TaskStep = {
  name: 'Snap suckers from leaf axils',
  scale: 'plant',
  minutes: 0.5,
  instructions: 'Remove all side shoots growing from leaf axils. Snap small ones by hand, cut larger with pruners.',
};

export const TRAIN_LEADER: TaskStep = {
  name: 'Wrap leader around twine',
  scale: 'plant',
  minutes: 0.25,
  instructions: 'Gently wrap new growth clockwise around support twine.',
};
