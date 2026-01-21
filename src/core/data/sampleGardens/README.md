# Sample Gardens

Test garden configurations for UI and simulation testing.

## testGarden.ts

**Purpose:** UI testing with real researched plant data

**Specifications:**
- **Size:** 40×100 ft (4,000 sq ft)
- **Subcells:** 64,000 (3×3 inch grid)
- **Plants:** 150 total across 6 varieties
- **Sun zones:** Mixed (8 hours full sun, 6 hours partial)
- **Planting dates:** Staggered May 10-30, 2025

### Plant Distribution

| Variety | Count | Zone | Planting Date | Days to Harvest | Harvest Date |
|---------|-------|------|---------------|-----------------|--------------|
| Red Norland Potato | 25 | Partial SW | May 10 | 80 | ~July 30 |
| Golden Bantam Corn | 30 | Full Sun NW | May 15 | 80 | ~August 3 |
| Yukon Gold Potato | 20 | Partial SE | May 20 | 90 | ~August 18 |
| Stowell's Evergreen Corn | 30 | Full Sun NE | May 25 | 95 | ~August 28 |
| Wapsie Valley Corn | 20 | Full Sun NW | May 30 | 89 | ~August 27 |
| Russet Burbank Potato | 25 | Partial SW | May 30 | 110 | ~September 17 |

**Total:** 150 plants

### Garden Layout

```
     NW (Full Sun 8hrs)    |    NE (Full Sun 8hrs)
  Golden Bantam (30)       |  Stowell's Evergreen (30)
  Wapsie Valley (20)       |
─────────────────────────────────────────────────────
  SW (Partial 6hrs)        |    SE (Partial 6hrs)
  Red Norland (25)         |  Yukon Gold (20)
  Russet Burbank (25)      |
```

### Expected UI Features to Test

1. **Grid rendering:**
   - Zoom levels: Zone (10×10 ft) → Cell (1×1 ft) → Subcell (3×3 in)
   - Plant icons visible at cell/subcell level
   - Color coding by species/variety

2. **Labor timeline:**
   - Planting spike: May 10-30
   - Hilling spike: Early June (potatoes)
   - Watering: Continuous throughout season
   - Harvest peaks: Late July through mid-September

3. **Harvest timeline:**
   - Sequential harvests from July 30 to Sept 17
   - Different harvest windows (potatoes: 7 days, corn: 10-14 days)

4. **Nutrition/calorie tracking:**
   - Total expected yield: ~240 lbs
   - Caloric value: ~70,000 calories (mix of corn and potatoes)

### Loading Instructions

```typescript
import { testGarden } from '@/core/data/sampleGardens/testGarden';

// In your component:
function loadTestGarden() {
  setGarden(testGarden);
}
```

### Validation Checks

After loading, verify:
- ✓ Total subcells: 64,000
- ✓ Planted subcells: 150
- ✓ Sun zones: NW/NE = 8 hours, SW/SE = 6 hours
- ✓ Planting dates: 6 different dates (May 10-30)
- ✓ Species diversity: 3 corn varieties, 3 potato varieties

### Notes

- Subcells without plants are empty but have soil/sun data
- Plant spacing respects each variety's `plants_per_sq_ft` specification
- Expected yields use `baseline_lbs_per_plant` from research configs
- All dates use ISO format for consistency
