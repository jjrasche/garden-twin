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

Layout driven by `ZONE_CONFIG` in `sampleGarden.ts`. Plant counts from `PRODUCTION_PLAN` in `ProductionTimeline.ts`.
All spacings match species files (validated 2026-03-21). No overrides.

Quick zone reference (south to north):
- Dead (0-120) | Greens (120-240) | Kale (240-480) | Potato (480-600) | Corn (660-1080) | Trellis (240-1200)

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
