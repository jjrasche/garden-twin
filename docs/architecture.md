# Garden Twin -Architecture

Target architecture for the garden digital twin. This document captures
decisions from March 2026 design sessions and supersedes any conflicting
patterns in the current codebase.

---

## Core Principle

**GardenState is physical reality. Conditions are time-varying input.
Calculators consume both.**

```
                     ┌──────────────┐
                     │  Conditions   │  ← unified time-series
                     │  (what,where, │     (sensors, API weather,
                     │   when,value) │      historical, forecast)
                     └──────┬───────┘
                            │
┌────────────┐    ┌─────────▼──────────┐    ┌──────────────────┐
│ GardenState │───▶│   Growth Engine    │───▶│  Outputs          │
│ (physical   │    │ (GDD + modifiers)  │    │  - Production     │
│  reality)   │    │                    │    │  - Labor schedule  │
│             │    │                    │    │  - Growth ledger   │
└────────────┘    └────────────────────┘    │  - Harvest tasks   │
                            ▲               └──────────────────┘
                     ┌──────┴───────┐
                     │ PlantSpecies  │  ← biology catalog
                     │ + Harvest     │
                     │   Strategy    │
                     └──────────────┘
```

No bridge types. No intermediate `CropPlanting`. The growth engine reads
GardenState plants directly and groups only at the output/display layer.

---

## Object Model

### GardenState -Physical Reality Snapshot

What exists in the garden at a point in time. Contains ONLY physical/structural
data. No weather, no derived stats, no conditions.

```
GardenState
├── state_id, schema_version, timestamp, type (actual | projected)
├── garden_id, location
├── grid: {width_ft, length_ft, subcell_size_in}
├── plants: PlantInstance[]
│   ├── plant_id
│   ├── species_id              ← string ref to PlantSpecies catalog
│   ├── harvest_strategy_id     ← string ref to HarvestStrategy
│   ├── root_subcell_id         ← WHERE (position)
│   ├── occupied_subcells: []   ← all cells this plant covers
│   ├── planted_date
│   ├── current_stage           ← growth stage (from GDD tracking)
│   ├── accumulated_gdd         ← thermal time since planting
│   └── measurements: {}        ← species-dependent (height_cm, leaf_count, fruit_count)
├── subcells: SubcellState[]
│   ├── subcell_id, position
│   ├── type: planting | pathway | water | tree
│   └── soil_baseline: {N_ppm, P_ppm, K_ppm, pH, organic_matter_pct}
│       (slow-changing composition -NOT moisture, NOT sun)
└── infrastructure: InfrastructureFeature[]
    (channel path, trellis posts/wire -needed for rendering)
```

**What was removed from GardenState:**
- `environment` -conditions are external, not embedded
- `summary` -derived from data, not stored
- `sun_hours` on subcells -computed from (position, date, shade model, cloud cover)
- `moisture_pct` on subcells -a condition, not a structural property
- `health_score` on plants -replaced by species-dependent `measurements`

### PlantSpecies -Biology Catalog

Describes the genetics/biology of a plant variety. Not tied to any specific
garden or planting. Immutable reference data.

```
PlantSpecies
├── identity: {id, name, icon}
├── biology
│   ├── growth_response: GrowthResponse[]    ← declarative modifier curves
│   ├── survival
│   │   ├── germination_rate                 ← seed → emerged (use real-world rate, not lab)
│   │   ├── kill_temp_f                      ← lethal air temperature
│   │   └── frost_tolerance: very_hardy | semi_hardy | tender
│   └── phenology
│       ├── base_temp_f                      ← GDD base temperature (corn: 50, lettuce: 40)
│       └── gdd_stages: {vegetative: N, flowering: N, fruiting: N, mature: N}
├── physical
│   ├── height_ft, spread_in, root_depth
│   ├── spacing: {in_row_in, between_row_in, equidistant_in?}
│   ├── planting_method: direct_sow | transplant | tuber
│   └── shade_tolerance: full_sun | partial_shade | shade_preferred
├── companions: CompanionEffect[]
├── nutrition_per_lb
├── economics: {seed_cost_per_plant, materials_cost?}
└── sources: Source[]
```

**What was removed from PlantSpecies:**
- `harvest_type` -moved to HarvestStrategy (management decision, not biology)
- `baseline_lbs_per_plant` -moved to HarvestStrategy (yield depends on harvest method)
- `cut_and_come_again` -moved to HarvestStrategy
- `days_to_first_harvest` -replaced by GDD-based phenology
- `min_sun_hours` -redundant with the sun response curve
- `kill_temp_f` in `layout` -moved to `biology.survival`

