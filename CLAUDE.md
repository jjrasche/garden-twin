# Garden Twin — Claude Code Constitution

Digital twin of a 30x100ft garden in Grand Rapids, MI (Zone 6a). Used for planning, simulation, and eventual robotic interaction.

**Target architecture: `docs/architecture.md`** - GDD-based growth engine, unified conditions system, declarative species biology. Current codebase is migrating toward this.

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
- `src/core/data/sampleGarden.ts` — `createGardenStateFromPlan(plan)` generates GardenState from PRODUCTION_PLAN
- `src/core/data/species/` — Individual species files (11 species, each with modifiers + layout profile)

---

## Coordinate System (CRITICAL — #1 Source of Bugs)

Two coordinate spaces exist. Every directional operation must specify which one.

### Physical Garden (real-world orientation)

```
physX: 0 (west edge) → 360 (east edge)   [30ft east-west]
physY: 0 (south edge) → 1200 (north edge) [100ft north-south]

+physX = eastward
+physY = northward
```

### Screen Data (after toScreen transform)

```
x_in: 0 (north/left) → 1200 (south/right)
y_in: 0 (east/top) → 360 (west/bottom)

x_in = 1200 - physY   (north-south → left-right)
y_in = 360 - physX    (east-west → top-bottom)
```

### Screen Direction Mapping

```
+dx on screen = SOUTHWARD in garden
-dx on screen = NORTHWARD in garden
+dy on screen = WESTWARD in garden    ← COUNTERINTUITIVE
-dy on screen = EASTWARD in garden    ← COUNTERINTUITIVE
```

### Worked Examples

**Cherry tomatoes** (planted west of channel, physX ~ 324):
- Screen `y_in = 360 - 324 = 36`
- Water center at physX=336 → `y_in = 360 - 336 = 24`
- To extend EASTWARD over water: need LOWER y_in → use `-dy` in occupied_subcells loop

