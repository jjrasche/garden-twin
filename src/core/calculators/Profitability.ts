/**
 * Profitability calculator — per-species cost allocation and profit computation.
 *
 * Pure functions. No side effects. Consumes expenditures + simulation results,
 * produces per-species profitability rollups with pickup order economics.
 */

import type {
  Expenditure,
  MarketPrice,
  SpeciesProfitability,
  CostLineItem,
  ExpenditureCategory,
  SpeciesSalesConfig,
  PickupOperation,
} from '../types/Expenditure';

const DIRECT_CATEGORIES: Set<ExpenditureCategory> = new Set(['seed', 'media']);

// ── Area Fractions ──────────────────────────────────────────────────────────

/** Compute each species' fraction of total occupied subcells. */
export function computeAreaFractions(
  subcellCounts: Map<string, number>,
): Map<string, number> {
  let total = 0;
  for (const count of subcellCounts.values()) total += count;

  const fractions = new Map<string, number>();
  if (total === 0) return fractions;

  for (const [species, count] of subcellCounts) {
    fractions.set(species, count / total);
  }
  return fractions;
}

// ── Cost Allocation ─────────────────────────────────────────────────────────

/**
 * Allocate expenditures to species, returning cost line items per species.
 *
 * - Direct allocations (species_id set): annual_cost × allocation_pct
 * - Garden-wide allocations (species_id null): annual_cost × area_fraction per species
 */
export function allocateCosts(
  expenditures: Expenditure[],
  areaFractions: Map<string, number>,
): Map<string, CostLineItem[]> {
  const speciesIds = [...areaFractions.keys()];
  const costsBySpecies = new Map<string, CostLineItem[]>();
  for (const id of speciesIds) costsBySpecies.set(id, []);

  for (const exp of expenditures) {
    const annualCost = exp.amount_dollars / exp.useful_life_years;

    for (const alloc of exp.allocations) {
      if (alloc.species_id !== null) {
        const items = costsBySpecies.get(alloc.species_id);
        if (!items) continue;
        items.push({
          expenditure_id: exp.id,
          name: exp.name,
          category: exp.category,
          annual_cost: annualCost,
          allocated_cost: annualCost * alloc.allocation_pct,
        });
      } else {
        for (const [speciesId, fraction] of areaFractions) {
          const items = costsBySpecies.get(speciesId)!;
          items.push({
            expenditure_id: exp.id,
            name: exp.name,
            category: exp.category,
            annual_cost: annualCost,
            allocated_cost: annualCost * alloc.allocation_pct * fraction,
          });
        }
      }
    }
  }

  return costsBySpecies;
}

// ── Profitability Rollup ────────────────────────────────────────────────────

export interface ProfitabilityInput {
  expenditures: Expenditure[];
  marketPrices: MarketPrice[];
  harvestLbs: Map<string, number>;
  laborHours: Map<string, number>;
  areaFractions: Map<string, number>;
  salesConfigs: SpeciesSalesConfig[];
  pickupOperation: PickupOperation;
}

/**
 * Compute per-species profitability with pickup order economics.
 *
 * Handles everything in one pass:
 * 1. Farm-gate: production costs, production labor
 * 2. Sales: family/pickup split, packaging, premium pricing
 * 3. Pickup overhead: shared window staffing + supplies, allocated by revenue share
 *
 * Sorted by delivered_profit_per_hour descending.
 */
export function computeProfitability(input: ProfitabilityInput): SpeciesProfitability[] {
  const { expenditures, marketPrices, harvestLbs, laborHours, areaFractions, salesConfigs, pickupOperation } = input;

  const costsBySpecies = allocateCosts(expenditures, areaFractions);
  const priceMap = new Map(marketPrices.map(p => [p.species_id, p.price_per_lb]));
  const salesMap = new Map(salesConfigs.map(s => [s.species_id, s]));

  // First pass: compute per-species sales economics (pickup overhead allocated in second pass)
  const speciesWithRevenue: {
    profitability: SpeciesProfitability;
    grossRevenue: number;
  }[] = [];

  for (const [speciesId, costItems] of costsBySpecies) {
    const harvest = harvestLbs.get(speciesId) ?? 0;
    const basePrice = priceMap.get(speciesId) ?? 0;
    const revenue = harvest * basePrice;
    const hours = laborHours.get(speciesId) ?? 0;
    const sales = salesMap.get(speciesId);

    let directCost = 0;
    let allocatedCost = 0;
    for (const item of costItems) {
      if (DIRECT_CATEGORIES.has(item.category)) {
        directCost += item.allocated_cost;
      } else {
        allocatedCost += item.allocated_cost;
      }
    }
    const totalCost = directCost + allocatedCost;
    const profit = revenue - totalCost;
    const profitPerHour = hours === 0 ? Infinity : profit / hours;

    // Sales split
    const familyFraction = sales?.family_fraction ?? 1.0;
    const familyLbs = harvest * familyFraction;
    const soldLbs = harvest * (1 - familyFraction);
    const effectivePrice = basePrice * (sales?.price_premium ?? 1.0);
    const grossRevenue = soldLbs * effectivePrice;
    const packagingCost = soldLbs * (sales?.packaging_cost_per_lb ?? 0);
    const packagingLaborHours = (soldLbs * (sales?.packaging_minutes_per_lb ?? 0)) / 60;

    speciesWithRevenue.push({
      grossRevenue,
      profitability: {
        species_id: speciesId,
        harvest_lbs: harvest,
        price_per_lb: basePrice,
        revenue,
        costs: { direct: directCost, allocated: allocatedCost, total: totalCost },
        profit,
        labor_hours: hours,
        profit_per_hour: profitPerHour,
        sales: {
          family_lbs: familyLbs,
          sold_lbs: soldLbs,
          effective_price_per_lb: effectivePrice,
          gross_revenue: grossRevenue,
          packaging_cost: packagingCost,
          packaging_labor_hours: packagingLaborHours,
          pickup_overhead_hours: 0,  // Filled in second pass
          pickup_overhead_cost: 0,
          net_revenue: grossRevenue - packagingCost,
        },
        delivered_profit: 0,
        total_labor_hours: 0,
        delivered_profit_per_hour: 0,
        cost_breakdown: costItems,
      },
    });
  }

  // Second pass: allocate pickup overhead by revenue share
  const totalGrossRevenue = speciesWithRevenue.reduce((sum, entry) => sum + entry.grossRevenue, 0);
  const totalPickupHours = (pickupOperation.weekly_window_minutes * pickupOperation.weeks_per_season) / 60;
  const totalPickupCost = pickupOperation.supplies_per_season;

  for (const entry of speciesWithRevenue) {
    const revenueShare = totalGrossRevenue > 0 ? entry.grossRevenue / totalGrossRevenue : 0;
    const overheadHours = totalPickupHours * revenueShare;
    const overheadCost = totalPickupCost * revenueShare;

    const species = entry.profitability;
    species.sales.pickup_overhead_hours = overheadHours;
    species.sales.pickup_overhead_cost = overheadCost;
    species.sales.net_revenue = species.sales.gross_revenue - species.sales.packaging_cost - overheadCost;

    species.delivered_profit = species.sales.net_revenue - species.costs.total;
    species.total_labor_hours = species.labor_hours + species.sales.packaging_labor_hours + overheadHours;
    species.delivered_profit_per_hour = species.total_labor_hours === 0 ? Infinity : species.delivered_profit / species.total_labor_hours;
  }

  const results = speciesWithRevenue.map(entry => entry.profitability);
  results.sort((a, b) => b.delivered_profit_per_hour - a.delivered_profit_per_hour);
  return results;
}
