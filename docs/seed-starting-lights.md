# Indoor Light Setup -- Barrina TX36

## Light specs

- Model: Barrina TX36, 36W per bar, 4 bars
- Form factor: flat aluminum housing, LEDs face downward, 24" x ~1.5"
- PPFD at 4" (manufacturer): ~560 umol/m2/s (range across variants: 527-593)
- Beam angle: 120 deg (native LED, no secondary optics)
- LED intensity profile: 100% at 0 deg, 80% at 30 deg, 40% at 60 deg
- Daisy-chainable, on/off switch per bar

## PPFD model

Irradiance computed from line-source integral (closed-form: [u/sqrt(1+u^2)] at limits).
Perpendicular profile uses measured LED angular distribution (steeper than Lambertian cos).
Falloff with height: 1/h (confirmed for distance << tube length; tube=24", working distance 9-14").
Baseline uncertainty: +/- 20% until verified with Photone app measurement.

## Tray layout: 4 trays, 2 bars end-to-end, 9" height

```
  |-3"-|======BAR A (24")==========BAR B (24")=========|-3"-|
       [  tray 1  ][  tray 2  ][  tray 3  ][  tray 4  ]
       0"         10.5"       21"         31.5"       42"
```

- 4 trays x 10.5" = 42" long, centered within 48" of bar (3" margin each side)
- Trays are 20" deep (across width)
- 2 bars butted end-to-end, zero gap. Junction at 24" from bar start (tray 2/3 boundary)
- Height: 9" above block tops. All bars at same height.
- Photoperiod: 16 hours/day for all crops

## Junction behavior

At tube end, PPFD = 59% of center (not 50%) -- line-source integral result.
Two bars butted together: each contributes 59% at junction = 118% combined.
Junction is a slight hotspot (294 PPFD at baseline), NOT a dead zone. Under 300, safe.

## PPFD across the tray surface (baseline 560 @ 4")

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

## Crop placement under lights

Based on per-crop optimal PPFD from peer-reviewed studies:

| Crop | Optimal PPFD | Optimal DLI | Source |
|------|-------------|-------------|--------|
| Tomato seedlings | 200-250 | 10-13 mol/m2/d | PMC 2023 (best stem diameter at 240) |
| Kale seedlings | 140-210 | 12 mol/m2/d | EJHS 2024 (140x24h or 210x16h) |
| Marigold seedlings | 150-235 | 10-12 mol/m2/d | MSU + Frontiers 2022 (DLI saturates at 12) |

All three crops converge at ~200 PPFD x 16h = DLI 11.5 mol/m2/d.

**Block placement strategy** -- non-uniform light is a feature, not a bug:

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

## Sensitivity to baseline uncertainty

If the real PPFD at 4" is 20% lower (448) or higher (672):

| Location | Baseline 560 | If 448 (-20%) | If 672 (+20%) | Action |
|----------|-------------|---------------|---------------|--------|
| Junction peak | 294 | 235 | 353 | If >300: raise to 10" |
| Bar center | 276 | 221 | 331 | If >300: raise to 10" |
| Tray outer edge, centerline | 202 | 162 | 242 | Fine either way |
| Tray edge corner | 111 | 89 | 133 | Low; put kale here |

**Crop placement holds in all scenarios.** Height may need adjustment from 9" to 10-11" if lights are hotter than spec.

## How to verify: Photone app

Download Photone (free, iOS/Android). Tape white printer paper over front camera as diffuser.
Select "LED" light type. Accuracy: +/-20-30 umol/m2/s vs real PAR meter.

One measurement at center of bar at 9" height calibrates the entire map.
Plug the measured value into the baseline slider in `docs/light-ppfd-heatmap.html`.

---

## Conduit Light Structure

- Material: EMT conduit (1/2" or 3/4")
- Two horizontal rails running 48" (length of tray row), 14" apart across the width
  (bars at 3" and 17" from tray front edge -- for future 4-bar upgrade)
- For 2-bar setup: mount both bars on the center rail, running lengthwise
- Height: 9" above block tops + ~4" for block/tray height = **13" total structure height**
- Use set-screw couplings on vertical risers for height adjustment
- Bars daisy-chain from one outlet
