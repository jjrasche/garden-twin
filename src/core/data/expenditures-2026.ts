/**
 * 2026 Season Expenditures
 *
 * All costs for the 2026 garden season. Amounts are best estimates —
 * update with actual receipts as purchased.
 *
 * Allocation rules:
 *   - species_id set → 100% to that species
 *   - species_id null → split by subcell area fraction at calculation time
 *   - Multiple allocations → explicit percentage split
 */

import type { Expenditure, MarketPrice } from '../types/Expenditure';

// =============================================================================
// Seeds
// =============================================================================

const SEEDS: Expenditure[] = [
  {
    id: 'seed_kale',
    name: 'Red Russian Kale seeds (Johnny\'s)',
    amount_dollars: 3.75,
    date: '2026-02-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'kale_red_russian', allocation_pct: 1.0 }],
  },
  {
    id: 'seed_lettuce',
    name: 'Buttercrunch/BSS lettuce seeds',
    amount_dollars: 3.50,
    date: '2026-02-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'lettuce_bss', allocation_pct: 1.0 }],
  },
  {
    id: 'seed_spinach',
    name: 'Bloomsdale Long Standing spinach seeds',
    amount_dollars: 3.50,
    date: '2026-02-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'spinach_bloomsdale', allocation_pct: 1.0 }],
  },
  {
    id: 'seed_tomato_paste',
    name: 'Amish Paste tomato seeds (Johnny\'s)',
    amount_dollars: 4.25,
    date: '2026-02-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'tomato_amish_paste', allocation_pct: 1.0 }],
  },
  {
    id: 'seed_tomato_cherry',
    name: 'Sun Gold cherry tomato seeds',
    amount_dollars: 4.50,
    date: '2026-02-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'tomato_sun_gold', allocation_pct: 1.0 }],
  },
  {
    id: 'seed_potato',
    name: 'Kennebec seed potatoes (5 lbs)',
    amount_dollars: 14.00,
    date: '2026-03-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'potato_kennebec', allocation_pct: 1.0 }],
  },
  {
    id: 'seed_corn',
    name: 'Nothstine Dent corn seeds',
    amount_dollars: 5.00,
    date: '2026-03-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'corn_nothstine_dent', allocation_pct: 1.0 }],
  },
  {
    id: 'seed_marigold',
    name: 'French marigold seeds (Tagetes patula)',
    amount_dollars: 3.00,
    date: '2026-03-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'marigold_french', allocation_pct: 1.0 }],
  },
  {
    id: 'seed_nasturtium',
    name: 'Trailing nasturtium seeds',
    amount_dollars: 3.00,
    date: '2026-03-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'nasturtium_trailing', allocation_pct: 1.0 }],
  },
  {
    id: 'seed_calendula',
    name: 'Calendula Alpha seeds',
    amount_dollars: 3.50,
    date: '2026-03-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'calendula_alpha', allocation_pct: 1.0 }],
  },
];

// =============================================================================
// Soil blocks & media
// =============================================================================

const MEDIA: Expenditure[] = [
  {
    id: 'media_block_mix',
    name: 'Soil block mix (peat + perlite + compost) — 2 bags',
    amount_dollars: 28.00,
    date: '2026-03-25',
    category: 'media',
    useful_life_years: 1,
    recurring: true,
    // Shared across all block-started species by block count
    // Kale: 38, Amish Paste: 50, Sun Gold: 25 = 113 blocks total
    allocations: [
      { species_id: 'kale_red_russian', allocation_pct: 0.34 },    // 38/113
      { species_id: 'tomato_amish_paste', allocation_pct: 0.44 },  // 50/113
      { species_id: 'tomato_sun_gold', allocation_pct: 0.22 },     // 25/113
    ],
  },
  {
    id: 'media_block_maker',
    name: '2" soil block maker (Ladbrooke)',
    amount_dollars: 35.00,
    date: '2026-03-20',
    category: 'media',
    useful_life_years: 10,
    recurring: false,
    allocations: [
      { species_id: 'kale_red_russian', allocation_pct: 0.34 },
      { species_id: 'tomato_amish_paste', allocation_pct: 0.44 },
      { species_id: 'tomato_sun_gold', allocation_pct: 0.22 },
    ],
  },
];

