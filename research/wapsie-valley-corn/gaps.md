# Wapsie Valley Corn - Data Gaps

## Summary

Existing CORN_WAPSIE_VALLEY config is **solid** with minimal gaps. Most data verified through research. This document focuses on minor improvements and clarifications.

---

## Minor Gaps / Improvements Needed

### 1. Source Documentation

**Gap:** Existing config has only 2 generic source citations
- "MSU 2024 Craft Corn Trials" (yield)
- "USDA FoodData Central - Corn, dried" (nutrition)

**Improvement:** Add variety-specific sources:
- Artesian Organic Farm (original breeder)
- OPCORN.com (specialized OP corn supplier)
- Lakeview Organic Grain growing guide
- Green Haven (major OP corn seed supplier)

**Impact:** LOW - data is correct, just needs better attribution

---

### 2. Height Refinement

**Current:** 8 ft
**Research:** Sources consistently report 8-11 ft, with 9 ft most common

**Recommendation:** Update to 9 ft for better accuracy

**Impact:** LOW - minor adjustment

---

### 3. Yield Verification

**Current:** 0.25 lbs fresh weight per plant
**Research findings:**
- University trials: 152 bu/acre at 18,000 plants = 0.47 lbs/plant (field scale)
- Estimated ear weight: 0.5 lbs fresh × 1 ear = 0.5 lbs/plant
- Current value appears conservative

**Possible explanations for 0.25 lbs:**
- Garden conditions vs field conditions
- Accounting for second ear failure
- Partial ear yield
- Measured at different moisture content

**Recommendation:** Verify whether 0.25 lbs is correct or should be increased to 0.35-0.5 lbs

**Impact:** MEDIUM - affects calorie yield calculations

---

### 4. Seed Cost Basis

**Current:** $0.15 per plant
**Research:** $35/lb ÷ 1,400 seeds = $0.025 per seed

**Gap:** Existing cost is 6× higher than calculated

**Possible explanations:**
- Includes planting losses (need to plant extra seeds)
- Based on organic seed pricing ($109/lb)
- Based on small packet retail pricing
- Undocumented

**Recommendation:** Clarify basis for $0.15 or update to $0.03-$0.05

**Impact:** MEDIUM - affects economic modeling

---

### 5. Spacing Verification

**Current:** 0.67 plants/sq ft (1 plant per 1.5 sq ft)
**Research:** OP corn spacing typically 8-12" in-row × 30-36" between rows = 0.4-0.43 plants/sq ft

**Gap:** Existing spacing is tighter than typical OP corn recommendations

**Possible explanations:**
- Optimized for intensive garden use
- Square foot gardening adaptation
- Based on MSU trial spacing

**Recommendation:** Document whether 0.67 is intentional intensive spacing or should be reduced to 0.4-0.5

**Impact:** LOW - affects space calculations but may be intentional

---

### 6. Success Rate Source

**Current:** 0.9 (90%) - no source documented
**Research:** No Wapsie Valley-specific germination/survival data found

**Gap:** Estimated, not researched

**Recommendation:** Contact seed suppliers (Artesian Organic, OPCORN) for germination test results

**Impact:** LOW - 0.9 is reasonable estimate for OP corn

---

### 7. Harvest Window Basis

**Current:** 14 days
**Research:** No Wapsie Valley-specific data found

**Gap:** Reasonable estimate for dent corn but not verified

**Recommendation:** Acceptable as-is (dent corn has flexible harvest window)

**Impact:** LOW - dent corn is not time-sensitive like sweet corn

---

### 8. Nutrition Comment Clarity

**Current comment:** "per lb of dried corn"
**Clarification needed:** Should specify "consumed form" to distinguish from yield measurement (fresh weight)

**Recommendation:** Update comment to: "per lb of dried corn (consumed form)"

**Impact:** LOW - documentation clarity only

---

## Data Not Available (Inherent Gaps)

### Variety-Specific Modifiers

**What's missing:**
- Wapsie Valley-specific N/P/K response curves
- Variety-specific pH sensitivity
- Variety-specific sun requirements

**What's available:**
- Generic corn modifiers (used in existing config)
- Qualitative note: "highly responsive to fertilizer"
- Higher protein content (11%) suggests higher N demand

**Recommendation:** Existing standard CORN modifiers are acceptable. No variety-specific data exists in literature.

**Impact:** LOW - standard modifiers are reasonable

---

### Processing Time Verification

**Current:** 2.0 hrs/lb for shelling dried corn
**Research:** No quantified data found

**Gap:** Estimated based on manual shelling labor

**Recommendation:** Time actual shelling labor or survey growers

**Impact:** LOW - processing time is secondary to yield/nutrition

---

## Fields with NO Gaps (Verified)

✓ Days to maturity: 89 days (verified across multiple sources)
✓ Nutrition data: USDA FoodData Central (authoritative)
✓ Materials cost: $0 (corn requires no support)
✓ Icon/color: Standard
✓ Labor tasks: Standard corn labor (reasonable)

---

## Overall Assessment

**Existing config quality: HIGH**

Most critical fields are accurate and well-sourced. Gaps are minor:
- Documentation improvements (sources)
- Minor refinements (height, possibly yield)
- Cost basis clarification

**No blocking issues.** Config can be used as-is with minor improvements.

---

## Recommendations for Implementation

### Immediate (before production):
1. Update nutrition comment: "consumed form"
2. Add variety-specific sources to citations

### Low priority (calibrate later):
1. Verify yield (0.25 vs 0.35-0.5 lbs)
2. Clarify seed cost basis ($0.15 vs $0.03)
3. Update height to 9 ft (minor)
4. Document spacing rationale (0.67 intensive vs 0.4 typical)

### Field trials (Year 1 data):
1. Measure actual yield per plant
2. Confirm success rate
3. Time processing labor
4. Verify spacing modifier performance
