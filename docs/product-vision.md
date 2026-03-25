# Product Vision: Garden-to-Customer Direct Fulfillment

Captured 2026-03-25. This is the target product direction for the garden twin.

---

## Core Idea

The digital twin already knows what's harvestable and when. The inventory is computed, not tracked. A customer orders specific produce, the system generates a harvest task, someone (kids, you) executes it, packages it, customer picks it up. **Ground to customer in under an hour.**

This is the same fulfillment model as grocery store pickup (Meijer, etc.) except we remove the middle step — no store, no warehouse, no transport chain. Farm → customer, same hour.

## Marketing Position

- "Everything was in the garden an hour ago"
- Research-backed nutrition loss data per hour off the plant (real numbers, species-specific)
- Kid/family-run, local, zero transport miles
- Customer chooses exactly what they want (not a mystery CSA box)
- Premium pricing justified by freshness + story + zero waste

## How It Works

### Projected Availability (computed from simulation)

On any given day, the growth model knows:
- Which plants are harvestable (biomass threshold crossed)
- Estimated available lbs per species
- Days until next harvest per crop (forward projection)
- What's coming next week

Customer sees a real-time inventory view derived from `DaySnapshot`. Not a promise — a projection that gets more accurate as observations calibrate the model through the season.

### Order → Task Pipeline

1. Customer places order (specific species + quantities) via simple interface
2. System validates against projected availability
3. Order generates harvest tasks with exact lb targets per species
4. Task system already supports this — orders are a new task source alongside lifecycle/season/rules
5. Harvester executes tasks, weighs output, packages
6. Customer picks up at scheduled window

### Observation Loop (harvest fulfillment = data collection)

Every order fulfillment IS an observation event:
- **Pre-harvest photo**: row/section before cutting (visual baseline)
- **Post-harvest photo**: same view after cutting (visual diff)
- **Weight measurement**: actual lbs harvested per species per cut
- **Granularity**: "I cut from these 3 plants to reach 2 lbs" — reasonable level. Per-plant precision needs sensors.

This data calibrates the growth model: projected harvest vs actual → adjustment factor for future projections.

### Weight Capture (hands-free)

Harvester carries a standardized scale. The system detects:
- Weight stable for 3+ seconds = one addition recorded
- Camera (phone or mounted) identifies which crop was placed
- Or simpler: harvester works one species at a time, system knows which task is active

No manual data entry. The act of fulfilling the order produces the observation data.

## Distribution Model (Year 1)

- **One channel**: pickup orders from property
- **Packaging**: cardboard box, ~10 lb mixed or custom per order
- **Pricing**: premium (~20-30% above farmers market baseline) justified by freshness + story
- **Pickup window**: 30 min/week, scheduled
- **Year 1 interface**: could be as simple as a shared form or text orders. Proper app later.

### Why Not Farmers Market

The economics analysis (2026-03-25) showed:
- Booth fee: $30/event × 16 events = $480/season
- Staffing: 4 hrs/event × 16 = 64 hrs of standing at market
- At our volume, booth fee eats all margin on low-value crops
- Farm stand / pickup: zero booth fee, 30 min/week staffing
- Every crop is profitable through pickup; several go negative through market

### Why Not U-Pick

- Precision garden layout (subcell-level plant placement) doesn't mix with foot traffic
- Liability and kid safety concerns
- Loss of observation data (customer harvests = untracked)
- Could revisit for specific crops (cherry tomatoes) in later years

## Technical Dependencies

All of these exist or are in progress:

| Component | Status | What it provides |
|-----------|--------|-----------------|
| Growth model + DaySnapshot | Built | Projected availability per species per day |
| Task generator | Built | Harvest task creation from triggers |
| Task resolver | Built | State mutation from completed tasks |
| Observation schema | Defined (types exist) | Actual vs predicted feedback loop |
| Expenditure + Profitability | Built | Per-species economics with distribution |
| Distribution channels | Built | Channel-specific cost/pricing model |

### What to build (in order)

1. **Projected availability API** — `getAvailableHarvest(date): { species, lbs, confidence }[]` from existing simulation output
2. **Order type + order → task pipeline** — Order schema, validation against availability, task generation
3. **Observation capture** — weight + photo at harvest, feeds back into growth model calibration
4. **Customer interface** — inventory view, order form, pickup scheduling (simple first, app later)
5. **Hands-free measurement** — stable-weight detection on scale, optional camera crop ID

## Economics Target

- $50/hr delivered profit (requires automation of repetitive tasks)
- $15/hr minimum threshold for any crop sold
- Family consumption first, sell surplus through pickup
- Kids run the farm stand as a real business with real revenue
