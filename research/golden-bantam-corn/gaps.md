# Golden Bantam Corn - Data Gaps

## Missing Data (Could Not Find)

### 1. Variety-Specific Success Rate
**What I searched for:**
- Golden Bantam germination rate
- Golden Bantam survival to harvest
- University trial data on stand establishment

**What I found:**
- Generic sweet corn germination rates (85-95% under optimal conditions)
- No Golden Bantam-specific data

**What I used:**
- **0.9 (90%)** - borrowed from CORN_WAPSIE_VALLEY
- This is a reasonable estimate for heirloom sweet corn in home garden conditions

**Confidence:** LOW (estimated)

**How to improve:**
- Contact seed companies (Seed Savers Exchange, Baker Creek) for germination test results
- Search university variety trial data (MSU, Purdue, Cornell)
- Look for historical USDA variety trial reports from 1900s-1950s

---

### 2. Variety-Specific Soil/Nutrient Modifiers
**What I searched for:**
- Golden Bantam nitrogen requirements vs other corn
- Golden Bantam pH sensitivity
- Golden Bantam phosphorus/potassium needs

**What I found:**
- Generic sweet corn nutrient requirements (matches standard corn)
- No evidence that Golden Bantam differs from typical corn varieties

**What I used:**
- **Standard CORN modifiers** from CORN_WAPSIE_VALLEY
- One adjustment: spacing modifier updated to reflect 0.4 plants/sq ft optimal density

**Confidence:** MEDIUM (no evidence of variety differences, but no explicit confirmation either)

**How to improve:**
- Search for "Golden Bantam fertilizer requirements" in historical extension publications
- Contact heirloom seed companies for variety-specific growing notes
- Check soil science journals from 1900s-1960s when Golden Bantam was widely studied

---

### 3. Precise Ear Weight (Fresh)
**What I searched for:**
- Golden Bantam ear weight grams ounces
- Sweet corn ear weight 6-7 inches

**What I found:**
- USDA standard ear weights (small: 73g, medium: 102g, large: 143g)
- Ear size references (6-7" for Golden Bantam)
- No direct weight measurements for Golden Bantam specifically

**What I used:**
- **0.2 lbs per ear** (conservative estimate for small-medium ear)
- USDA medium ear is 0.225 lbs, but Golden Bantam ears are smaller than modern hybrids

**Confidence:** MEDIUM (reasonable extrapolation from USDA data, but not variety-specific)

**How to improve:**
- Weigh actual Golden Bantam ears at harvest (field data)
- Contact growers who sell Golden Bantam at farmers markets for typical ear weights
- Search for historical USDA variety trial data with ear weights

---

### 4. Processing Hours Per Pound (Shucking)
**What I searched for:**
- Sweet corn shucking time per pound
- Labor requirements corn harvest fresh eating

**What I found:**
- Generic harvest labor estimates
- Anecdotal reports that fresh corn is faster to process than dried corn
- No quantified shucking time data

**What I used:**
- **0.5 hours/lb** (vs 2.0 hours/lb for dried corn shelling)
- Estimate based on: shucking is faster than shelling, and fresh corn is eaten on the cob (less processing)

**Confidence:** LOW (estimated, not researched)

**How to improve:**
- Time actual shucking labor
- Survey home gardeners or small farms for processing time data
- Check agricultural labor studies for sweet corn processing

---

### 5. Materials Cost
**What I searched for:**
- Golden Bantam staking, trellising, support requirements

**What I found:**
- Corn doesn't require staking or support materials
- Some sources mention hilling (labor, not materials)

**What I used:**
- **$0** - no materials cost

**Confidence:** HIGH (corn doesn't need materials)

**Gaps:** None - this is correct.

---

### 6. Variety-Specific Disease/Pest Resistance
**What I searched for:**
- Golden Bantam disease resistance
- Golden Bantam pest tolerance
- Heirloom corn vulnerability vs hybrids

**What I found:**
- Generic heirloom corn notes (less disease resistance than modern hybrids)
- No Golden Bantam-specific data

**What I used:**
- Not captured in current PlantSpecies schema
- Could affect `success_rate` if modeled

**Confidence:** N/A (not part of current schema)

**How to improve:**
- If schema expands to include disease modifiers, research Golden Bantam susceptibility to:
  - Corn smut
  - Corn earworm
  - Stewart's wilt
  - Common rust

---

### 7. Johnny's Seeds / High Mowing / Fedco Pricing
**What I searched for:**
- Golden Bantam seed pricing from major regional seed companies

**What I found:**
- **Johnny's Seeds:** Does not carry Golden Bantam
- **High Mowing Seeds:** Does not carry Golden Bantam (or not indexed in search)
- **Fedco Seeds:** Not found in search results

**What I used:**
- Territorial Seed pricing ($3.35/oz) as proxy
- Seed Savers Exchange carries it but site blocked scraping

**Confidence:** MEDIUM (used alternative reputable seed company)

**How to improve:**
- Check Fedco catalog directly (may be seasonal availability)
- Verify Johnny's and High Mowing catalogs manually
- Get organic pricing from Seed Savers Exchange

---

## Data Quality Notes

### Why Gaps Exist

1. **Heirloom Variety:**
   - Golden Bantam was popular 1902-1960s, less research since modern hybrids took over
   - Historical data may exist in archives but not digitized

2. **Home Garden Focus:**
   - Most research is on commercial corn production (field scale)
   - Small-scale garden data is anecdotal or extension-based

3. **Fresh vs Dried:**
   - Wapsie Valley (dent corn) has dried weight data
   - Golden Bantam (sweet corn) consumed fresh, less weight/nutrition standardization

### Impact of Gaps

**LOW IMPACT (used reasonable estimates):**
- Success rate
- Processing hours
- Ear weight

**NO IMPACT (used standard modifiers):**
- Soil/nutrient requirements
- Sun requirements

**RESOLVED (found good data):**
- Days to maturity
- Plant height
- Spacing
- Nutrition (USDA)
- Seed cost

---

## Recommendations for Future Research

1. **Field Trials:**
   - Grow Golden Bantam and measure actual yields, ear weights, processing time
   - Compare side-by-side with Wapsie Valley for calibration

2. **Historical Archives:**
   - Search USDA archives for 1900s-1960s variety trials
   - Check university library special collections for extension bulletins

3. **Seed Company Outreach:**
   - Contact Seed Savers Exchange, Baker Creek, Fedco for variety-specific data
   - Ask for germination test results, typical yields, grower feedback

4. **Grower Surveys:**
   - Survey home gardeners who grow Golden Bantam
   - Collect anecdotal data on yields, spacing, success rates