### GrowthResponse -Declarative Biological Modifiers

Species bring their own set of response curves. The growth engine iterates
whatever curves a species declares. No hardcoded field names for specific
behaviors.

```
GrowthResponse
├── factor: string              ← condition being responded to
│   (sun_hours, temperature_f, soil_moisture_pct_fc,
│    photoperiod_h, soil_temp_f, N_ppm, P_ppm, ...)
├── curve: Record<number, number>   ← lookup table (interpolated)
├── effect: growth_rate | population_survival
│   growth_rate        → multiplied into daily growth modifier
│   population_survival → fraction of plants surviving (bolt, heat kill)
└── name?: string               ← human label ("bolt", "tuberization", "vernalization")
```

**Examples:**

Kale bolt trigger (currently hardcoded as `bolt_trigger`):
```
{ factor: "photoperiod_h",
  curve: { 13: 1.0, 14: 0.6, 15: 0.1, 16: 0.0 },
  effect: "population_survival",
  name: "bolt" }
```

Potato tuberization (currently `soil_temperature_f` modifier):
```
{ factor: "soil_temp_f",
  curve: { 45: 0.2, 60: 1.0, 70: 0.8, 80: 0.3 },
  effect: "growth_rate",
  name: "tuberization" }
```

**Extensibility:** To add a new biological behavior (vernalization, drought
dormancy, heat stress), add a GrowthResponse entry to the species. No schema
changes, no new fields, no engine changes.

### HarvestStrategy -Management Decision

How you choose to harvest a species. Separate from biology because the same
plant can be harvested different ways with different yield outcomes.

```
HarvestStrategy
├── id: string
├── type: cut_and_come_again | bulk | continuous
├── baseline_lbs_per_plant      ← yield depends on harvest method
├── parameters (type-dependent):
│   cut_and_come_again:
│   ├── max_cuts
│   ├── regrowth_days
│   └── cut_yield_curve: Record<number, number>
│   bulk:
│   └── maturity_indicator: string (e.g., "husk_dry", "vine_die_back")
│   continuous:
│   └── pick_frequency_days: number
└── processing?: ProcessingActivity[]
    (canning, drying, cellar storage -tied to harvest method)
```

**Examples:**
- Kale cut-and-come-again: 8 cuts, 14d regrowth, 1.75 lbs total
- Kale single-pull: 1 cut, ~0.8 lbs (different strategy, same species)
- Amish Paste continuous: pick every 3d, 15 lbs/plant, processing = can_marinara
- Corn bulk: harvest at husk_dry, 0.24 lbs/plant, processing = shell_dry

---

## Conditions System

### Core Concept

Everything measured about the environment is a **condition**: temperature,
soil moisture, solar radiation, sunshine hours, photoperiod. Whether it
comes from a sensor, weather API, or 10-year average doesn't matter to
the growth engine.

```
Condition
├── what: string           ← physical quantity
│   (air_temp_f, soil_temp_f, soil_moisture_pct_fc, sun_hours,
│    solar_radiation_mj, photoperiod_h, precipitation_in, wind_mph)
├── where: garden | subcell_id
│   Some conditions are garden-wide (air temp, solar radiation).
│   Some are location-specific (soil moisture at a sensor location).
├── when: ISO timestamp
├── duration: instant | 1h | 1d | 7d | 30d
│   Sensor readings are instant. Hourly forecast is 1h. Historical
│   monthly averages are 30d. The resolver handles aggregation.
├── value: number
└── source: sensor | api | historical | forecast | manual
```

### Conditions Resolver

Unified interface that all calculators use. Transparently resolves from
the best available source.

```typescript
interface ConditionsResolver {
  /** Get all conditions at a location for a date. */
  getConditions(where: string, when: Date): ResolvedConditions;

  /** Priority: sensor > api > forecast > historical */
  /** Aggregation: if engine asks for "today" and source has hourly data, averages. */
  /** Interpolation: if source has monthly data, interpolates to daily. */
}
```

**Source priority:**
1. Sensor data at that subcell (highest trust, instant granularity)
2. API weather observation for that date (garden-wide, daily)
3. Forecast for that date (garden-wide, hourly aggregated)
4. Historical average for that day-of-year (garden-wide, monthly interpolated)

**Spatial resolution:**
- Garden-wide conditions (air temp, solar radiation, photoperiod) → same everywhere
- Position-dependent conditions (sun_hours) → computed from (physY, date, shade_model, cloud_cover)
- Sensor-specific conditions (soil_moisture) → interpolated between sensor locations, or falls back to garden-wide estimate

### Historical Replay and Forecasting

Because conditions are separated from GardenState, the same garden can be
simulated under different condition sources:

