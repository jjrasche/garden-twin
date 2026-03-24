# Production Plan — 2026 Season

Family of 4, Grand Rapids MI (Zone 6a).
Designed backwards from weekly consumption, not forward from maximum yield.

---

## Family Consumption Basis

| Crop | Fresh consumption | Stored/canned | Season | Family total lbs |
|------|-------------------|---------------|--------|-----------------|
| Leafy greens | 7 lbs/week × 22 wks | none | Late May - late Oct | 154 |
| Paste tomato | 1 lb/week × 6.5 wks | 45 wks × 1 qt sauce × 3 lbs/qt | Fresh: Aug 15 - Oct 1 | 142 |
| Cherry tomato | 2 lbs/week × 10 wks | none | Jul 24 - Oct 1 | 20 |
| Potato | 4 lbs/week × 28 wks (fresh+cellar) | none (buy store Feb-Jun) | Harvest Jul 19, cellar Jul-Jan | 112 |
| Corn (dent) | none (not sweet) | 0.75 lbs meal/week × 52 wks | Harvest late Aug, dried indefinitely | 56 dried |

### Notes
- **Paste sauce coverage**: Oct 1 through Aug 14 next year = 45 weeks at 1 quart/week.
  3 lbs fresh tomatoes per quart of finished sauce.
- **Potato storage**: Root cellar good for ~6 months (Jul-Jan).
  Buy store-bought Feb-Jun (~$64).
- **Cornmeal**: 0.75 lbs/week makes 1 batch cornbread + 1 batch polenta (2 meals/week for 4).
  Whole dried corn stores indefinitely. Grind as needed.
- **Greens 7 lbs/week**: 1.75 lbs/person. One big salad/day + some cooking greens.

---

## Per-Plant Yields

| Crop | Baseline lbs | Germ | Estab | Combined | Yield/plant | Days to harvest | Per-plant output |
|------|-------------|------|-------|----------|------------|----------------|-----------------|
| Kale Red Russian | 1.75 | 0.95 | 0.97 | 0.92 | 1.61 | 50 | ~26 leaves/harvest × 6 cuts |
| Lettuce BSS | 0.50 | 0.90 | 0.95 | 0.86 | 0.43 | 28 | 1 head |
| Spinach Bloomsdale | 0.28 | 0.90 | 0.95 | 0.86 | 0.24 | 45 | ~3 cut-and-come-again harvests |
| Amish Paste | 15.00 | 1.00 | 0.92 | 0.92 | 13.80 | 82 | **4.6 quarts sauce** (@ 3 lbs/qt) |
| Sun Gold | 10.00 | 1.00 | 0.92 | 0.92 | 9.20 | 60 | **~245 tomatoes** (@ 0.6 oz each) |
| Potato Kennebec | 1.50 | 0.95 | 0.90 | 0.86 | 1.28 | 90 | ~5 potatoes (avg 4-5 oz each) |
| Corn Nothstine Dent | 0.28 | 0.90 | 0.95 | 0.86 | 0.24 | 95 | 1 ear dried → 0.24 lbs meal |

### Survival rate definitions

- **Germ (germination)**: Fraction of seeds/tubers that emerge as seedlings.
  For soil-blocked crops with 2 seeds/block, effective per-block rate is ~98%.
  Tomatoes show 1.00 because all transplanted blocks are live plants.
- **Estab (establishment)**: Fraction of emerged plants that survive to produce harvest.
  Covers transplant shock, pest pressure (slugs, flea beetles, cutworms),
  disease (blight, damping off), and weather stress.
- **Combined**: Germ x Estab. Used in yield model.
- **Yield/plant**: Baseline x Combined. What each planted spot actually produces.

---

## Derived Plant Counts

### Family Only

| Crop | Family lbs | / Yield per plant | = Family plants |
|------|-----------|-------------------|----------------|
| Kale | 97 | / 1.61 | 60 |
| Lettuce | 60 | / 0.43 | 140 |
| Spinach | 24 | / 0.24 | 100 |
| Amish Paste | 142 | / 13.80 | 11 |
| Sun Gold | 20 | / 9.20 | 3 |
| Potato | 112 | / 1.28 | 88 |
| Corn | 56 dried | / 0.24 | 234 |

### With Distribution (current thinking)

| Crop | Family plants | Distrib | Extra plants | Total plants | Total lbs |
|------|--------------|---------|-------------|-------------|-----------|
| Kale | 60 | +100% | 60 | **120** | 193 |
| Lettuce | 140 | +100% | 140 | **280** | 120 |
| Spinach | 100 | +100% | 100 | **200** | 48 |
| Amish Paste | 11 | +0% | 0 | **11** | 152 |
| Sun Gold | 3 | +167% | 5 | **8** | 74 |
| Potato | 88 | +0% | 0 | **88** | 112 |
| Corn | 234 | +0% | 0 | **234** | 56 dried |