// =============================================================================
// Amendments
// =============================================================================

const AMENDMENTS: Expenditure[] = [
  {
    id: 'amend_compost',
    name: 'Compost (bulk delivery, 2 cubic yards)',
    amount_dollars: 80.00,
    date: '2026-04-01',
    category: 'amendment',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: null, allocation_pct: 1.0 }],  // Garden-wide
  },
  {
    id: 'amend_lime',
    name: 'Garden lime (50 lb bag)',
    amount_dollars: 8.00,
    date: '2026-04-01',
    category: 'amendment',
    useful_life_years: 1,
    recurring: false,  // Only if soil test says pH is low
    allocations: [{ species_id: null, allocation_pct: 1.0 }],
  },
];

// =============================================================================
// Infrastructure — amortized multi-year
// =============================================================================

const INFRASTRUCTURE: Expenditure[] = [
  {
    id: 'infra_trellis_emt',
    name: '1.5" EMT conduit crossbars (12 × 10ft sticks)',
    amount_dollars: 84.00,  // ~$7 per 10ft stick
    date: '2026-04-15',
    category: 'infrastructure',
    useful_life_years: 10,
    recurring: false,
    // Trellis serves both tomato varieties
    allocations: [
      { species_id: 'tomato_amish_paste', allocation_pct: 0.67 },
      { species_id: 'tomato_sun_gold', allocation_pct: 0.33 },
    ],
  },
  {
    id: 'infra_trellis_tposts',
    name: '8ft T-posts (13 posts at 10ft spacing)',
    amount_dollars: 78.00,  // ~$6 per post
    date: '2026-04-15',
    category: 'infrastructure',
    useful_life_years: 20,
    recurring: false,
    allocations: [
      { species_id: 'tomato_amish_paste', allocation_pct: 0.67 },
      { species_id: 'tomato_sun_gold', allocation_pct: 0.33 },
    ],
  },
  {
    id: 'infra_trellis_twine',
    name: 'Polypropylene twine (500ft roll)',
    amount_dollars: 12.00,
    date: '2026-04-15',
    category: 'infrastructure',
    useful_life_years: 1,
    recurring: true,
    allocations: [
      { species_id: 'tomato_amish_paste', allocation_pct: 0.67 },
      { species_id: 'tomato_sun_gold', allocation_pct: 0.33 },
    ],
  },
  {
    id: 'infra_fence_wire',
    name: 'Welded wire fencing (100ft × 4ft)',
    amount_dollars: 85.00,
    date: '2026-03-15',
    category: 'infrastructure',
    useful_life_years: 15,
    recurring: false,
    allocations: [{ species_id: null, allocation_pct: 1.0 }],  // Garden-wide
  },
  {
    id: 'infra_fence_posts',
    name: 'Fence T-posts (30 × 5ft)',
    amount_dollars: 120.00,  // ~$4 per post
    date: '2026-03-15',
    category: 'infrastructure',
    useful_life_years: 20,
    recurring: false,
    allocations: [{ species_id: null, allocation_pct: 1.0 }],
  },
];

// =============================================================================
// Tools
// =============================================================================

const TOOLS: Expenditure[] = [
  {
    id: 'tool_hoe',
    name: 'Stirrup hoe',
    amount_dollars: 35.00,
    date: '2026-03-01',
    category: 'tool',
    useful_life_years: 10,
    recurring: false,
    allocations: [{ species_id: null, allocation_pct: 1.0 }],
  },
  {
    id: 'tool_harvest_knife',
    name: 'Harvest knife',
    amount_dollars: 15.00,
    date: '2026-03-01',
    category: 'tool',
    useful_life_years: 5,
    recurring: false,
    allocations: [{ species_id: null, allocation_pct: 1.0 }],
  },
  {
    id: 'tool_buckets',
    name: 'Harvest buckets (3×)',
    amount_dollars: 15.00,
    date: '2026-03-01',
    category: 'tool',
    useful_life_years: 5,
    recurring: false,
    allocations: [{ species_id: null, allocation_pct: 1.0 }],
  },
  {
    id: 'tool_digging_fork',
    name: 'Digging fork (potato harvest)',
    amount_dollars: 40.00,
    date: '2026-03-01',
    category: 'tool',
    useful_life_years: 15,
    recurring: false,
    allocations: [{ species_id: 'potato_kennebec', allocation_pct: 0.8 },
                  { species_id: null, allocation_pct: 0.2 }],  // Occasional general use
  },
];

