# Garden Twin — Claude Code Constitution

Digital twin of a 40x100ft garden in Grand Rapids, MI. Used for planning, simulation, and eventual robotic interaction.

---

## Data Model

6-object schema (Zod-validated):
- **PlantSpecies** — Catalog entry (yield, spacing, growth stages)
- **GardenState** — Snapshot: subcells + plants + infrastructure + environment
- **Task** — Scheduled garden work (watering, harvesting, planting)
- **Robot** — Agent that executes tasks
- **Episode** — A robot's execution of a task
- **Observation** — Sensor data from an episode (updates plant state)

Key files:
- `src/core/types/` — All Zod schemas and TypeScript types
- `src/core/data/sampleGarden.ts` — Generates the default 40x100ft garden state

---

## Coordinate System (CRITICAL — #1 Source of Bugs)

Two coordinate spaces exist. Every directional operation must specify which one.

### Physical Garden (real-world orientation)

```
physX: 0 (west edge) → 480 (east edge)   [40ft east-west]
physY: 0 (south edge) → 1200 (north edge) [100ft north-south]

+physX = eastward
+physY = northward
```

### Screen Data (after toScreen transform)

```
x_in: 0 (north/left) → 1200 (south/right)
y_in: 0 (east/top) → 480 (west/bottom)

x_in = 1200 - physY   (north-south → left-right)
y_in = 480 - physX    (east-west → top-bottom)
```

### Screen Direction Mapping

```
+dx on screen = SOUTHWARD in garden
-dx on screen = NORTHWARD in garden
+dy on screen = WESTWARD in garden    ← COUNTERINTUITIVE
-dy on screen = EASTWARD in garden    ← COUNTERINTUITIVE
```

### Worked Examples

**Cherry tomatoes** (planted west of channel, physX ~ 444):
- Screen `y_in = 480 - 444 = 36`
- Water center at physX=456 → `y_in = 480 - 456 = 24`
- To extend EASTWARD over water: need LOWER y_in → use `-dy` in occupied_subcells loop

**Paste tomatoes** (planted east of channel, physX ~ 468):
- Screen `y_in = 480 - 468 = 12`
- Water center → `y_in = 24`
- To extend WESTWARD over water: need HIGHER y_in → use `+dy` in occupied_subcells loop

### Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `toScreen(physX, physY)` | sampleGarden.ts | Physical → screen (continuous coords) |
| `toScreenSnapped(physX, physY)` | sampleGarden.ts | Physical → screen, snapped to 3" subcell grid |
| `createSubcellId(x_in, y_in)` | Subcell.ts | Creates `sub_${x}_${y}` identifier |
| `getChannelCenterX(physY)` | sampleGarden.ts | Channel center X at given Y (interpolates through bend) |
| `worldToScreen(pos, viewport)` | canvasTransforms.ts | Screen data → canvas pixels (translate + scale) |
| `mulberry32(seed)` | sampleGarden.ts | Seeded PRNG for deterministic randomness |

### Rules for Future Work

1. **Always specify coordinate space** in comments: "physX" or "screen x_in"
2. **Always use `toScreenSnapped()`** for anything that becomes a subcell ID
3. **Use `toScreen()`** (continuous) only for infrastructure paths
4. **Test directional logic** with a concrete example before committing
5. **When in doubt about +/-dy**: higher physX = lower y_in. To go toward higher physX (eastward), decrease y_in, which means -dy.

---

## Garden Layout

### Overall Structure

```
PHYSICAL LAYOUT (south at bottom, north at top):

physY=1200 ──── North End ────────────────────────
  │  Three Sisters zone (mounds + squash vines)
  │  6 rows of mounds at physY = 1100, 940, 780, 620, 460, 300
  │  Channel + trellis runs along east side
physY=240 ─── Shade boundary ──────────────────────
  │  Lettuce zone: 12 succession batches
  │  (physY 0-240, 20ft of south end)
physY=0 ──── South End ────────────────────────────
  physX=0 (west)                    physX=480 (east)
```

### Mound Grid (Three Sisters)

