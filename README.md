# Garden Twin

Digital twin of a 30x100ft garden in Grand Rapids, MI (Zone 6a). Simulates growth, harvest, and labor from planting through season end using GDD-based phenology and real weather data.

## What It Does

- **Timeline simulation**: Scrub day-by-day through the growing season. Each plant tracks accumulated GDD, growth stage, and harvestable biomass.
- **Canvas renderer**: 3-inch subcell resolution (48,000 subcells), zoom from full-garden overview to individual plant detail.
- **Weather integration**: NSRDB satellite sunshine hours, CRN soil temperature, precipitation-driven soil moisture model.
- **Production planning**: Consumption-backward plant counts for a family of 4, with species-specific yield models and survival rates.
- **Labor scheduling**: Per-species lifecycle specs generate weekly labor breakdowns including processing (canning, drying).

## Species (11)

Corn (Nothstine Dent), Potato (Kennebec), Tomato (Amish Paste, Sun Gold), Kale (Red Russian), Lettuce (Black Seeded Simpson), Spinach (Bloomsdale), Marigold (French), Nasturtium (Trailing), Calendula, Sweet Alyssum.

## Quick Start

```bash
npm install
npm run dev        # Vite dev server at localhost:5173
npm test           # Vitest
```

## Stack

TypeScript, React 18, Zustand, Vite, Vitest, Zod, Canvas 2D rendering.

## Docs

- `docs/architecture.md` -- Target architecture (GDD growth engine, conditions system, migration plan)
- `docs/production-plan.md` -- Consumption basis, per-plant yields, derived plant counts
- `docs/seeds-and-supplies.md` -- Seed orders, soil block capacity, schedule
- `docs/seed-starting-lights.md` -- Barrina TX36 PPFD model, crop placement under lights
- `docs/deterrence-plan.md` -- Electric fence, detection system, companion planting
- `docs/trellis-structural-analysis.md` -- EMT conduit structural engineering

## License

Private project.
