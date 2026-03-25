/**
 * Profitability calculator — per-species cost allocation and profit computation.
 *
 * Pure functions. No side effects. Consumes expenditures + simulation results,
 * produces per-species profitability rollups.
 */

import type {
  Expenditure,
  MarketPrice,
  SpeciesProfitability,
  CostLineItem,
  ExpenditureCategory,
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
        // Direct allocation to named species
        const items = costsBySpecies.get(alloc.species_id);
        if (!items) continue;  // Species not in our set
        items.push({
          expenditure_id: exp.id,
          name: exp.name,
          category: exp.category,
          annual_cost: annualCost,
          allocated_cost: annualCost * alloc.allocation_pct,
        });
      } else {
        // Garden-wide — split by area fraction
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
}

/** Compute per-species profitability, sorted by profit_per_hour descending. */
export function computeProfitability(input: ProfitabilityInput): SpeciesProfitability[] {
  const { expenditures, marketPrices, harvestLbs, laborHours, areaFractions } = input;

  const costsBySpecies = allocateCosts(expenditures, areaFractions);
  const priceMap = new Map(marketPrices.map(p => [p.species_id, p.price_per_lb]));

  const results: SpeciesProfitability[] = [];

  for (const [speciesId, costItems] of costsBySpecies) {
    const harvest = harvestLbs.get(speciesId) ?? 0;
    const pricePerLb = priceMap.get(speciesId) ?? 0;
    const revenue = harvest * pricePerLb;
    const hours = laborHours.get(speciesId) ?? 0;

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

    results.push({
      species_id: speciesId,
      harvest_lbs: harvest,
      price_per_lb: pricePerLb,
      revenue,
      costs: { direct: directCost, allocated: allocatedCost, total: totalCost },
      profit,
      labor_hours: hours,
      profit_per_hour: profitPerHour,
      cost_breakdown: costItems,
    });
  }

  results.sort((a, b) => b.profit_per_hour - a.profit_per_hour);
  return results;
}