- **5 columns x 6 rows = 30 mounds**
- Column physX: 30, 90, 150, 210, 270 (60" / 5ft spacing)
- Row physY: 300, 460, 620, 780, 940, 1100 (160" / 13.3ft spacing)
- Mound diameter: 36" (3ft), height: 8"
- Each mound: 6 corn (circle), 2 beans (support_plant_id → corn), 1 squash (east edge)

### Channel Path

The channel carries ephemeral water along the east side of the garden. Three segments:

```
Segment 1 — Straight north along east edge:
  (456, 0) → (456, 660)    55ft straight run, 2ft from east boundary

Segment 2 — Gradual westward curve:
  (456, 660) → (408, 720) → (360, 780)    10ft transition, 8ft westward

Segment 3 — Straight north, offset west:
  (360, 780) → (360, 1200)    35ft straight run, 10ft from east boundary
```

Channel cross-section: 12" water center + 6" log border each side = 24" total width.

`getChannelCenterX(physY)` returns the interpolated center X at any physY, handling the gradual bend via linear interpolation between 660-780.

### Trellis

Single trellis following the channel path. T-posts every 120" (10ft) in the water channel. Wire height: 72" (6ft). The trellis data model has only `start` and `end` points — the renderer uses the **channel's** path waypoints for accurate wire routing along the curve.

### Tomato Placement

- **Cherry tomatoes** planted WEST of channel center at `channelX - 12` (at west log boundary)
  - `occupied_subcells` extend **EASTWARD** over the water (using `-dy` in screen coords)
- **Paste (San Marzano) tomatoes** planted EAST of channel center at `channelX + 12` (at east log boundary)
  - `occupied_subcells` extend **WESTWARD** over the water (using `+dy` in screen coords)
- Footprint: 2x6 subcells (6" wide x 18" along trellis) — narrow because trained on trellis
- 24" spacing along channel, starting at physY=240 (skips shade zone)
- Tomatoes planted through the bend zone use interpolated `getChannelCenterX(physY)`

### Lettuce Zone

- South 20ft of garden (physY 0-240)
- 12 succession batches, 20" strip spacing (`batch * 20`), no overlap
- 33 plants per batch, 6" spacing
- Each plant: 2x2 subcell footprint (6" diameter) — 4 subcells per plant
- Partially shaded (physY 0-120 heavy shade, 120-240 moderate shade)

---

## Rendering Architecture

### Layer Order (bottom to top)

```
1. Grid lines        — LOD: subcell (≥1.0), 1ft cells (≥0.5), 10ft zones (≥0.05)
2. Subcells           — Terrain color + species-colored occupied_subcells + moisture wash
3. Infrastructure     — Trellis wire/posts, mound outlines (dashed circles)
4. Plants             — Emoji icons (≥0.5 scale) or colored dots (<0.5 scale)
5. Brush cursor       — Paint tool preview
6. Debug overlay      — FPS, visible count, scale
```

### Trellis Rendering

The trellis uses a 2-pass wire rendering for visibility at all zoom levels:
- **Glow pass**: `rgba(251, 191, 36, 0.25)` (amber-400 at 25% opacity), `lineWidth = max(5, 8*scale)` — warm halo always visible even fully zoomed out
- **Wire pass**: `#D97706` (amber-600), `lineWidth = max(2, 3*scale)` — crisp golden-brown line
- **T-post markers**: Cross-shaped (+) every 120" (10ft), `#A8A29E` (stone-400), `size = max(5, 10*scale)` with `#292524` dark outline
- Both passes use `lineCap/lineJoin = 'round'` and `ctx.save()/restore()` isolation
- Post positions snapped to integer pixels (`Math.round`) to prevent anti-aliasing blur

### Subcell Species Coloring

The `subcellSpecies` Map is built from all plants' `occupied_subcells` arrays, mapping subcell_id → species_id. This Map is built **once per gardenState change** (not per frame) for performance. Each occupied subcell renders in its species color via `getPlantColor(speciesId)`.

### Key Rendering Details

- **Pixel snapping**: All subcell fillRect calls use `Math.floor` on both corners to prevent subpixel shimmer
- **Moisture wash**: `rgba(59, 130, 246, 0.15)` blue overlay on subcells with moisture_pct ≥ 70
- **Mound outlines**: Dashed `#A8A29E` circles at scale ≥ 0.1
- **Canvas `desynchronized: false`**: Explicitly disabled to prevent flickering at low zoom

### Files

| File | Purpose |
|------|---------|
| `src/ui/hooks/useRenderLoop.ts` | Main 60fps RAF loop, all draw functions |
| `src/ui/utils/canvasTransforms.ts` | worldToScreen, PIXELS_PER_INCH (10) |
| `src/ui/utils/plantIcons.ts` | getPlantColor, getPlantIcon, drawPlantIcon |
| `src/ui/components/GridLayout/GridLayout.tsx` | Canvas component, viewport management |

---

## Squash Vine Model

### Current Implementation

Each squash plant generates 3-5 vine arms in a 240-degree fan directed AWAY from the mound center. Algorithm in `generateSquashVineSubcells()`:

- Seeded PRNG (`mulberry32`, seed = `moundIdx * 1000 + 42`) for deterministic organic randomness
- Fan avoids ~120-degree arc back toward mound center (where corn/beans are)
- Arm length: 72-180" (6-15ft), width: 2-3 subcells (6-9")
- Sinusoidal wobble perpendicular to arm direction (amplitude 0-6", period 30-60")
- Bounds-checked: stays in garden, avoids channel zone (physX >= 432)
- Deduplication via `Set<string>` (arms overlap near root)
- Expected result: ~400 subcells per plant in tendril/vine pattern

### Research: Real Squash Vine Behavior

From USDA studies, university extensions, and experienced Three Sisters practitioners:

**Vine anatomy:**
- 2 primary vines in roughly opposite directions from crown
- Each primary produces 2-4 secondary branches (3-7ft each)
- Mature plant: 15-21ft total vine length, 5-7 branches
- Peak growth: ~6in/day during midsummer
- Gardeners begin training at ~18" vine length
- Tertiary vines pruned in managed gardens
- Adventitious roots anchor vine at nodes along ground contact

**Three Sisters ground-cover behavior:**
- Vines directed OUTWARD from mound perimeter, never back over corn/beans
- Vines from adjacent mounds DO intermingle (this is desired — continuous ground cover)
- No pre-planned vine routing — management is reactive (lift + redirect growing tips)
- Corn-stalk interaction: leaf overlap at ground level is OK/beneficial, redirect climbing tips
- Sun-seeking: vines grow toward light (away from corn shadow)
- 12x12" mature leaves create dense canopy blocking all light to soil

**Inter-mound coverage:**
- Our layout: 60" column spacing, 160" row spacing, 36" mound diameter
- East-west gap between mound edges: 24" (small — easily bridged by vines)
- North-south gap between mound edges: 124" (large — primary target for vine coverage)
- Standard Three Sisters spacing is 3-5ft between mound centers; our 5ft is adequate

### Future Work: Vine Model Improvements

1. **Anatomically correct branching**: Replace 3-5 arm fan with 2 primary vines (opposite directions, biased outward) each with 2-4 secondary branches. This matches real squash vine architecture (USDA historical study). Primary vines reach 15-21ft; secondary branches 3-7ft.

2. **Vine collision/merging**: Vines from adjacent mounds should create a continuous canopy in the inter-mound gaps. Model coverage as a shared zone rather than overlapping independent sprawls. Add a coverage metric: percentage of inter-mound ground covered.

3. **Corn-stalk repulsion**: Vine growing tips deflect when approaching within 6-12" of a corn stalk position. Leaf canopy can overlap corn base (beneficial ground cover), but vine stem avoids climbing.

4. **Growth-stage-dependent footprint**: Currently `occupied_subcells` represents full maturity. For timeline simulation, start as 1 subcell at planting, expand over ~14 weeks to full vine pattern. This ties into the Observation → dynamic update system.

5. **Sun-seeking bias**: Add phototropic angular pull away from tall corn positions when computing vine arm directions.

6. **Coverage metric**: Compute what percentage of inter-mound ground is covered by squash foliage. This is the key success metric for squash's Three Sisters role.

---

## Channel & Trellis — Future Work

1. **Trellis height visualization**: Currently rendered as flat line + posts. At high zoom, could show vertical post height (72") as shadow or side-view indicator.

2. **Channel water flow**: Model flow direction and rate for the ephemeral water channel.

3. **Bend radius verification**: The gradual bend (physY 660-780) transitions the channel 96" westward over 120" of north-south travel. Verify tomato spacing through the curve is visually correct.

---

## Known Pre-existing TypeScript Errors

These errors exist in the codebase but are NOT caused by the garden visualization work:

- `research/*/config.ts` (11 files) — `tasks` property not in PlantSpecies schema
- `src/cli/validate.ts` — References removed `Garden` and `Plan` types
- `src/core/aggregators/utils.ts` — References `plant` property on subcell (schema changed)
- `src/ui/components/Timelines/*` — References `projection` on GardenStoreState (removed)
- `src/ui/services/*` — References `GardenSchema`, `PlanSchema`, `Garden`, `Plan` (removed)

To check only our files: `npx tsc --noEmit 2>&1 | grep -E "sampleGarden|useRenderLoop"`

---

## Development Workflow

```bash
# Start dev server
npm run dev

# Type check (our files only)
npx tsc --noEmit 2>&1 | grep -E "sampleGarden|useRenderLoop"

# Debug tools (if installed)
node ~/.claude/debug-tools/debug-server.js    # Start debug server
cat .claude/debug-logs/browser-logs.jsonl     # Browser event stream
cat .claude/debug-logs/capture-latest.json    # DOM/state snapshot
```
