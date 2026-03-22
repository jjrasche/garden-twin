# Garden Layout

30x100ft garden, Grand Rapids MI (Zone 6a).
Layout driven by `ZONE_CONFIG` in `src/core/data/sampleGarden.ts`.
Plant counts driven by `PRODUCTION_PLAN` in `src/core/calculators/ProductionTimeline.ts`.
Species spacing from `src/core/data/species/*.ts`.

---

## Physical Structure

```
physY=1200 ──── North End ────────────────────────
  │  Corn field (physY 660-1080, 18" grid)
  │  [access pathway physY 600-660]
  │  Potato zone (physY 480-600, E-W rows)
  │  Kale zone (physY 240-480, 120 plants)
  │  Greens zone (physY 120-240, lettuce + spinach)
  │  Channel + trellis runs along east side
physY=0 ──── South End (40ft tree, shade + roots) ─
  physX=0 (west)                    physX=360 (east)
```

---

## Zones and Area (validated against species files 2026-03-21)

All spacings match species files. No overrides.

| Zone | physY | Crop | Plants | Species spacing | Sq ft/plant | Crop sq ft | Zone sq ft | Util |
|------|-------|------|--------|----------------|------------|-----------|-----------|------|
| Dead | 0-120 | -- | 0 | -- | -- | 0 | 250 | 0% |
| Greens | 120-240 | Lettuce (spring) | 210 | 6" x 12" | 0.50 | 105 | 250 | 42% |
| Greens | 120-240 | Spinach+lettuce (fall) | 270 | 6" x 12" | 0.50 | 135 | 250 | 54% (peak) |
| Kale | 240-480 | Kale | 120 | 18" x 18" | 2.25 | 270 | 500 | 54% |
| Potato | 480-600 | Potato | 88 | 12" x 30" | 2.50 | 220 | 250 | 88% |
| Access | 600-660 | -- | 0 | -- | -- | 0 | -- | pathway |
| Corn | 660-1080 | Corn | 234 | 18" x 18" | 2.25 | 527 | 595 | 89% |
| Trellis | 240-1200 | Amish Paste | 11 | 18" along | linear | ~17 ft | ~80 ft | 21% |
| Trellis | 240-1200 | Sun Gold | 8 | 18" along | linear | ~12 ft | ~80 ft | 15% |

**Total planted: ~1,152 sq ft of ~1,595 sq ft usable (72%).**

Notes:
- Lettuce and spinach share the greens zone seasonally (spring clears by late June, fall sown Jul 25)
- Kale at 18"x18" uses 54% of its zone. Room for 100+ more plants if distribution demand grows.
- Potato and corn are near capacity. Expansion requires zone boundary changes.
- Trellis is 36% used. Room for more tomatoes.

---

## Channel Path

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
`getChannelCenterX(physY)` returns interpolated center X. Linear interpolation physY 660-780 for bend.

Crop zone east boundaries:
- `CROP_ZONE_SOUTH_EAST_X = 300` (physY < 660, channel at 336)
- `CROP_ZONE_NORTH_EAST_X = 204` (physY >= 660, channel at 240)

---

## Trellis

Single trellis following channel path. T-posts every 120" (10ft) in water channel. Wire height: 72" (6ft).
Trellis data model has only `start` and `end` points — renderer uses channel's path waypoints for wire routing.

---

## Tomato Placement

- **Cherry (Sun Gold)** planted WEST of channel at `channelX - 12`
  - `occupied_subcells` extend EASTWARD over water (using `-dy` in screen coords)
- **Paste (Amish Paste)** planted EAST of channel at `channelX + 12`
  - `occupied_subcells` extend WESTWARD over water (using `+dy` in screen coords)
- Footprint: 2x6 subcells (6" wide x 18" along trellis)
- 18" spacing along channel, starting at physY=240 (skips shade zone)
- Nasturtium trap crops at `channelX - 84` (72" separation from cherry tomatoes)
- Through the bend: uses interpolated `getChannelCenterX(physY)`

---

## Species Catalog (11 plants)

Split into individual files under `src/core/data/species/`:
- Corn (Nothstine Dent), Potato (Kennebec)
- Tomato (Sun Gold, Amish Paste)
- Lettuce (BSS), Kale (Red Russian), Spinach (Bloomsdale)
- Marigold (French), Nasturtium (Trailing), Calendula

Dropped: Sweetie tomato, catnip, parsley, cilantro, spearmint.

---

## Future Work

1. Trellis height visualization: show vertical post height (72") at high zoom
2. Channel water flow: model flow direction and rate
3. Bend verification: bend (physY 660-780) moves channel 96" westward over 120" N-S