```
simulate(gardenState, conditions_2023) → production in a cool year
simulate(gardenState, conditions_2024) → production in a hot year
simulate(gardenState, sensors_to_date + forecast_rest) → current projection
simulate(gardenState, historical_average) → baseline expectation
```

The WeatherBacktest calculator already does this pattern. Unification means
all calculators get it for free.

---

## Growth Engine

### Two-Track Model

The growth engine maintains two parallel tracks for each plant:

**1. Development Track (GDD → stage transitions)**

Tracks phenological progress using Growing Degree Days (thermal time).
Determines WHEN a plant transitions between growth stages.

```
GDD_today = max(0, (high_f + low_f) / 2 - species.base_temp_f)
accumulated_gdd += GDD_today

if accumulated_gdd >= species.gdd_stages.flowering → transition to flowering
if accumulated_gdd >= species.gdd_stages.mature → transition to harvest-ready
```

Replaces `days_to_first_harvest`. A tomato matures after ~1200 GDD base 50°F,
not "82 days." In a hot year that's fewer calendar days. In a cool year, more.

**2. Growth Track (daily modifiers → biomass accumulation)**

Tracks harvestable biomass using the modifier equation.

```
growth_modifier = product of all GrowthResponse curves where effect = 'growth_rate'
daily_growth = daily_potential × vigor × growth_modifier
```

Each GrowthResponse curve maps a condition value to a 0-1 multiplier.
The engine:
1. Collects all `growth_rate` curves for the species
2. Gets the current condition value for each curve's `factor`
3. Multiplies all modifiers together (current approach -may revisit if
   reality shows multiplicative over-penalizes)
4. Separately: collects `population_survival` curves, multiplies for
   effective surviving plant fraction

**Stage gating:** Corn doesn't produce harvestable biomass until GDD says
it's in grain fill. Before that, daily_growth accumulates vegetative mass
that isn't harvestable. The current growth stage determines whether biomass
accumulation counts toward harvestable yield.

### Growth Equation Summary

```
Per plant, per day:

  gdd_today = max(0, (high + low) / 2 - base_temp)
  accumulated_gdd += gdd_today
  current_stage = stage where accumulated_gdd >= gdd_threshold

  growth_mod = ∏ (interpolate(curve, condition_value))
               for all growth_response where effect = 'growth_rate'

  survival = ∏ (interpolate(curve, condition_value))
             for all growth_response where effect = 'population_survival'

  if current_stage is harvestable:
    daily_harvestable_growth = daily_potential × vigor × growth_mod

  effective_yield = accumulated_harvest × survival × germination_rate
```

---

## Lifecycle & Labor

### LifecycleSpec (unchanged conceptually)

Per-species activity templates with triggers, durations, equipment, and
instructions. These are correct as-is. Activities include:

- Preparation: seed starting, hardening off, bed prep
- Planting: transplant, direct sow, tuber planting
- Maintenance: hilling, pruning suckers, thinning
- Harvest: cut, pick, dig
- Cleanup: pull dead plants, compost
- Processing: canning, shelling, drying (linked to HarvestStrategy)

### Labor Schedule

Consumes GardenState.plants[] + LifecycleSpec + Conditions directly.
No CropPlanting intermediate. Groups by (species, planted_date) internally
when computing batch durations.

### Missing Activities (not yet in lifecycle specs)

- Bed preparation (tilling, amending, composting) -garden-level, not plant-level
- Trellis setup (posts, wire)
- Soil block making sessions
- Season-end cleanup (bed covering, tool storage)
- Compost management

These are garden-level lifecycle activities, not per-species. Need a
`GardenLifecycleSpec` or similar concept.

---

## Coordinate System

Unchanged from current implementation. Documented in CLAUDE.md.

```
Physical: physX 0(west)→360(east), physY 0(south)→1200(north)
Screen:   x_in = 1200 - physY,     y_in = 360 - physX
```

To get physY from a subcell_id: parse x_in from "sub_{x}_{y}", then
`physY = 1200 - x_in`. No lookup table needed.

---

## Current Codebase vs Target

### What exists and is correct (keep)
- GardenState schema (strip environment, summary, sun_hours, health_score)
- Subcell grid and coordinate system
- Infrastructure rendering (channel, trellis)
- Species data files (restructure to new schema)
- LifecycleSpec type and 7 lifecycle data files
- Growth math (accumulateGrowth, computeModifierProduct -refactor to use GrowthResponse[])
- EnvironmentSource implementations (refactor to ConditionsResolver interface)
- Interpolation engine
- WeatherBacktest (refactor to consume GardenState instead of CropPlanting)
- Canvas renderer

