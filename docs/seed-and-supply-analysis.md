# Seed & Supply Analysis -- 2025 Season

Single source of truth for seeds, supplies, indoor seed starting, and light setup.
Last updated 2026-03-21.

---

## Garden Area

See `docs/garden-layout.md` for the single source of truth on zones, spacing, and square footage.
All spacings in ZONE_CONFIG now match species files (validated 2026-03-21, kale fixed from 12" to 18").

---

## Johnny's Seeds Cart #1 -- Greens, Corn, Companions ($67.90)

| # | Item | Size | Price | Seeds/Unit | Seeds in Cart |
|---|------|------|------:|------------|---------------|
| 1 | Alpha Calendula (organic) | Packet | $6.40 | ~200/pkt | 200 |
| ~~2~~ | ~~Catnip~~ | ~~Packet~~ | ~~$6.40~~ | -- | **REMOVE** |
| 3 | Bloomsdale Spinach | Packet | $6.40 | ~1,000/pkt | 1,000 |
| 4 | Red Russian Kale | Packet | $6.40 | ~100/pkt | 100 |
| 4b | Red Russian Kale (add 2 more) | 2x Packet | $12.80 | ~100/pkt each | +200 |
| 5 | Black Seeded Simpson Lettuce | 1 oz | $7.85 | ~17,800/oz | 17,800 |
| 6 | Trailing Nasturtium Mix | 1 oz | $7.15 | ~230/oz | 230 |
| 7 | Nothstine Dent Corn (organic) | Packet | $5.49 | ~100/pkt | 100 |
| 8 | Nothstine Dent Corn (organic) | 1/4 lb | $12.56 | ~300/1/4lb | 300 |
| 9 | Bonanza Harmony Marigold | Packet | $4.95 | ~100/pkt (est.) | ~100 |
| 10 | Sweet Alyssum | Packet | $5.80 | ~100/pkt | 100 |

Corn items 7+8 on sale (10% off).

## Johnny's Seeds Cart #2 -- Tomatoes ($16.15)

| # | Item | Size | Price | Seeds in Cart |
|---|------|------|------:|---------------|
| 11 | Sun Gold (F1) Tomato | Packet | $6.45 | ~25 (est.) |
| 12 | Amish Paste (Organic) Tomato | 250 Seeds | $9.70 | 250 |

**Revised Johnny's total: ~$90.45** (removed catnip -$6.40, added 2x kale +$12.80)

---

## All Plants: Seeds and Start Method

### Blocking strategy

All soil-blocked crops get 2 seeds per block to maximize germination success.
- Single seed: 85% chance per block
- Two seeds: 1 - (0.15)^2 = **97.75% per block**
- Thin to strongest seedling after emergence
- Seeds needed = (plants / 0.98) x 2

### Master table

| Crop | Plan plants | Blocks | Seeds (2/block) | Seeds on hand | Start method | Status |
|------|------------|--------|-----------------|---------------|-------------|--------|
| **Kale (Red Russian)** | **120** | **123** | **246** | **300 (with +2 pkt)** | **Soil blocks** | **Covered after cart update** |
| Tomato (Amish Paste) | 11 | 12 | 24 | 250 | Soil blocks | 10x surplus |
| Tomato (Sun Gold) | 8 | 9 | 18 | ~25 | Soil blocks | Covered |
| Marigold (Bonanza) | ~50 | **52** | **104** | ~100 | **Soil blocks (CHANGED)** | **SHORT. Need ~4 more seeds or reduce to 48 plants** |
| Lettuce (BSS) | 280 | -- | 330 | 17,800 | Direct sow | 54x surplus |
| Spinach (Bloomsdale) | 200 | -- | 236 | 1,000 | Direct sow | 4x surplus |
| Corn (Nothstine Dent) | 234 | -- | 276 | 400 | Direct sow | 1.4x plan |
| Potato (Kennebec) | 88 | -- | -- | -- | Direct plant | Seed tubers TBD |
| Calendula (Alpha) | ~50 | -- | ~59 | 200 | Direct sow | Covered |
| Nasturtium (Trailing) | ~50 | -- | ~59 | 230 | Direct sow | Covered |
| Sweet Alyssum | ~50 | -- | ~59 | 100 | Direct sow | Pollinator cover, not in PRODUCTION_PLAN |

**Dropped**: Catnip, Sweetie Tomato.

### Soil block summary

| Crop | Plants | Blocks |
|------|--------|--------|
| Kale | 120 | 123 |
| Amish Paste | 11 | 12 |
| Sun Gold | 8 | 9 |
| Marigold | ~50 | 52 |
| **Total** | **~189** | **196** |

196 blocks, well within 230 material capacity (+34 spare).

---

