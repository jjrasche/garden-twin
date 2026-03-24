# Trellis Structural Analysis

Updated 2026-03-23. All numbers derived from first principles with sources.

## Decision

**10ft T-post spacing, 1.5" EMT crossbar, 30-36" T-post embedment.**
Sun Gold on the west (garden-interior) side, Amish Paste on the east side.

## Equipment

| Item | Spec | Notes |
|------|------|-------|
| Crossbar | 1.5" EMT (Lowes #72719, Allied Tube 550410000) | 10ft sticks |
| T-posts | 8ft, driven 30-36" (60" above ground) | Rail steel, Fy >= 50 ksi |
| Twine | **Polypropylene** (40-80 lbs breaking) | NOT jute (breaks at 10-15 lbs) |
| Attachment | U-bolts or heavy wire lashing | Do not rest conduit on posts |

## EMT Properties (ANSI C80.3)

All sizes: Fy = 33,000 psi (ASTM A653 Grade 33 min), E = 29,000,000 psi.
Typical actual yield: 45,000-55,000 psi (exceeds spec by ~35%).

| Property | 1" EMT | 1-1/4" EMT | **1-1/2" EMT (selected)** |
|----------|--------|------------|---------------------------|
| OD | 1.163" | 1.510" | **1.740"** |
| Wall | 0.057" | 0.065" | **0.065"** |
| Weight (lb/ft) | 0.65 | 0.96 | **1.10** |
| I (in^4) | 0.0304 | 0.0771 | **0.1201** |
| S (in^3) | 0.0523 | 0.1021 | **0.1381** |
| Strength vs 1" | 1.0x | 1.95x | **2.64x** |

Trade size != OD. Sources: Engineering Toolbox, Electrolink spec tables.

---

## Part 1: Per-Plant Weight (from biology)

Single-leader indeterminate tomato on 60" (5ft) trellis.

### Stem

- Diameter: 12mm base tapering to 8mm tip (PMC/9095744: single-stem = 11.2mm)
- Mean diameter: 10mm = 1.0cm
- Volume: pi * 0.5^2 * 152.4cm = 119.7 cm^3
- Density: 0.95 g/cm^3 (fresh herbaceous stem, ~87% water)
- **Weight: 113.7g = 0.25 lbs**

### Foliage

- Internode spacing: 8.5cm (mid-range of 7-10cm typical)
- Total nodes on 60" stem: 152.4cm / 8.5cm = 17.9
- Minus 4 vegetative nodes below first truss = **14 compound leaves**
- Per-leaf fresh weight: 35g (derived: 3-5g dry * 8-10x fresh:dry ratio, PMC/4235429)
- **Weight: 14 * 35g = 490g = 1.08 lbs**
- Cross-check: full unpruned plant has 4-5 lbs foliage. Single-leader removes ~60-70%. Expected 1.2-2.0 lbs.

### Trusses

- Pattern: 1 truss every 3 leaves (standard indeterminate)
- 14 productive nodes / 3 = **~5 trusses** (matches 5-7 guidance for 5ft outdoor plant)

### Fruit Load: Amish Paste

3.5 fruit/truss * 10 oz/fruit midpoint (range: 8-12 oz, sources: gardenfocused, Victory Seeds)

**Weekly harvest:** Bottom 1-2 trusses harvested, 3 full green trusses + 2 developing (30% weight)
- 3 * 3.5 * 10oz + 2 * 3.5 * 10oz * 0.3 = 105 + 21 = **126 oz = 7.88 lbs**

**2-week gap:** All 5 trusses carry full-size fruit + 1 developing
- 5 * 3.5 * 10oz + 1 * 3.5 * 10oz * 0.4 = 175 + 14 = **189 oz = 11.81 lbs**

### Fruit Load: Sun Gold

15 fruit/truss * 15g/fruit midpoint (range: 13-18g, sources: tomatodirt, paramountseeds)

Per-truss weight: 15 * 0.529 oz = 7.94 oz

**Weekly harvest:** 3 full + 2 partial (30%) = 23.8 + 4.8 = **28.6 oz = 1.79 lbs**

**2-week gap:** 5 full + 1 partial (40%) = 39.7 + 3.2 = **42.9 oz = 2.68 lbs**

### Rain on Foliage