### What needs to change
- PlantSpecies: restructure fields per this doc, make modifiers declarative GrowthResponse[]
- Add phenology (GDD stages + base_temp) to species data
- Extract HarvestStrategy from PlantSpecies
- Strip GardenState of environment, summary, health_score, subcell sun_hours/moisture
- Add accumulated_gdd and measurements to PlantInstance
- Refactor ProductionTimeline to consume GardenState directly (no CropPlanting bridge)
- Refactor LaborSchedule to consume GardenState directly
- Rename/refactor EnvironmentSource → ConditionsResolver with spatial awareness
- Add GDD tracking to growth engine

### What should be deleted
- `gardenStateBridge.ts` -no more CropPlanting intermediate
- `CropPlanting` type and `extractZoneAllocation()`
- `health_score` on PlantInstance
- `min_sun_hours` on species (redundant with sun curve)
- TOMATO_SWEETIE from lifecycle index, zone optimizer, species files
- Blanch/freeze processing from potato lifecycle file (cellar only)
- `PRODUCTION_PLAN` as a direct input to calculators (only used by sampleGarden for initial creation)

### Migration Order

Changes have dependencies. This is the sequence:

**Phase 0: Cleanup (no dependencies, mechanical)**
- Delete TOMATO_SWEETIE from lifecycle index, zone optimizer, species files
- Delete blanch/freeze processing from potato-kennebec.lifecycle.ts
- Delete `health_score` from PlantInstance schema
- Delete `min_sun_hours` from LayoutProfile schema

**Phase 1: Species Restructure**
- Research GDD base temps and stage thresholds for all 11 species (university extension data)
- Restructure PlantSpecies: replace flat modifiers with `GrowthResponse[]` array
- Add `phenology: { base_temp_f, gdd_stages }` to species
- Move `kill_temp_f` from layout to biology.survival
- Remove `days_to_first_harvest`, `harvest_type`, `baseline_lbs_per_plant`, `cut_and_come_again`
- Update all 11 species data files to new schema

**Phase 2: HarvestStrategy + GardenState**
- Define HarvestStrategy type with processing activities attached
- Create harvest strategy data files (one per species+method combo)
- Strip GardenState: remove environment, summary, subcell sun_hours/moisture_pct
- Add `accumulated_gdd`, `measurements`, `harvest_strategy_id` to PlantInstance
- Update sampleGarden.ts to produce new GardenState shape

**Phase 3: Growth Engine**
- Add GDD accumulation to growth engine (development track)
- Refactor computeModifierProduct to iterate GrowthResponse[] instead of named fields
- Stage-gate harvestable biomass (no corn yield before grain fill)
- Threshold-based maturity for all harvest types (not just cut_and_come_again)

**Phase 4: Calculator Unification**
- Refactor ProductionTimeline to consume GardenState + speciesMap directly
- Refactor LaborSchedule to consume GardenState directly
- Delete gardenStateBridge.ts, CropPlanting type, extractZoneAllocation
- PRODUCTION_PLAN remains only as input to sampleGarden for initial creation

**Phase 5: Conditions Resolver**
- Rename EnvironmentSource to ConditionsResolver
- Add spatial awareness (subcell-level vs garden-wide)
- Add duration/granularity to condition entries
- Add source priority (sensor > api > forecast > historical)
- Strip sun_hours computation out of subcells, into resolver via ShadeModel

---

## Open Questions

1. **Multiplicative vs minimum for modifier composition.** Current approach
   multiplies all growth_rate modifiers. If temp=0.5 AND moisture=0.5, growth
   is 0.25. Reality may be closer to Liebig's Law (min of limiting factors =
   0.5). Needs validation against real harvest data.

2. **GDD base temperatures per species.** Need research-backed values for all
   11 species. Common values: corn 50°F, tomato 50°F, lettuce 40°F, kale 40°F,
   potato 40°F, spinach 35°F.

3. **GDD stage thresholds.** Need per-species GDD accumulation targets for each
   growth stage transition. Available from university extension publications.

4. **Soil nutrient modifier composition.** Currently uses Liebig's Law (minimum
   of N, P, K, pH, compaction). This is the accepted agronomic approach and
   should stay even if environmental modifiers change.

5. **Germination rate accuracy.** Kale species file says 0.95; blocking math
   uses 0.85. Need to decide: lab rate or real-world soil block rate? If using
   2-seeds-per-block strategy, the per-block success rate (97.75%) may matter
   more than per-seed rate.

6. **Garden-level lifecycle activities.** Bed prep, trellis setup, compost:
   not per-species. Need a concept for garden-level recurring tasks.