**Decided 2026-03-15**: Potato = cellar only, buy store-bought Feb-Jun (~$64).
Paste, potato, corn: family-maximized, distribute surplus only. No extra plants.

---

## Labor Model

Weekly labor is **computed, not hand-written**. Each species has a `LifecycleSpec` defining
every activity, its timing, duration per plant, equipment, and instructions.

The `buildLaborSchedule()` calculator combines lifecycle specs with plant counts and planting
dates to produce a per-week labor breakdown. See:

- `src/core/types/LifecycleSpec.ts` -- schema (activities + processing)
- `src/core/data/lifecycle/*.lifecycle.ts` -- per-species activity data
- `src/core/calculators/LaborSchedule.ts` -- weekly schedule calculator

### Processing Labor (Paste Tomatoes)

Canning is modeled as a `ProcessingActivity` on the Amish Paste lifecycle spec:
- 21 lbs input per batch, 7 quarts output, 240 minutes per batch
- Equipment: stockpot, food mill, canning jars, water bath canner

| Scenario | Total lbs | Quarts sauce | Batches | Total canning hours |
|----------|----------|-------------|---------|-------------------|
| Family only (11 plants) | 152 | 44 | 7 | **28 hrs** |
| Family + 50% (17 plants) | 235 | 68 | 10 | **40 hrs** |
| Family + 100% (22 plants) | 304 | 88 | 13 | **52 hrs** |

All canning happens in a 3-4 week window (mid-Aug through Sep).

---

## Potato Storage — DECIDED: Option A (cellar only)

- 88 plants, 112 lbs, root cellar Jul-Jan
- Buy store-bought Feb-Jun: ~$0.80/lb x 80 lbs = $64
- No freezer space needed

---

## Cherry Tomato Freshness — Year-Round Access

Baseline outdoor window: Jul 24 - Oct 1 (10 weeks). Goal: maximize weeks of fresh-quality cherry tomatoes.

### Extending the Season

| Method | Effect | Cost | Effort |
|--------|--------|------|--------|
| Sub Arctic Plenty (42-50d variety) | First fruit ~Jul 10, +2 weeks front-end | Seed cost | None |
| Row cover / frost blanket | Extend to ~Oct 21, +3 weeks back-end | $30 | Drape at frost warning |
| Green tomato indoor ripening | Pick before hard frost, ripen at 55-70F into Jan | Free | Check weekly, remove rotten |
| Low tunnel (caterpillar tunnel) | Extend to ~Nov 15, +6 weeks | $100-200 | Open/close daily |

### Preserving Fresh Quality Beyond Season

| Method | Shelf life | Snacking quality | Effort |
|--------|-----------|-----------------|--------|
| Dehydrated (cherry halves) | 18 months | Good. Concentrated, chewy. Best snack preservation. | 8-12 hrs in dehydrator, set and forget |
| Lacto-fermented | 6-12 months (fridge) | Good. Tangy, holds shape, probiotic. | 15 min setup, 3-5 day ferment, done |
| Frozen whole | 6 months | Poor. Mushy when thawed, cooking only. | Wash, freeze on sheet, bag. Trivial. |
| Indoor plant under LED | Year-round, 1-2 pints/plant/month | Perfect. Real fresh. | High: 40W LED 14-16h/day, hand-pollinate |

### DECIDED: Best combo (no Wall O' Water)

1. Add Sub Arctic Plenty (2-4 plants): first fruit ~Jul 10
2. Row cover at frost ($30): extend to ~Oct 21
3. Pick green before hard frost, ripen indoors to Jan
4. Dehydrate surplus during peak (Jul-Sep) for winter snacking
5. Lacto-ferment 2-3 batches for fridge supply

Result: ~Jul 10 to Jan 15 = **27 weeks** of fresh cherry tomatoes (vs 10 weeks). Under $50.

---

## Decisions Made (2026-03-15)

- Potato: Option A, cellar only, 88 plants. Buy Feb-Jun.
- No Wall O' Water.
- No freezing potatoes.
- Paste/potato/corn distribution: +0%. Family only, distribute surplus.
- Greens/cherry distribution: +100%.
- Labor budget: 20-30 min/day. Neighborhood kids + self-service for beginner tasks.

## Open Decisions

1. **Paste tomato distribution**: Currently +0% (11 plants). Revisit after seeing labor chart.
2. **Sub Arctic Plenty**: Add 2-4 plants for Jul 10 first fruit? (vs Jul 24 Sun Gold)
3. **Greens distribution labor**: 192 kale + 280 lettuce + 200 spinach. Sustainable at 20-30 min/day?
   Check the Labor tab to see weekly breakdown.
