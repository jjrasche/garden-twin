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
// Species Profitability — computed rollup
// =============================================================================

export interface SpeciesProfitability {
  species_id: string;
  harvest_lbs: number;
  price_per_lb: number;
  revenue: number;
  costs: {
    direct: number;       // Seeds, species-specific items
    allocated: number;    // Share of garden-wide/infrastructure costs
    total: number;
  };
  profit: number;
  labor_hours: number;
  profit_per_hour: number;
  cost_breakdown: CostLineItem[];
}

export interface CostLineItem {
  expenditure_id: string;
  name: string;
  category: ExpenditureCategory;
  annual_cost: number;        // amount / useful_life_years
  allocated_cost: number;     // annual_cost × allocation_pct
}
