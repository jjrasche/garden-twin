# Wapsie Valley Corn - Data Confidence Assessment

## Overall Assessment: HIGH CONFIDENCE

Existing config is well-researched with accurate data. Minor improvements possible but no critical issues.

---

## Confidence by Field

| Field | Value | Confidence | Justification |
|-------|-------|------------|---------------|
| **Identity** |
| `id` | `corn_wapsie_valley` | **HIGH** | Standard naming |
| `name` | Corn (Wapsie Valley OP Dent) | **HIGH** | Official variety name |
| **Space** |
| `plants_per_sq_ft` | 0.67 | **MEDIUM** | Tighter than typical OP corn (0.4-0.5), may be intentional for intensive gardening |
| `height_ft` | 8 | **HIGH** | Sources report 8-11 ft, 9 ft most common. Existing value conservative. |
| **Timing** |
| `days_to_first_harvest` | 89 | **HIGH** | Median of 85-95 day range across multiple sources |
| `days_harvest_window` | 14 | **MEDIUM** | Reasonable for dent corn (not time-sensitive), but not variety-specific |
| **Yield** |
| `baseline_lbs_per_plant` | 0.25 | **MEDIUM** | May be conservative (university trials suggest 0.47 lbs/plant at field scale) |
| `success_rate` | 0.9 | **LOW** | Estimated - no variety-specific data |
| **Modifiers** |
| `modifiers.sun` | Standard CORN | **MEDIUM** | No variety-specific data; using standard corn |
| `modifiers.soil.*` | Standard CORN | **MEDIUM** | Sources note "highly responsive to fertilizer" but no specific curves |
| `modifiers.spacing_plants_per_sq_ft` | Standard CORN | **MEDIUM** | No variety-specific data |
| **Nutrition** |
| `nutrition_per_lb.*` | USDA dried corn | **HIGH** | Official USDA FoodData Central data for dried dent corn (consumed form) |
| **Visual** |
| `icon` | 🌽, #F4E285 | **HIGH** | Standard corn icon/color |
| **Labor** |
| `tasks` | Standard corn | **MEDIUM** | Adapted from typical corn labor, reasonable |
| `processing_hours_per_lb` | 2.0 | **LOW** | Estimated for hand-shelling, not measured |
| **Costs** |
| `seed_cost_per_plant` | $0.15 | **LOW** | Basis unclear - calculated from seed suppliers suggests $0.03-$0.05 |
| `materials_cost_per_plant` | $0 | **HIGH** | Corn requires no support |
| **Metadata** |
| `data_confidence` | high | **HIGH** | Appropriate overall assessment |
| `sources` | 2 citations | **LOW** | Sparse - need variety-specific sources added |

---

## Source Quality

### Existing Sources
- **MSU 2024 Craft Corn Trials** - HIGH quality (university research)
- **USDA FoodData Central** - HIGH quality (authoritative)

### Additional Sources Available
- **Artesian Organic Farm** - HIGH (original breeder)
- **OPCORN.com** - HIGH (specialized OP corn supplier)
- **Lakeview Organic Grain Guide** - HIGH (extension-level)
- **Green Haven** - MEDIUM (reputable seed company)
- **Thresh Seed Co** - MEDIUM (seed company)

**Recommendation:** Add variety-specific sources to improve documentation.

---

## Critical Fields Assessment

### Fields with HIGH Confidence (Production-Ready)
✓ Days to maturity (89)
✓ Plant height (8 ft, conservative)
✓ Nutrition data (USDA)
✓ Icon/color

### Fields with MEDIUM Confidence (Minor Refinements Possible)
⚠ Spacing (0.67 may be intentional intensive spacing, verify)
⚠ Yield (0.25 may be conservative, could be 0.35-0.5)
⚠ Harvest window (14 days reasonable but not verified)
⚠ Modifiers (standard corn, no variety-specific data)
⚠ Labor tasks (standard corn, reasonable)

### Fields with LOW Confidence (Needs Verification)
⚠ Success rate (0.9 estimated)
⚠ Seed cost ($0.15 basis unclear)
⚠ Processing time (2.0 hrs/lb estimated)
⚠ Source documentation (sparse)

---

## Risk Assessment

**Production Risk: LOW**

No critical data errors identified. All low-confidence fields are:
- Secondary parameters (processing time, seed cost)
- Reasonable estimates (success rate)
- Documentation issues (sources)

**Core agricultural data (DTM, height, spacing, nutrition) is sound.**

---

## Comparison to Golden Bantam Research

| Aspect | Wapsie Valley | Golden Bantam |
|--------|---------------|---------------|
| **Source documentation** | LOW (2 generic) | HIGH (6 specific) |
| **Days to maturity** | HIGH verified | HIGH verified |
| **Height** | HIGH verified | HIGH verified |
| **Spacing** | MEDIUM (intentional?) | HIGH verified |
| **Yield** | MEDIUM (conservative?) | MEDIUM (calculated) |
| **Success rate** | LOW (estimated) | LOW (estimated) |
| **Seed cost** | LOW (unclear basis) | HIGH (calculated) |
| **Nutrition** | HIGH (USDA) | HIGH (USDA) |

**Key difference:** Golden Bantam has better source documentation and clearer cost calculation. Wapsie Valley has same data quality but sparser citations.

---

## Recommendations

### Before Production
1. **Update nutrition comment** - specify "consumed form (dried)"
2. **Add variety-specific sources** - Artesian Organic, OPCORN, Lakeview Guide
3. **Clarify seed cost basis** - document why $0.15 or update to $0.03-$0.05

### Optional Refinements
1. **Update height** - from 8 ft to 9 ft (more accurate)
2. **Verify yield** - confirm 0.25 lbs or increase to 0.35-0.5 lbs
3. **Document spacing** - clarify whether 0.67 is intentional intensive spacing

### Field Trials (Year 1)
1. **Measure actual yield** - verify 0.25 lbs per plant
2. **Confirm success rate** - track germination and survival
3. **Time processing** - measure actual shelling labor

---

## Overall: Production-Ready with Minor Improvements

**Verdict:** Existing config is solid and can be used as-is. Improvements are documentation/refinement, not corrections. No blocking issues.