## Seed-Starting Supplies (Amazon, delivered March 10, $250.30)

| Item | Qty | Price | Purpose |
|------|-----|------:|---------|
| VIVOSUN 20"x20.75" Seedling Heat Mat | 1 | $35.99 | Germination (built-in temp controller) |
| Espoma Organic Seed Starter 16 qt | 2 | $51.98 | Block mix base (peat + mycorrhizae) |
| Coco Coir 650g bricks (5-pack) | 1 | $21.59 | Block mix structure |
| BlumWay 8-Cell 2" Soil Blocker | 1 | $39.99 | Makes 8 blocks per press |
| Barrina TX36 2ft LED Grow Lights (4-pack) | 1 | $89.99 | 36W each, 144W total. Indoor growing after germination |
| Miracle-Gro Perlite 8 qt (2-pack) | 1 | $10.75 | Block mix drainage |
| **1020 trays (10.5" x 21")** | **4** | **~$12** | **NOT YET PURCHASED. Needed for blocks under lights.** |

---

## Soil Block Capacity

### Material volumes

| Material | Quantity | Volume |
|----------|----------|--------|
| Espoma Seed Starter | 2 x 16 qt | 32 qt |
| Coco Coir (5 x 650g, hydrated) | 5 x ~8 qt each | ~40 qt |
| Perlite | 2 x 8 qt | 16 qt |
| **Total mix** | | **~88 qt** |

Mix ratio: ~45% coir / 36% seed starter / 18% perlite.

### Block math

- 2" block: 8 in^3, compression 2.5x, loose mix per block: 20 in^3
- 88 qt x 57.75 in^3/qt = 5,082 in^3
- **Practical yield (~90%): ~230 blocks**
- **Demand: 196 blocks. Covered with +34 spare.**

### Heat mat batching (104 blocks fit per cycle)

| Cycle | What | Blocks | When |
|-------|------|--------|------|
| 1 | Kale batch A | 100 | Now (late March) |
| 2 | Kale batch B + marigolds start | 23 + 52 = 75 | ~Mar 28 |
| 3 | All tomatoes | 21 | ~Apr 5 |

Germination: 5-7 days on heat mat per cycle, then move to lights.
All 196 blocks under lights by ~Apr 12.

---

## Indoor Light Setup — Barrina TX36

### Light specs

- Model: Barrina TX36, 36W per bar, 4 bars
- Form factor: flat aluminum housing, LEDs face downward, 24" x ~1.5"
- PPFD at 4" (manufacturer): ~560 umol/m2/s (range across variants: 527-593)
- Beam angle: 120 deg (native LED, no secondary optics)
- LED intensity profile: 100% at 0 deg, 80% at 30 deg, 40% at 60 deg
- Daisy-chainable, on/off switch per bar

### PPFD model

Irradiance computed from line-source integral (closed-form: [u/sqrt(1+u^2)] at limits).
Perpendicular profile uses measured LED angular distribution (steeper than Lambertian cos).
Falloff with height: 1/h (confirmed for distance << tube length; tube=24", working distance 9-14").
Baseline uncertainty: +/- 20% until verified with Photone app measurement.

### Tray layout: 4 trays, 2 bars end-to-end, 9" height

```
  ├─3"─┤══════BAR A (24")══════════BAR B (24")═══════┤─3"─┤
       [  tray 1  ][  tray 2  ][  tray 3  ][  tray 4  ]
       0"         10.5"       21"         31.5"       42"
```

- 4 trays x 10.5" = 42" long, centered within 48" of bar (3" margin each side)
- Trays are 20" deep (across width)
- 2 bars butted end-to-end, zero gap. Junction at 24" from bar start (tray 2/3 boundary)
- Height: 9" above block tops. All bars at same height.
- Photoperiod: 16 hours/day for all crops

### Junction behavior

At tube end, PPFD = 59% of center (not 50%) — line-source integral result.
Two bars butted together: each contributes 59% at junction = 118% combined.
Junction is a slight hotspot (294 PPFD at baseline), NOT a dead zone. Under 300, safe.

### PPFD across the tray surface (baseline 560 @ 4")

See interactive heatmap: `docs/light-ppfd-heatmap.html`

Key values at 9" height, centerline (y=0"):

| Position | x along trays | PPFD | Zone |
|----------|--------------|------|------|
| Tray 1 outer edge | 0" (3" from bar start) | 202 | Marigold/kale |
| Tray 1 center | 5.25" | 232 | Marigold |
| Tray 2 center | 15.75" (bar A center) | 276 | Tomato |
| Junction | 21" (tray 2/3 boundary) | 294 | Tomato |
| Tray 3 center | 26.25" (bar B center) | 276 | Tomato |
| Tray 4 center | 36.75" | 232 | Marigold |
| Tray 4 outer edge | 42" (3" from bar end) | 202 | Marigold/kale |

