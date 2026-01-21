# Golden Bantam Corn - Data Confidence Assessment

## Confidence Levels by Field

### Identity

| Field | Value | Confidence | Justification |
|-------|-------|------------|---------------|
| `id` | `corn_golden_bantam` | **HIGH** | Standard naming convention |
| `name` | `Corn (Golden Bantam)` | **HIGH** | Well-documented heirloom variety name |

---

### Space Requirements

| Field | Value | Confidence | Justification |
|-------|-------|------------|---------------|
| `plants_per_sq_ft` | 0.4 | **HIGH** | Multiple sources confirm 12" in-row × 30" between rows = 2.5 sq ft per plant |
| `height_ft` | 5.5 | **HIGH** | Consistent 5-6 ft range across all seed suppliers |

**Sources:**
- Fine Seeds, Victory Seeds, Ferry-Morse, UF Seeds all report 5-6 ft
- Spacing recommendations consistent across 4+ sources

**Note:** Spacing is wider than Wapsie Valley (0.67 plants/sq ft). Golden Bantam may be more conservative, or could be tightened for intensive gardening. Monitor spacing modifier performance.

---

### Timing

| Field | Value | Confidence | Justification |
|-------|-------|------------|---------------|
| `days_to_first_harvest` | 80 | **HIGH** | Median of reputable seed company data (range: 75-85 days) |
| `days_harvest_window` | 10 | **MEDIUM** | Based on extension data for sweet corn in general, not Golden Bantam specifically |

**Sources:**
- Days to maturity: Territorial (85), Ferry-Morse (80), Victory (78), UF Seeds (75-80)
- Harvest window: Oklahoma State Extension, Old Farmer's Almanac (7-10 day window per planting)

**Note:** Harvest window is a "practical picking window" (not peak eating window, which is 2-3 days). This aligns with home garden usage.

---

### Yield Model

| Field | Value | Confidence | Justification |
|-------|-------|------------|---------------|
| `baseline_lbs_per_plant` | 0.3 | **MEDIUM** | Calculated from ear count × ear weight estimates |
| `success_rate` | 0.9 | **LOW** | Borrowed from CORN_WAPSIE_VALLEY - no variety-specific data |

**Yield Calculation Breakdown:**

1. **Ears per plant:** 1.5 (average of 1-2 ears) - **HIGH CONFIDENCE**
   - Sources: Ferry-Morse, Victory Seeds, Fine Seeds all report 1-2 ears

2. **Ear weight:** 0.2 lbs per ear (fresh weight) - **MEDIUM CONFIDENCE**
   - Based on: USDA medium ear = 0.225 lbs, but Golden Bantam ears are smaller (6-7" vs 7.5" standard)
   - Conservative estimate for heirloom variety

3. **Total yield:** 1.5 × 0.2 = 0.3 lbs fresh weight - **MEDIUM CONFIDENCE**
   - Depends on ear weight estimate