// =============================================================================
// Seed starting — lights
// =============================================================================

const SEED_STARTING: Expenditure[] = [
  {
    id: 'light_barrina',
    name: 'Barrina TX36 grow lights (4-pack)',
    amount_dollars: 36.00,
    date: '2026-03-20',
    category: 'infrastructure',
    useful_life_years: 5,
    recurring: false,
    // Shared by block-started species
    allocations: [
      { species_id: 'kale_red_russian', allocation_pct: 0.34 },
      { species_id: 'tomato_amish_paste', allocation_pct: 0.44 },
      { species_id: 'tomato_sun_gold', allocation_pct: 0.22 },
    ],
  },
  {
    id: 'light_rack_materials',
    name: 'Light rack materials (maker pipe + conduit)',
    amount_dollars: 45.00,
    date: '2026-03-20',
    category: 'infrastructure',
    useful_life_years: 10,
    recurring: false,
    allocations: [
      { species_id: 'kale_red_russian', allocation_pct: 0.34 },
      { species_id: 'tomato_amish_paste', allocation_pct: 0.44 },
      { species_id: 'tomato_sun_gold', allocation_pct: 0.22 },
    ],
  },
];

// =============================================================================
// Irrigation
// =============================================================================

const IRRIGATION: Expenditure[] = [
  {
    id: 'irrig_hose',
    name: 'Garden hose (100ft)',
    amount_dollars: 40.00,
    date: '2026-04-01',
    category: 'irrigation',
    useful_life_years: 5,
    recurring: false,
    allocations: [{ species_id: null, allocation_pct: 1.0 }],
  },
  {
    id: 'irrig_nozzle',
    name: 'Watering wand with shower head',
    amount_dollars: 20.00,
    date: '2026-04-01',
    category: 'irrigation',
    useful_life_years: 3,
    recurring: false,
    allocations: [{ species_id: null, allocation_pct: 1.0 }],
  },
];

// =============================================================================
// Exports
// =============================================================================

export const EXPENDITURES_2026: Expenditure[] = [
  ...SEEDS,
  ...MEDIA,
  ...AMENDMENTS,
  ...INFRASTRUCTURE,
  ...TOOLS,
  ...SEED_STARTING,
  ...IRRIGATION,
];

/**
 * Market prices at Grand Rapids area farmers markets.
 *
 * Sources: MSU Extension SE MI pricing guide, USDA FRED, USDA AMS terminal reports.
 * Companion species have no market price (not sold).
 */
export const MARKET_PRICES_2026: MarketPrice[] = [
  { species_id: 'lettuce_bss',          price_per_lb: 5.00, unit: 'lb', source: 'FM estimate — loose leaf mix', year: 2026 },
  { species_id: 'spinach_bloomsdale',   price_per_lb: 6.00, unit: 'lb', source: 'FM estimate — baby spinach', year: 2026 },
  { species_id: 'kale_red_russian',     price_per_lb: 4.00, unit: 'lb', source: 'FM estimate — bunched kale (~$2/bunch, 0.5 lb)', year: 2026 },
  { species_id: 'tomato_amish_paste',   price_per_lb: 2.50, unit: 'lb', source: 'USDA AMS — roma/paste category', year: 2026 },
  { species_id: 'tomato_sun_gold',      price_per_lb: 6.00, unit: 'lb', source: 'FM pint avg $4.88 ÷ 0.75 lb/pint', year: 2026 },
  { species_id: 'potato_kennebec',      price_per_lb: 1.50, unit: 'lb', source: 'MI potato growers + FM markup', year: 2026 },
  { species_id: 'corn_nothstine_dent',  price_per_lb: 2.50, unit: 'lb', source: 'Specialty dried cornmeal/grits', year: 2026 },
];