**Paste tomatoes** (planted east of channel, physX ~ 348):
- Screen `y_in = 360 - 348 = 12`
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
  │  Corn field (physY 660-1080, 18" grid)
  │  Greens zone (physY 540-660, lettuce + spinach)
  │  Potato zone (physY 420-540, E-W rows)
  │  Buffer zone (physY 360-420, companions)
  │  Kale main (physY 240-360, full sun)
  │  Shade kale comparison (physY 120-240, ~20 plants)
  │  Channel + trellis runs along east side
physY=0 ──── South End (40ft tree, shade + roots) ─
  physX=0 (west)                    physX=360 (east)
```

Layout is driven by `ZONE_CONFIG` in `sampleGarden.ts` — a declarative config object.
To rearrange zones, change physY ranges there. Generators read from config.

### Species Catalog (11 plants)

Split into individual files under `src/core/data/species/`:
- Corn (Nothstine Dent), Potato (Kennebec)
- Tomato (Sun Gold, Amish Paste)
- Lettuce (BSS), Kale (Red Russian), Spinach (Bloomsdale)
- Marigold (French), Nasturtium (Trailing), Calendula

Dropped: Sweetie tomato, catnip, parsley, cilantro, spearmint.

### Zones (south to north)

- **Dead zone** (physY 0-120): heavy shade + tree roots, pathways only
- **Shade kale** (physY 120-240): ~20 kale for shade vs sun comparison
- **Kale main** (physY 240-360): 100 kale, 12" spacing, full sun
- **Buffer zone** (physY 360-420): calendula + nasturtium companion strips
- **Potato zone** (physY 420-540): 88 plants, E-W rows for drainage, 30" row / 12" plant
- **Greens zone** (physY 540-660): spring lettuce, fall spinach+lettuce (overlapping subcells)
- **Corn field** (physY 660-1080): 18" equidistant grid, capped at plan count
- **Trellis tomatoes** (physY 240-1200): along channel, 18" spacing

Plant counts driven by `PRODUCTION_PLAN` in `ProductionTimeline.ts` (single source of truth).

### Channel Path

Ephemeral water channel along the east side. Three segments:

```
Segment 1 -- Straight north along east edge:
  (336, 0) -> (336, 660)    55ft straight run, 2ft from east boundary

Segment 2 -- Gradual westward curve:
  (336, 660) -> (288, 720) -> (240, 780)    10ft transition, 8ft westward

Segment 3 -- Straight north, offset west:
  (240, 780) -> (240, 1200)    35ft straight run, 10ft from east boundary
```

Cross-section: 12" water center + 6" log border each side = 24" total width.

`getChannelCenterX(physY)` returns the interpolated center X at any physY. Linear interpolation between physY 660-780 for the bend.

Crop zone boundaries:
- `CROP_ZONE_SOUTH_EAST_X = 300` (physY < 660, channel at 336)
- `CROP_ZONE_NORTH_EAST_X = 204` (physY >= 660, channel at 240)

### Trellis

Single trellis following the channel path. T-posts every 120" (10ft) in the water channel. Wire height: 72" (6ft). The trellis data model has only `start` and `end` points — the renderer uses the **channel's** path waypoints for accurate wire routing along the curve.

### Tomato Placement

- **Cherry tomatoes** (Sun Gold + Sweetie, alternating) planted WEST of channel at `channelX - 12`
  - `occupied_subcells` extend EASTWARD over water (using `-dy` in screen coords)
- **Paste tomatoes** (Amish Paste) planted EAST of channel at `channelX + 12`
  - `occupied_subcells` extend WESTWARD over water (using `+dy` in screen coords)
- Footprint: 2x6 subcells (6" wide x 18" along trellis)
- 18" spacing along channel, starting at physY=240 (skips shade zone)
- Nasturtium trap crops at `channelX - 84` (72" separation from cherry tomatoes)
- Through the bend zone: uses interpolated `getChannelCenterX(physY)`

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
- **Canvas `desynchronized: false`**: Disabled to prevent flickering at low zoom

### Files

| File | Purpose |
|------|---------|
| `src/ui/hooks/useRenderLoop.ts` | Main 60fps RAF loop, all draw functions |
| `src/ui/utils/canvasTransforms.ts` | worldToScreen, PIXELS_PER_INCH (10) |
| `src/ui/utils/plantIcons.ts` | getPlantColor, getPlantIcon, drawPlantIcon |
| `src/ui/components/GridLayout/GridLayout.tsx` | Canvas component, viewport management |

---

## Channel & Trellis -- Future Work

1. **Trellis height visualization**: Rendered as flat line + posts. Could show vertical post height (72") at high zoom.
2. **Channel water flow**: Model flow direction and rate.
3. **Bend verification**: The bend (physY 660-780) moves channel 96" westward over 120" north-south. Verify tomato spacing through curve.

---

## Known Pre-existing TypeScript Errors

These errors exist in the codebase but are NOT caused by the garden visualization work:

- `research/*/config.ts` (11 files) -- `tasks` property not in PlantSpecies schema
- `src/cli/validate.ts` -- References removed `Garden` and `Plan` types
- `src/core/aggregators/utils.ts` -- References `plant` property on subcell (schema changed)
- `src/core/data/sampleGardens/*.ts` -- References removed `Garden`, `Projection` types
- `src/ui/components/Timelines/*` -- References `projection` on GardenStoreState (removed)
- `src/ui/services/*` -- References `GardenSchema`, `PlanSchema`, `Garden`, `Plan` (removed)

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

---

## Playwright UI Testing (MCP)

Canvas-based app — standard DOM selectors can't reach rendered plants. Use these patterns:

### Navigation & Buttons
```
browser_navigate → http://localhost:3000
browser_click ref=<button_ref>          # Year selector, tab buttons
browser_snapshot                         # Get accessible DOM tree + refs
```

### Viewport Control (Zustand store persisted in localStorage)
Canvas zoom/pan is handled by `useCanvasControls` wheel listener on the `<canvas>` element.
Playwright `mouse.wheel()` fires at page level and does NOT reach canvas listeners.
Use localStorage + reload instead:
```js
browser_evaluate: () => {
  const stored = localStorage.getItem('garden-twin-storage');
  const parsed = JSON.parse(stored);
  parsed.state.viewport = { offsetX: 200, offsetY: 80, scale: 0.15 };
  localStorage.setItem('garden-twin-storage', JSON.stringify(parsed));
}
browser_navigate → http://localhost:3000   // reload to apply
```

### Scale Reference
| scale | View                | Plants render as |
|-------|---------------------|------------------|
| 0.10  | Entire garden       | Colored dots     |
| 0.15  | Full garden + panel | Colored dots     |
| 0.25  | Half garden         | Colored squares  |
| 0.50  | Zone detail         | Emoji icons      |
| 1.00  | Subcell detail      | Emoji + grid     |

### Timeline Scrubbing
React-controlled slider — use native setter to bypass React's synthetic events:
```js
browser_evaluate: () => {
  const slider = document.querySelector('input[type="range"]');
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value').set;
  setter.call(slider, '100');  // day index 0-223
  slider.dispatchEvent(new Event('input', { bubbles: true }));
}
```

### Hover / Tooltip Testing
`mouse.move(x, y)` triggers React's `onMouseMove` on the map container div. The challenge is precision — you must land on an **occupied subcell** (3" grid). Plant subcell positions don't align to obvious pixel positions.

**Get exact positions via React fiber:**
```js
browser_evaluate: () => {
  const root = document.getElementById('root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer'));
  let fiber = root[key], gardenState = null, visited = new Set();
  function walk(f, d) {
    if (!f || d > 200 || visited.has(f) || gardenState) return;
    visited.add(f);
    if (f.memoizedState) {
      let h = f.memoizedState, hi = 0;
      while (h && hi < 30) {
        const s = h.memoizedState;
        if (s?.plants && Array.isArray(s.plants)) gardenState = s;
        h = h.next; hi++;
      }
    }
    if (f.child) walk(f.child, d+1);
    if (f.sibling) walk(f.sibling, d+1);
  }
  walk(fiber, 0);
  // Find plant subcells, compute page coords from viewport
  const {offsetX, offsetY, scale} = JSON.parse(
    localStorage.getItem('garden-twin-storage')).state.viewport;
  const PPI = 10, mapTop = 34.4;
  const plant = gardenState.plants.find(p => p.species_id === 'potato_kennebec');
  const [,x,y] = plant.occupied_subcells[0].split('_').map(Number);
  return { pageX: (x-offsetX)*scale*PPI, pageY: (y-offsetY)*scale*PPI + mapTop };
}
// Then: mouse.move(pageX, pageY) → tooltip appears
```

**Key gotcha**: subcell x_in values for potato rows are at specific multiples (e.g., 684, 714, 744, 774 — 30" row spacing). Missing by a few inches = no hit.

### Canvas Inspection
```js
browser_evaluate: () => {
  const canvas = document.querySelector('canvas');
  return JSON.stringify({ width: canvas.width, height: canvas.height });
}
```

### Key DOM Refs (from browser_snapshot)
- Year buttons: `button "10yr Avg"`, `button "2025 Live"`, etc.
- Tab buttons: `button "Conditions"`, `button "Harvest"`, `button "Labor"`
- Slider: `slider` element, also `input[type="number"]` for direct day entry
- Right panel: contains date, alive/dead counts, weather, stage breakdown
