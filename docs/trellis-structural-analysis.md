# Trellis Structural Analysis

## Design Configuration
- 1-1/2" EMT conduit, single horizontal bar, plants on both sides
- 8ft T-posts, 36" embedment, 5ft above ground
- Tomato plants at 18" spacing on both sides (lean-and-lower, twine-wrapped)
- 30ft total trellis length, 4 posts at 10ft spacing
- Design wind: 30 mph (valley site surrounded by trees)
- PVC T-fittings at post connections (seasonal — removed before Michigan winter)

## Selected Design: 1-1/2" EMT at 10ft Spans
- Stress at 30 mph with peak fruit: 20,500 psi (68% of yield)
- Deflection at midspan: ~1.5" (L/80)
- 4 posts at 0, 10, 20, 30ft
- No earth anchors needed (valley site, 30 mph max design wind, 36" embedment)

## EMT Properties (All Sizes Evaluated)

Material (all sizes): Fy=30,000 psi, Fu=~50,000 psi, E=29,000,000 psi (ASTM A653 CS Type B, UL 797).

| Property | 1" EMT | 1-1/4" EMT | 1-1/2" EMT |
|----------|--------|------------|------------|
| OD | 1.163" | 1.510" | 1.740" |
| Wall | 0.057" | 0.065" | 0.065" |
| Weight (lb/ft) | 0.65 | 0.96 | 1.09 |
| I (in^4) | 0.0304 | 0.0771 | 0.1201 |
| c (in) | 0.582 | 0.755 | 0.870 |
| M_yield (in-lb) | 1,567 | 3,062 | 4,143 |
| Strength vs 1" | 1.0x | 1.95x | 2.64x |

### Max Span at 30 mph Design Wind

| Conduit | Max span | Posts for 30ft | Stress at 10ft span |
|---------|----------|----------------|---------------------|
| 1" | 7.5 ft | 5 posts | 133% yield (fails) |
| 1-1/4" | 10.4 ft | 4 posts | 92% yield (tight) |
| 1-1/2" | 12.1 ft | 4 posts | 68% yield (selected) |

## Per-Variety Plant Weights (Lean-and-Lower)

### Weight Research Sources
- Vegetative biomass: PMC12388973 (NPK fertilization study, destructive harvest)
- Leaf biomass: PMC6868607 (Tomato's Green Gold, 0.75 kg leaf FW per plant)
- Dry matter partitioning: Heuvelink 1996, Annals of Botany 77:71-80 (TOMSIM model)
- Fruit weights: Victory Seed Co (Amish Paste 6-12oz), Paramount Seeds (Sun Gold 13-15g)
- Trellis design loads: Bootstrap Farmer (10 lb baseline), Johnny's Seeds (10-12 lb)
- Dynamic factor: PMC8956605 (greenhouse wind vibration coefficient 2.0-2.05)
- Rain interception: ~0.15-0.20 mm/LAI (ScienceDirect canopy interception)

### Component Breakdown

**Stem:** 35-50g fresh weight per foot. ~89-91% water. Diameter 10-17mm.
**Compound leaf:** 30-43g fresh weight each. ~90% water.
**Rain water on foliage:** 120-160g per plant (0.3 lb). Based on LAI ~3.7, leaf area ~7700 cm^2.

In lean-and-lower, bottom 2-4ft is defoliated bare stem on the ground.
Defoliation removes ~40-65g per foot (~3 leaves per foot removed).
The trellis supports only the upper active portion.

### Amish Paste (worst case design load = 12 lb)

| Component | Weight | Notes |
|-----------|--------|-------|
| Active stem (upper 4ft) | 0.4 lb | 4ft * 45g/ft |
| Active leaves (~18) | 1.4 lb | 18 * 35g avg |
| Fruit on vine at peak | 8-10 lb | 4-5 trusses, 2-4 fruits each at 170-340g |
| Rain water | 0.3 lb | 160g retained on foliage |
| Ground-supported portion | -0.5 lb | Bare stem + string tension reduction |
| **Peak static total** | **~12 lb** | With full fruit load before harvest |

Fruit dominates: 8-10 lb of the 12 lb total.
With regular harvest (picking 2x/week): fruit drops to 4-6 lb, total ~7-8 lb.

### Sun Gold F1 (worst case design load = 7 lb)

| Component | Weight | Notes |
|-----------|--------|-------|
| Active stem (upper 5ft) | 0.4 lb | Thinner stems than paste |
| Active leaves (~22) | 1.0 lb | Smaller leaves |
| Fruit on vine at peak | 3-4.5 lb | 5-7 trusses, 10-20 fruits at 13-15g each |
| Rain water | 0.25 lb | |
| Ground-supported portion | -0.5 lb | |
| **Peak static total** | **~7 lb** | |

### Sweetie OP (worst case design load = 8 lb)

| Component | Weight | Notes |
|-----------|--------|-------|
| Active stem (upper 4.5ft) | 0.4 lb | |
| Active leaves (~20) | 1.1 lb | |
| Fruit on vine at peak | 4-6 lb | 5-7 trusses, slightly larger than Sun Gold |
| Rain water | 0.25 lb | |
| Ground-supported portion | -0.5 lb | |
| **Peak static total** | **~8 lb** | |

### Fruit Details

| Variety | Fruit weight | Fruits/truss | Truss weight | Active trusses |
|---------|-------------|-------------|-------------|----------------|
| Amish Paste | 170-340g (6-12 oz) | 2-4 | 1.0-2.0 lb | 4-5 |
| Sun Gold | 13-15g (0.5 oz) | 10-20 | 0.3-0.7 lb | 5-7 |
| Sweetie | 14-20g (0.5-0.75 oz) | 10-20 | 0.3-0.9 lb | 5-7 |

Source: MyVegPatch (active truss count), variety-specific seed catalog data.

## Loading Model

### Distributed load formula

At 18" spacing on both sides:
- Plants per inch of span: 2 sides / 18" = 1/9 plants per inch
- w_plant = avg_weight / 9 (lb/in)
- w_conduit = 0.054 lb/in (1" EMT self-weight)
- w_total = w_plant + w_conduit

### Design loads (accepted values)
- Amish Paste peak: 12 lb static
- Cherry (Sun Gold / Sweetie) peak: 8 lb static
- Plant mix: 71% paste (12 lb) + 29% cherry (8 lb) = 10.84 lb avg
- w_static = 10.84/9 + 0.054 = 1.258 lb/in

### Wind lateral forces (per plant)

| Wind speed | Pressure (psf) | Force/plant | Source |
|-----------|----------------|-------------|--------|
| 20 mph | 1.0 | 3 lb | q=0.00256*V^2, Cd=0.31, A=10sqft |
| 30 mph | 2.3 | 8 lb | Calculated |
| 40 mph | 4.1 | 13 lb | Calculated |
| 50 mph | 6.4 | 20 lb | Calculated |

Drag coefficient Cd=0.31 from ASABE 2012 wind tunnel study on tomato canopy.
Projected area per plant: ~10 sqft (2ft wide * 5ft tall), porosity accounted for by Cd.

### Combined loading (gravity + wind as perpendicular vectors)

w_combined = sqrt(w_gravity^2 + w_wind^2)

| Wind speed | w_gravity | w_wind | w_combined | Effective factor |
|-----------|-----------|--------|------------|-----------------|
| 0 (calm) | 1.258 | 0 | 1.258 | 1.00x |
| 20 mph | 1.258 | 0.333 | 1.301 | 1.03x |
| 30 mph | 1.258 | 0.889 | 1.540 | 1.22x |
| 40 mph | 1.258 | 1.444 | 1.915 | 1.52x |
| 50 mph | 1.258 | 2.222 | 2.554 | 2.03x |

The "2x dynamic factor" from greenhouse research corresponds to ~50 mph gust conditions.
At 30 mph (normal windy day), the factor is only 1.22x.

## Maximum Span Calculation

### Governing equation (bending stress at midspan)

sigma = (w * L^2 / 8) * c / I <= Fy

Solving for L:
L = sqrt(8 * Fy * I / (c * w))
L = sqrt(8 * 1567 / w)
L = sqrt(12,536 / w)

### Max span results

| Design condition | w (lb/in) | Max span (in) | Max span (ft) | Posts for 30ft |
|-----------------|-----------|---------------|---------------|----------------|
| Static only (calm) | 1.258 | 99.8 | 8.3 | 5 (4 spans) |
| 30 mph wind | 1.540 | 90.2 | 7.5 | 5 (4 spans) |
| 40 mph wind | 1.915 | 80.9 | 6.7 | 6 (5 spans) |
| 50 mph gust | 2.554 | 70.1 | 5.8 | 7 (6 spans) |

### Deflection check (secondary, stress governs)

delta = 5 * w * L^4 / (384 * E * I)

At 7.5ft span, static load:
delta = 5 * 1.258 * 90^4 / (384 * 29e6 * 0.0304) = 1.17" (L/77) -- acceptable

## Post Loading

### Gravity (downward) per post

Simply-supported spans: each support carries wL/2.
Interior post supports two spans: wL/2 + wL/2 = wL.

Per span static: 10.84 lb/plant * (90/18) plants/side * 2 sides = 108 lb
Conduit: 0.054 * 90 = 5 lb
Total per span: 113 lb

Interior post: 113 lb (one full span)
End post: 57 lb (half span)

### Wind (lateral) per post

Continuous conduit distributes lateral load to all posts.
Interior post: receives lateral reaction from two half-spans = one full span.

| Wind speed | Lateral/span | Interior post | End post |
|-----------|-------------|---------------|----------|
| 20 mph | 30 lb | 30 lb | 15 lb |
| 30 mph | 80 lb | 80 lb | 40 lb |
| 50 mph | 200 lb | 200 lb | 100 lb |

T-post lateral capacity at 36" embedment (firm clay): ~45-90 lb.
At 30 mph: interior posts within capacity (80 lb load vs 45-90 lb capacity).
At 50 mph: all posts exceed capacity -- trellis leans.

## Connection: EMT to T-Post

### Recommended: U-bolt method
- 1" conduit sits against T-post flange
- 3/8" U-bolt wraps around T-post, plates clamp conduit
- ~$2 per connection, no drilling, holds 200+ lb
- Alternative: rest on T-post studs + 12ga galvanized wire wrap

### PVC T-bracket (user's current plan)
- UV degradation: white PVC goes brittle in 5-7 years
- Cold brittleness: may crack in Michigan winter if left up
- Creep: slowly deforms under sustained 100+ lb load
- Acceptable if replaced every 5-6 years or painted with opaque latex

## T-Post Specifications
- 8ft post (96"), 36" embedment, 60" (5ft) above ground
- Weight: 1.25 lb/ft = 10 lb per post
- Material: rail steel, Fy >= 50,000 psi
- Lateral capacity at 30" embedment: ~30-60 lb at top (firm clay)
- Lateral capacity at 36" embedment: ~45-90 lb at top (firm clay)

### Embedment Depth: 30" vs 36" (Broms Method, Cohesive Soil)

For a fixed-length 8ft post, deeper embedment improves capacity two ways:
more soil resistance AND shorter above-ground lever arm.

Capacity scales as (D - 1.5b)² where D = embedment, b = post width (~2"):

| Embedment | D-3" | (D-3")² | Above ground | Capacity vs 30" |
|-----------|------|---------|-------------|-----------------|
| 30" | 27" | 729 | 66" | 1.00x |
| 36" | 33" | 1089 | 60" | **1.49x** |

In granular soil (glacial till), capacity scales as D³ → 73% increase.
Grand Rapids glacial till (mixed clay/sand/gravel): expect 49-73% increase.

At 36" embedment, interior post capacity (45-90 lb) covers the 80 lb
lateral load at 30 mph design wind. No earth anchors needed.

## Plant Support Method

Lean-and-lower with twine wrapping (standard Dutch commercial method):
1. Tie twine to conduit above each plant
2. Spiral-wrap twine around stem (one turn between each leaf/truss)
3. To lower: unhook twine from conduit, lower assembly, re-tie
4. Spent stem coils on ground, on its own side of the wire
5. Each side's stems stay independent — no crossing to opposite side

No tomato clips needed. Twine wrapping is simpler for <20 plants.

## PVC Fitting Seasonal Notes

PVC T-fittings connect conduit to T-post tops. Seasonal use only:
- **Remove before winter** — PVC goes brittle below freezing in MI
- UV degradation: 5-7 years outdoor lifespan (extend with opaque latex paint)
- Creep under sustained load is acceptable for single-season use
- Electrical tape shim on conduit ends for snug fit in PVC
