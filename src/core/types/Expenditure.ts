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
// Distribution Channel — how harvest reaches customers
// =============================================================================

export const DistributionChannelSchema = z.object({
  id: z.string(),
  name: z.string(),

  // Per-lb costs (packaging, labeling, washing for sale)
  packaging_minutes_per_lb: z.number().min(0),
  packaging_cost_per_lb: z.number().min(0),  // bags, labels, pint containers

  // Per-event costs (each market day, each delivery run)
  fixed_cost_per_event: z.number().min(0),   // booth fee, gas, table rental
  staffing_hours_per_event: z.number().min(0),
  events_per_season: z.number().int().min(0),

  // Price effect relative to base market price
  price_modifier: z.number().min(0),  // 1.0 = base, 0.67 = discount (u-pick), 1.33 = premium (delivery)
});

export type DistributionChannel = z.infer<typeof DistributionChannelSchema>;

// =============================================================================
// Species Channel Assignment — what fraction goes where
// =============================================================================

/**
 * Maps a species to one or more distribution channels.
 * Fractions must sum to 1.0 across all assignments for a species.
 *
 * Example: Sun Gold → 60% family, 30% farm_stand, 10% u_pick
 */
export const SpeciesChannelAssignmentSchema = z.object({
  species_id: z.string(),
  channel_id: z.string(),  // References DistributionChannel.id
  fraction: z.number().min(0).max(1),
});

export type SpeciesChannelAssignment = z.infer<typeof SpeciesChannelAssignmentSchema>;

// =============================================================================
// Channel Economics — computed per species × channel
// =============================================================================

export interface ChannelEconomics {
  channel_id: string;
  channel_name: string;
  fraction: number;
  harvest_lbs: number;         // species harvest × fraction
  effective_price_per_lb: number;  // base price × channel price_modifier
  gross_revenue: number;
  packaging_labor_hours: number;
  packaging_cost: number;
  channel_fixed_cost: number;  // allocated share of booth fees etc.
  channel_staffing_hours: number;
  net_revenue: number;         // gross - packaging - fixed
}

// =============================================================================
// Species Profitability — computed rollup
// =============================================================================

export interface SpeciesProfitability {
  species_id: string;
  harvest_lbs: number;
  price_per_lb: number;

  // Production economics (farm-gate)
  revenue: number;             // harvest × base price (before distribution)
  costs: {
    direct: number;            // Seeds, species-specific items
    allocated: number;         // Share of garden-wide/infrastructure costs
    total: number;
  };
  profit: number;              // Farm-gate profit (revenue - production costs)
  labor_hours: number;         // Production labor only
  profit_per_hour: number;     // Farm-gate profit / production labor

  // Distribution economics (post farm-gate)
  distribution: {
    channels: ChannelEconomics[];
    total_net_revenue: number;       // Sum of channel net revenues
    total_packaging_cost: number;
    total_packaging_labor_hours: number;
    total_channel_fixed_cost: number;
    total_channel_staffing_hours: number;
  };

  // Delivered economics (production + distribution combined)
  delivered_profit: number;          // total_net_revenue - production costs
  total_labor_hours: number;         // production + packaging + staffing
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