- Leaf area: 14 leaves * 400 cm^2/leaf = 5,600 cm^2
- Water film: 0.2mm thick on both surfaces
- Volume: 5,600 * 2 * 0.02cm = 224 cm^3 = 224g
- **Rain addition: 0.49 lbs** (dries within 30-60 min in wind)

### Lean-and-Lower Deduction

In lean-and-lower training, the bottom 2-4ft of stem is defoliated bare vine resting on the ground.
This portion is ground-supported and does not load the crossbar.

- Ground-supported stem + removed leaves: ~0.5 lbs per plant
- Applied as a deduction from the trellis-supported weight

### Per-Plant Totals (trellis-supported portion)

| Scenario | Amish Paste | Sun Gold |
|----------|------------|----------|
| Normal (weekly harvest, dry) | **8.7 lbs** | **2.6 lbs** |
| Peak (2-week gap, dry) | **12.6 lbs** | **3.5 lbs** |
| Worst (2-week gap + rain) | **13.1 lbs** | **4.0 lbs** |

Weight is dominated by fruit: 86% for paste, 58% for cherry.
Lean-and-lower deduction: -0.5 lbs from each value above (stem + leaves on ground).

---

## Part 2: Load Per 10ft Span

18" spacing in 120" span = 7 plants per side (at 9", 27", 45", 63", 81", 99", 117").
Both sides load the same crossbar. Conduit self-weight: 1.1 lbs/ft * 10ft = 11.0 lbs.

### Gravity Loads (vertical)

#### Mixed Span (7 paste + 7 cherry, realistic)

| Scenario | Paste (7) | Cherry (7) | Conduit | Total |
|----------|-----------|------------|---------|-------|
| Normal | 60.9 | 18.2 | 11.0 | **90.1 lbs** |
| Peak (2-wk) | 88.2 | 24.5 | 11.0 | **123.7 lbs** |
| Worst static (2-wk + rain) | 91.7 | 28.0 | 11.0 | **130.7 lbs** |

#### All-Paste Span (14 paste, absolute worst case)

| Scenario | Plants (14) | Conduit | Total |
|----------|-------------|---------|-------|
| Normal | 121.8 | 11.0 | **132.8 lbs** |
| Worst static | 183.4 | 11.0 | **194.4 lbs** |

### Combined Loading: Gravity + Wind (vector method)

Wind acts horizontally, gravity acts vertically. The A-frame legs resolve both into
the crossbar as combined bending. The resultant distributed load on the crossbar:

w_combined = sqrt(w_gravity^2 + w_wind^2)

Wind force per inch of span: w_wind = (force_per_plant * plants_per_inch_both_sides)
- plants per inch = 14 plants / 120" = 0.117 plants/in

| Wind speed | Force/plant | w_wind (lb/in) | Combined factor on gravity |
|------------|------------|----------------|---------------------------|
| 0 (calm) | 0 | 0 | 1.00x |
| 20 mph | 1.4 lbs | 0.163 | 1.01x |
| 30 mph | 3.2 lbs | 0.373 | 1.07x |
| 40 mph gust | 5.7 lbs | 0.665 | 1.18x |
| 50 mph gust | 8.9 lbs | 1.038 | 1.38x |

Note: the old analysis used a flat 1.4x dynamic amplification factor. The vector method
shows that at 40 mph gusts the real factor is only 1.18x — less severe than assumed.
At 50 mph (rare in Grand Rapids) it reaches 1.38x.

### Combined Span Totals (mixed, worst static + wind)

| Condition | Gravity | Wind factor | Effective load |
|-----------|---------|-------------|---------------|
| Worst static, calm | 130.7 lbs | 1.00x | **130.7 lbs** |
| Worst static, 30 mph | 130.7 lbs | 1.07x | **139.8 lbs** |
| Worst static, 40 mph | 130.7 lbs | 1.18x | **154.2 lbs** |
| Worst static, 50 mph | 130.7 lbs | 1.38x | **180.4 lbs** |

### Combined Span Totals (all-paste, worst static + wind)

| Condition | Gravity | Wind factor | Effective load |
|-----------|---------|-------------|---------------|
| Worst static, calm | 194.4 lbs | 1.00x | **194.4 lbs** |
| Worst static, 40 mph | 194.4 lbs | 1.18x | **229.4 lbs** |
| Worst static, 50 mph | 194.4 lbs | 1.38x | **268.3 lbs** |

---

## Part 3: Beam Analysis

Simply supported, 120" span. Formulas: M = wL^2/8, sigma = M/S, delta = 5wL^4/(384EI)
S = 0.1381 in^3, I = 0.1201 in^4 for 1.5" EMT.

### Mixed Span (7 paste + 7 cherry)

| Scenario | Load (lbs) | Stress (psi) | SF (33 ksi) | SF (45 ksi) | Deflection |
|----------|-----------|-------------|-------------|-------------|------------|
| Normal (weekly, dry) | 90.1 | 9,792 | **3.37** | 4.60 | 0.58" |
| Peak (2-wk, dry) | 123.7 | 13,446 | **2.45** | 3.35 | 0.80" |
| Worst static (2-wk + rain) | 130.7 | 14,207 | **2.32** | 3.17 | 0.84" |
| + 30 mph wind | 139.8 | 15,197 | **2.17** | 2.96 | 0.90" |
| + 40 mph gust | 154.2 | 16,763 | **1.97** | 2.68 | 1.00" |
| + 50 mph gust | 180.4 | 19,611 | **1.68** | 2.29 | 1.17" |

### All-Paste Span (14 paste, absolute worst case)

| Scenario | Load (lbs) | Stress (psi) | SF (33 ksi) | SF (45 ksi) | Deflection |
|----------|-----------|-------------|-------------|-------------|------------|
| Normal (weekly, dry) | 132.8 | 14,435 | **2.29** | 3.12 | 0.86" |
| Worst static (2-wk + rain) | 194.4 | 21,137 | **1.56** | 2.13 | 1.26" |
| + 40 mph gust | 229.4 | 24,942 | **1.32** | 1.80 | 1.48" |
| + 50 mph gust | 268.3 | 29,170 | **1.13** | 1.54 | 1.73" |

### EMT Size Comparison (mixed span, worst static + 40 mph)

Load: 154.2 lbs. Compares all three standard EMT sizes at 10ft span.

| Conduit | I (in^4) | S (in^3) | Stress (psi) | SF (33 ksi) | Deflection |
|---------|----------|----------|-------------|-------------|------------|
| 1" EMT | 0.0304 | 0.0523 | 44,233 | 0.75 (FAILS) | 3.27" |
| 1-1/4" EMT | 0.0771 | 0.1021 | 22,663 | 1.46 | 1.29" |
| **1-1/2" EMT** | **0.1201** | **0.1381** | **16,763** | **1.97** | **0.83"** |

1" EMT fails at this load. 1-1/4" is marginal. 1-1/2" has adequate margin.

### Span Comparison (1.5" EMT, mixed worst static + 40 mph)

| Span | Load (lbs) | Stress (psi) | SF (33 ksi) | Deflection |
|------|-----------|-------------|-------------|------------|
| **10ft (selected)** | 154.2 | 16,763 | **1.97** | 1.00" |
| 8ft | 123.4 | 10,720 | **3.08** | 0.41" |
| 6ft | 92.5 | 6,033 | **5.47** | 0.14" |

### Max Span at Yield (mixed span loads)

| Condition | w (lb/in) | Max span to Fy=33 ksi | Max span to Fy=45 ksi |
|-----------|-----------|----------------------|----------------------|
| Normal (calm) | 0.751 | 151" (12.6 ft) | 177" (14.7 ft) |
| Worst + 30 mph | 1.165 | 122" (10.1 ft) | 142" (11.9 ft) |
| Worst + 40 mph | 1.285 | 116" (9.7 ft) | 136" (11.3 ft) |

At 10ft span with worst + 40 mph, guaranteed-minimum steel has 3" of margin before yield.
Typical EMT (45 ksi) has 16" of margin.

---

## Part 4: Point Load Warning

180 lb person hanging at midspan:
- M = PL/4 = 180 * 120 / 4 = 5,400 in-lbs
- Stress = 5,400 / 0.138 = **39,130 psi — exceeds yield**
- **Do not hang from the crossbar. Lean near T-posts where span is zero.**

---

## Part 5: Wind and T-Posts

### Wind Forces

Drag coefficient Cd = 0.31 (wind tunnel study, ResearchGate pub. 274344612).
Per-plant effective frontal area: 5ft * 1.5ft * 0.6 porosity = 4.5 ft^2.

| Wind speed | Force per plant | Total (14 plants) |
|------------|----------------|-------------------|
| 20 mph | 1.4 lbs | 20 lbs |
| 30 mph | 3.2 lbs | 45 lbs |
| 40 mph gust | 5.7 lbs | 80 lbs |

The A-frame resolves horizontal wind forces through the legs into the crossbar as combined
bending. Gravity and wind act as perpendicular vectors — the resultant load is
sqrt(gravity^2 + wind^2). See Part 2 for combined loading tables.

### T-Post Stability

At 40 mph: ~40 lbs lateral per post * 5ft height = 200 ft-lbs overturning moment.
T-post lateral capacity at 30-36" embedment in Grand Rapids glacial till: 100-200+ ft-lbs.
**Adequate at 30-36" embedment.**

### Embedment: 30" vs 36" (Broms Method)

Capacity scales as (D - 1.5b)^2 where D = embedment, b = post width (~2"):

| Embedment | Above ground | Capacity vs 30" |
|-----------|-------------|-----------------|
| 30" | 66" | 1.00x |
| 36" | 60" | **1.49x** |

---

## Part 6: Failure Modes

| Mode | Risk | Mitigation |
|------|------|-----------|
| Crossbar yield | Low (SF > 2.2 static, > 1.6 dynamic) | Harvest weekly |
| Excessive deflection | Cosmetic (0.6-1.2") | Accept — not structural |
| T-post lean in gusts | Low at 30-36" embedment | Already mitigated |
| Connection slip | Medium if just resting | **U-bolt or wire lash required** |
| Twine failure | **High with jute** (10-15 lb break vs 13.6 lb paste plant) | **Use polypropylene** |

---

## Sun Gold Placement: West Side

Sun Gold goes on the **west (garden-interior) side** of the A-frame:

- **Heat tolerance:** Sun Gold keeps setting fruit through 90F when paste drops blossoms (species file: SG temp curve 0.9 at 90F vs AP 0.7 at 90F)
- **Afternoon sun:** West side gets hotter afternoon sun — better suited to the heat-tolerant variety
- **Paste protection:** Amish Paste on east side gets cooler morning sun, reducing blossom drop risk
- **Wind load:** Cherry fruit is lighter (3.1 lbs/plant vs 9.2 lbs), so the side with more afternoon wind exposure carries less load

---

## Plant Support: Lean-and-Lower

Standard Dutch commercial method:
1. Tie polypropylene twine to conduit above each plant
2. Spiral-wrap twine around stem (one turn between each leaf/truss)
3. To lower: unhook twine, lower assembly, re-tie
4. Spent stem coils on ground, on its own side of the wire
5. Each side's stems stay independent — no crossing

### Connection to T-Posts

U-bolt method (recommended):
- 3/8" U-bolt wraps around T-post, plates clamp conduit
- ~$2 per connection, holds 200+ lbs
- Alternative: rest on T-post studs + 12ga galvanized wire wrap

### PVC T-Fittings (if used instead of U-bolts)

- **Cold brittleness:** PVC impact strength drops ~80% below 32F. Michigan winters will crack
  unprotected fittings. **Remove before first hard freeze** or they will shatter.
- **UV degradation:** White PVC goes brittle in 5-7 years outdoor. Opaque latex paint extends
  lifespan significantly. Schedule II fittings are thicker and last longer.
- **Creep under sustained load:** PVC slowly deforms under constant stress. At the ~60-90 lb
  reaction per post under normal plant load, creep is minimal for a single season but
  compounding over multi-year use. Inspect annually for oval deformation.
- **Fit:** Electrical tape shim on conduit ends for snug fit in PVC T-fitting bore.
- **Verdict:** Acceptable for seasonal use if removed each winter. U-bolts are more durable
  and don't require seasonal removal.

---

## Sources

- Lowes 1-1/2" EMT: lowes.com/pd/5005565621
- EMT dimensions: Engineering Toolbox, Electrolink spec tables
- ASTM A653 Grade 33: materials.gelsonluz.com
- Tomato stem diameter: PMC/9095744 (single-stem training)
- Tomato leaf dry weight: PMC/4235429
- Tomato canopy drag Cd=0.31: ResearchGate pub. 274344612
- Amish Paste fruit: gardenfocused.co.uk, Victory Seeds, heirloom-organics
- Sun Gold fruit: specialtyproduce.com, paramountseeds
- UF IFAS greenhouse tomato: edis.ifas.ufl.edu/CV266 (10-12 lb/plant baseline)
- Bootstrap Farmer trellis design: bootstrapfarmer.com (10 lb/plant design load)
- Broms method for lateral post capacity: standard geotechnical reference
