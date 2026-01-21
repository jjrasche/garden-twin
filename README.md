# Garden Twin

A hierarchical garden planning application with subcell-first data architecture designed for future robotic automation.

## Overview

Garden Twin stores all garden data at 3×3 inch resolution (subcells) and aggregates upward for human visualization:

- **64,000 subcells** (for a 40×100 ft garden) as atomic data units
- **4 zoom levels**: Zone (10×10 ft) → Cell (1×1 ft) → Subcell (3×3 in)
- **AI-driven config builder** using GROQ
- **Autonomous VLM testing** for UI quality
- **localStorage persistence** for garden plans

## Architecture

### Subcell-First Data Model

All spatial data is stored at subcell resolution. Cells and zones are computed views, not stored separately. This:

- Enables machine-level precision (3-inch granularity)
- Eliminates sync issues (single source of truth)
- Supports future robot tracking

### Calculation Engine

- **YieldCalculator**: Applies modifiers (sun, soil, spacing) to project yields
- **LaborCalculator**: Generates weekly labor schedules
- **Aggregators**: Roll up subcells → cells → zones for visualization

## Project Structure

```
garden-twin/
├── src/
│   ├── core/                  # Phase 1: Calculation engine
│   │   ├── types/             # Zod schemas + TypeScript types
│   │   ├── calculators/       # YieldCalculator, LaborCalculator
│   │   ├── aggregators/       # Cell/Zone aggregation
│   │   └── data/              # Sample plant species
│   ├── ui/                    # Phase 2: React components (TBD)
│   ├── testing/               # Phase 3: VLM testing (TBD)
│   └── cli/                   # CLI validation tool
├── tests/                     # Vitest unit tests
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### CLI Validation

Validate the core calculation engine:

```bash
npm run cli:validate
```

This creates a sample 40×100 ft garden with 64,000 subcells, plants corn/tomato/potato, and validates:

- Yield calculations
- Labor scheduling
- Cell/zone aggregation

## Phase 1: Core Engine ✓

**Status**: Complete

- ✅ Type definitions (Subcell, PlantSpecies, Garden, Projection)
- ✅ Sample plant species data (corn, tomato, potato)
- ✅ Interpolation function with linear interpolation
- ✅ YieldCalculator with modifiers
- ✅ LaborCalculator with weekly scheduling
- ✅ Aggregators (cell/zone summaries)
- ✅ CLI validation tool
- ✅ 95%+ test coverage (core code)
- ✅ 92 unit and integration tests passing

## Phase 2: Web UI ✓

**Status**: Complete

**State Management & Services:**
- ✅ Zustand store with localStorage persistence
- ✅ AI config service (GROQ API integration with double validation)
- ✅ localStorage service with quota handling

**UI Components:**
- ✅ ConfigBar - AI-powered chat interface for garden plan generation
- ✅ LaborTimeline - Stacked bar chart showing weekly labor hours
- ✅ HarvestTimeline - Area chart showing harvest yields
- ✅ GridLayout - Container orchestrating 4 zoom levels
- ✅ ZoneView - 10×10 ft zone grid
- ✅ ZoneCountView - Zone view with plant counts and icons
- ✅ CellView - 1×1 ft cell grid with species coloring
- ✅ SubcellView - 3×3 inch subcell resolution with viewport culling
- ✅ ZoomControls - Button group for zoom level switching
- ✅ StatsPanel - Summary stats (yield, calories, labor, cost)

**Performance:**
- ✅ Viewport culling - renders only ~500 visible subcells instead of all 64,000
- ✅ React.memo optimization on components
- ✅ Touch controls for mobile (pan & pinch-to-zoom)

**Build Status:**
- ✅ TypeScript compilation: 0 errors
- ✅ Vite production build: Success
- ✅ All tests passing: 92/92

## Phase 3: VLM Testing (Planned)

- Puppeteer screenshot capture
- GROQ Llama 4 Scout 17B evaluation
- Retry with exponential backoff
- Target: 85+ UI quality score

## Running the Application

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```
VITE_GROQ_API_KEY=your_groq_api_key_here
```
Get your API key from https://console.groq.com/

3. Start development server:
```bash
npm run dev
```

4. Open browser to the URL shown (typically http://localhost:5173)

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run CLI validation
npm run cli:validate
```

### Production Build

```bash
npm run build
```

## Tech Stack

- **Language**: TypeScript 5.0+ (strict mode)
- **Runtime**: Node.js 18+
- **Testing**: Vitest with happy-dom
- **Validation**: Zod runtime schemas
- **Build**: Vite
- **UI** (Phase 2): React 18, Tailwind CSS, Zustand, Recharts
- **AI** (Phase 2+): GROQ SDK

## Data Sources

- **Spacing**: Square Foot Gardening (Mel Bartholomew)
- **Nutrition**: USDA FoodData Central
- **Yields**: University extension publications, MSU crop trials

## License

Private project

## Notes

### Double Validation (GROQ + Zod)

Per requirements, all AI-generated JSON uses:

1. `response_format: { type: "json_object" }` in GROQ API calls (enforces structure)
2. Zod schema validation post-response (validates correctness)

This ensures both structural validity and data correctness.

### Test Coverage Target

Phase 1 target: **95%+ coverage** for core calculation engine.

Run `npm run test:coverage` to verify.