Across tray width at bar center (x=21"):

| Distance from centerline | PPFD |
|-------------------------|------|
| 0" (center) | 294 |
| +/-3" | 265 |
| +/-5" | 235 |
| +/-8" | 182 |
| +/-10" (tray edge) | 162 |

### Crop placement under lights

Based on per-crop optimal PPFD from peer-reviewed studies:

| Crop | Optimal PPFD | Optimal DLI | Source |
|------|-------------|-------------|--------|
| Tomato seedlings | 200-250 | 10-13 mol/m2/d | PMC 2023 (best stem diameter at 240) |
| Kale seedlings | 140-210 | 12 mol/m2/d | EJHS 2024 (140x24h or 210x16h) |
| Marigold seedlings | 150-235 | 10-12 mol/m2/d | MSU + Frontiers 2022 (DLI saturates at 12) |

All three crops converge at ~200 PPFD x 16h = DLI 11.5 mol/m2/d.

**Block placement strategy** — non-uniform light is a feature, not a bug:

```
  Across 20" tray width:

  KALE          MARIGOLD       TOMATO       MARIGOLD        KALE
  (140-180)     (180-235)     (235-294)     (180-235)     (140-180)
  edge 2"       next 3"       center 10"    next 3"       edge 2"
```

Along the 42" length:
- **Trays 2-3 center** (x=13-29"): PPFD 260-294. Tomato zone (21 blocks).
- **Trays 1, 4 center + trays 2-3 width edges**: PPFD 180-260. Marigold zone (52 blocks).
- **Tray 1, 4 width edges + tray 1, 4 lengthwise edges**: PPFD 140-200. Kale zone (123 blocks).

49 blocks per tray average. Fill kale first (it's the most blocks and least picky about position).

### Sensitivity to baseline uncertainty

If the real PPFD at 4" is 20% lower (448) or higher (672):

| Location | Baseline 560 | If 448 (-20%) | If 672 (+20%) | Action |
|----------|-------------|---------------|---------------|--------|
| Junction peak | 294 | 235 | 353 | If >300: raise to 10" |
| Bar center | 276 | 221 | 331 | If >300: raise to 10" |
| Tray outer edge, centerline | 202 | 162 | 242 | Fine either way |
| Tray edge corner | 111 | 89 | 133 | Low; put kale here |

**Crop placement holds in all scenarios.** Height may need adjustment from 9" to 10-11" if lights are hotter than spec.

### How to verify: Photone app

Download Photone (free, iOS/Android). Tape white printer paper over front camera as diffuser.
Select "LED" light type. Accuracy: +/-20-30 umol/m2/s vs real PAR meter.

One measurement at center of bar at 9" height calibrates the entire map.
Plug the measured value into the baseline slider in `docs/light-ppfd-heatmap.html`.

---

## Conduit Light Structure

- Material: EMT conduit (1/2" or 3/4")
- Two horizontal rails running 48" (length of tray row), 14" apart across the width
  (bars at 3" and 17" from tray front edge — for future 4-bar upgrade)
- For 2-bar setup: mount both bars on the center rail, running lengthwise
- Height: 9" above block tops + ~4" for block/tray height = **13" total structure height**
- Use set-screw couplings on vertical risers for height adjustment
- Bars daisy-chain from one outlet

---

## Schedule

| Date | Action |
|------|--------|
| **Now (late March)** | Build conduit frame. Press kale batch A (100 blocks). Heat mat. |
| ~Mar 28 | Move kale A to lights. Press kale B (23) + marigold (52). Heat mat. |
| ~Apr 5 | Move kale B + marigold to lights. Press tomatoes (21). Heat mat. |
| ~Apr 12 | All 196 blocks under lights. 16h/day. |
| ~May 1-10 | Harden off kale. Transplant to garden after May 10 last frost. |
| ~May 20-25 | Harden off tomatoes + marigolds. Transplant late May. |

---

## Action Items

- [x] Remove catnip from Johnny's cart #1 (-$6.40)
- [ ] Add 2 more Red Russian Kale packets to cart #1 (+$12.80) -- need 246 seeds, have 100
- [ ] Decide: marigold soil blocks (52 blocks, need ~4 more seeds) or reduce to 48 plants
- [ ] Decide on Sweet Alyssum -- keep as pollinator cover or drop?
- [ ] Confirm Kennebec seed potato source (88 tubers)
- [ ] Purchase 4x 1020 trays (~$12)
- [ ] Measure PPFD with Photone app after light structure is built
- [ ] Build conduit light frame (13" height, 48" rails)
