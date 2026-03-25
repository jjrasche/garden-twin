import { z } from 'zod';

// =============================================================================
// Expenditure Category
// =============================================================================

export const ExpenditureCategorySchema = z.enum([
  'seed',            // Seeds, directly attributable to species
  'media',           // Soil blocks, potting mix — shared across block-started species
  'amendment',       // Fertilizer, compost, lime — garden-wide
  'tool',            // Hand tools, hoses — amortized, garden-wide
  'infrastructure',  // Trellis, fence, channel — amortized, allocated to benefiting species
  'pest_control',    // Netting, row cover, deterrents
  'irrigation',      // Hose, timer, drip tape
]);

export type ExpenditureCategory = z.infer<typeof ExpenditureCategorySchema>;

// =============================================================================
// Expenditure Allocation — ties cost to species
// =============================================================================

export const ExpenditureAllocationSchema = z.object({
  species_id: z.string().nullable(),  // null = garden-wide, split by area fraction
  allocation_pct: z.number().min(0).max(1),
});

export type ExpenditureAllocation = z.infer<typeof ExpenditureAllocationSchema>;

// =============================================================================
// Expenditure — a purchase or cost
// =============================================================================

export const ExpenditureSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount_dollars: z.number().min(0),
  date: z.string(),                    // ISO date of purchase
  category: ExpenditureCategorySchema,
  useful_life_years: z.number().int().min(1),  // 1 = consumable, >1 = amortized
  recurring: z.boolean(),              // true = purchased every season
  allocations: z.array(ExpenditureAllocationSchema),
});

export type Expenditure = z.infer<typeof ExpenditureSchema>;

// =============================================================================
// Market Price — species-level revenue assumption
// =============================================================================

export const MarketPriceSchema = z.object({
  species_id: z.string(),
  price_per_lb: z.number().min(0),
  unit: z.string().default('lb'),       // 'lb', 'pint', 'ear', 'bunch'
  source: z.string(),                    // Where price came from
  year: z.number().int(),
});

export type MarketPrice = z.infer<typeof MarketPriceSchema>;

// =============================================================================
// Species Sales Config — per-species pickup order economics
// =============================================================================

/**
 * Sales config per species: pricing, packaging costs.
 * All inventory is available to all buyers (family orders through the system too).
 * Price premium reflects the "harvested 1 hour ago" story.
 */
export const SpeciesSalesConfigSchema = z.object({
  species_id: z.string(),
  price_premium: z.number().min(0),            // multiplier on base market price (1.2 = 20% premium)
  packaging_minutes_per_lb: z.number().min(0), // species-specific packaging time
  packaging_cost_per_lb: z.number().min(0),    // bags, containers, labels
});

export type SpeciesSalesConfig = z.infer<typeof SpeciesSalesConfigSchema>;

// =============================================================================
// Pickup Operation — fixed costs for running pickup orders
// =============================================================================

/**
 * Shared pickup operation costs. Not per-species — split across all sold species
 * by revenue share.
 */
export const PickupOperationSchema = z.object({
  weekly_window_minutes: z.number().min(0),  // time spent per pickup window
  weeks_per_season: z.number().int().min(0), // how many weeks you run pickups
  supplies_per_season: z.number().min(0),    // boxes, tape, signage
});

export type PickupOperation = z.infer<typeof PickupOperationSchema>;

// =============================================================================
// Species Profitability — computed rollup
// =============================================================================

export interface SpeciesProfitability {
  species_id: string;
  harvest_lbs: number;
  price_per_lb: number;

  // Production economics (farm-gate)
  revenue: number;             // harvest × base price (all lbs, before family split)
  costs: {
    direct: number;            // Seeds, species-specific items
    allocated: number;         // Share of garden-wide/infrastructure costs
    total: number;
  };
  profit: number;              // Farm-gate profit (revenue - production costs)
  labor_hours: number;         // Production labor only
  profit_per_hour: number;     // Farm-gate profit / production labor

  // Sales economics (post farm-gate)
  sales: {
    sold_lbs: number;
    effective_price_per_lb: number;   // base × premium
    gross_revenue: number;            // sold_lbs × effective_price
    packaging_cost: number;
    packaging_labor_hours: number;
    pickup_overhead_hours: number;    // allocated share of weekly pickup windows
    pickup_overhead_cost: number;     // allocated share of supplies
    net_revenue: number;              // gross - packaging - overhead
  };

  // Delivered economics (production + sales combined)
  delivered_profit: number;          // net_revenue - production costs
  total_labor_hours: number;         // production + packaging + pickup overhead
  delivered_profit_per_hour: number; // delivered_profit / total_labor_hours

  cost_breakdown: CostLineItem[];
}

export interface CostLineItem {
  expenditure_id: string;
  name: string;
  category: ExpenditureCategory;
  annual_cost: number;        // amount / useful_life_years
  allocated_cost: number;     // annual_cost × allocation_pct
}