**Weight Standard: FRESH WEIGHT AT HARVEST**
- All crops use fresh weight at harvest (per Jim's decision)
- Golden Bantam: 0.3 lbs fresh sweet corn
- Wapsie Valley: 0.25 lbs fresh dent corn (whole ear before drying)
- Consistent across all crops

**Success Rate:**
- No Golden Bantam-specific germination/survival data found
- Used 0.9 (90%) as typical for heirloom sweet corn
- **To improve:** Get actual germination test results from seed companies

---

### Modifiers

| Field | Value | Confidence | Justification |
|-------|-------|------------|---------------|
| `modifiers.sun` | Standard CORN | **MEDIUM** | No variety-specific data; using standard corn requirements |
| `modifiers.soil.*` | Standard CORN | **MEDIUM** | No evidence Golden Bantam differs from typical corn |
| `modifiers.spacing_plants_per_sq_ft` | Adjusted for 0.4 optimal | **MEDIUM** | Added 0.4 as optimal based on spacing research |

**Per architect instructions:** Used CORN_WAPSIE_VALLEY modifiers as baseline.

**Research findings:**
- No sources indicated Golden Bantam has unusual nutrient requirements
- No sources indicated unusual sun/pH sensitivity
- Spacing adjusted to reflect Golden Bantam's wider planting recommendation

**To improve confidence:**
- Search historical extension publications for variety-specific fertilizer trials
- Contact heirloom seed companies for variety-specific growing notes

---

### Nutrition

| Field | Value | Confidence | Justification |
|-------|-------|------------|---------------|
| `nutrition_per_lb.*` | USDA values | **HIGH** | Official USDA FoodData Central data for raw yellow sweet corn |

**Source:** USDA FoodData Central via nutritionvalue.org, cross-checked with multiple USDA databases

**Data per 100g converted to per pound (454g):**
- Calories: 390 - **HIGH**
- Protein: 15g - **HIGH**
- Carbs: 85g - **HIGH**
- Fat: 6.4g - **HIGH**
- Fiber: 9.1g - **HIGH**
- Vitamins/minerals: All **HIGH**

**Note:** This is generic "sweet corn, yellow, raw" data, not Golden Bantam-specific. However, sweet corn nutrition is highly standardized, so confidence is high.

---

### Visual

| Field | Value | Confidence | Justification |
|-------|-------|------------|---------------|
| `icon.emoji` | 🌽 | **HIGH** | Standard corn emoji |
| `icon.color` | #F4E285 | **HIGH** | Matches CORN_WAPSIE_VALLEY (golden yellow) |

---

### Labor Tasks

| Field | Value | Confidence | Justification |
|-------|-------|------------|---------------|
| `tasks` (general) | Adapted from Wapsie | **MEDIUM** | Based on standard corn labor, adjusted for 80-day maturity |
| `hours_per_plant` | Standard corn | **MEDIUM** | No Golden Bantam-specific data; using typical corn estimates |
| `hours_per_sq_ft` | Standard corn | **MEDIUM** | Same as above |
| `processing_hours_per_lb` | 0.5 | **LOW** | Estimated based on shucking being faster than shelling |

**Task-by-task breakdown:**

1. **Planting:** 0.01 hrs/plant - **MEDIUM**
   - Standard corn planting time

2. **Watering:** 0.02 hrs/plant × 11 waterings - **MEDIUM**
   - Adjusted schedule for 80-day crop (vs 89 days for Wapsie)
   - Timing: every 7 days through day 77

3. **Weeding:** 0.05 hrs/sq ft × 5 sessions - **MEDIUM**
   - Standard corn weeding (days 14, 21, 28, 35, 42)

4. **Harvest:** 0.03 hrs/plant × 3 pickings - **MEDIUM**
   - Days 80, 85, 90 (covering 10-day harvest window)

5. **Processing:** 0.5 hrs/lb - **LOW (ESTIMATED)**
   - Shucking fresh corn vs shelling dried corn (2.0 hrs/lb for Wapsie)
   - **To improve:** Time actual shucking labor

---

### Costs

| Field | Value | Confidence | Justification |
|-------|-------|------------|---------------|
| `seed_cost_per_plant` | $0.03 | **HIGH** | Calculated from Territorial Seed pricing and seeds per ounce |
| `materials_cost_per_plant` | $0 | **HIGH** | Corn requires no staking or support materials |

**Seed Cost Calculation:**
- Territorial Seed: $3.35 per 1 oz packet
- True Leaf Market: ~120 seeds per ounce
- **Cost per seed:** $3.35 / 120 = $0.028 ≈ $0.03 (rounded)

**Alternative pricing (for reference):**
- Territorial organic: $5.25/oz = $0.044/seed
- Seed Savers Exchange: pricing unavailable (site blocked)

**Materials:**
- No cages, stakes, or trellising required for corn
- Hilling is labor, not materials

---

### Data Quality Metadata

| Field | Value | Confidence | Justification |
|-------|-------|------------|---------------|
| `data_confidence` | **high** | N/A | Overall assessment based on source quality |
| `sources` | 6 citations | **HIGH** | Mix of seed companies, extension, USDA |

**Overall Assessment: HIGH confidence**

Rationale:
- Strong data for: days to maturity, height, spacing, nutrition, seed cost
- Medium data for: yield, modifiers, labor
- Weak data for: success rate, processing time
- All critical fields have reputable sources

**Source Quality Breakdown:**
- University extension: 1 source (harvest window)
- Seed companies (reputable): 4+ sources (Territorial, Victory, Ferry-Morse, UF Seeds)
- USDA: 1 source (nutrition)
- Growing guides: 2 sources (Fine Seeds, True Leaf Market)

---

## Summary Table

| Category | Fields | Confidence | Risk |
|----------|--------|------------|------|
| **Identity** | id, name | HIGH | None |
| **Space** | plants_per_sq_ft, height_ft | HIGH | None |
| **Timing** | days_to_first_harvest | HIGH | None |
| **Timing** | days_harvest_window | MEDIUM | Could be 7-14 days (used 10) |
| **Yield** | baseline_lbs_per_plant | MEDIUM | Ear weight estimate could vary ±0.05 lbs |
| **Yield** | success_rate | LOW | Estimated at 0.9, should verify |
| **Modifiers** | All | MEDIUM | No variety-specific data; used standard corn |
| **Nutrition** | All | HIGH | USDA data |
| **Icon** | emoji, color | HIGH | None |
| **Labor** | Most tasks | MEDIUM | Standard corn estimates |
| **Labor** | processing_hours_per_lb | LOW | Estimated at 0.5 hrs/lb |
| **Costs** | seed_cost_per_plant | HIGH | Calculated from real pricing |
| **Costs** | materials_cost_per_plant | HIGH | Confirmed $0 |

---

## Recommendations

### Before Using in Production

1. **Verify success rate** (get germination data from seed company)
2. **Time processing labor** (actual shucking time per pound)
3. **Calibrate yield** (field trials to confirm 0.3 lbs per plant average)

### For Future Improvement

1. **Field trials:** Grow Golden Bantam and measure actual yields
2. **Historical research:** Search USDA archives for variety-specific data from 1900s-1960s
3. **Grower surveys:** Collect anecdotal data from home gardeners

### For Other 18 Varieties

This research methodology should work well for:
- Heirloom varieties with consistent seed company data
- Crops with USDA nutrition data
- Standard vegetable crops (tomatoes, potatoes, greens)

**Expect similar confidence levels:**
- HIGH: days to maturity, spacing, height, nutrition, seed cost
- MEDIUM: yield, modifiers, labor tasks
- LOW: success rates, variety-specific processing times
