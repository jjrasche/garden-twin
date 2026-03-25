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
  DistributionChannel,
  SpeciesChannelAssignment,
  ChannelEconomics,
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

    const emptyDistribution = {
      channels: [],
      total_net_revenue: 0,
      total_packaging_cost: 0,
      total_packaging_labor_hours: 0,
      total_channel_fixed_cost: 0,
      total_channel_staffing_hours: 0,
    };

    results.push({
      species_id: speciesId,
      harvest_lbs: harvest,
      price_per_lb: pricePerLb,
      revenue,
      costs: { direct: directCost, allocated: allocatedCost, total: totalCost },
      profit,
      labor_hours: hours,
      profit_per_hour: profitPerHour,
      distribution: emptyDistribution,
      delivered_profit: profit,          // Without distribution, same as farm-gate
      total_labor_hours: hours,
      delivered_profit_per_hour: profitPerHour,
      cost_breakdown: costItems,
    });
  }

  results.sort((a, b) => b.profit_per_hour - a.profit_per_hour);
  return results;
}

// ── Distribution Economics ──────────────────────────────────────────────────

/**
 * Compute per-channel economics for a single species.
 *
 * Splits harvest across assigned channels, applies channel-specific
 * pricing, packaging costs, and staffing. Channel fixed costs (booth fees)
 * are reported at full season total — cross-species allocation is the
 * caller's responsibility.
 */
export function computeDistribution(
  speciesId: string,
  harvestLbs: number,
  basePricePerLb: number,
  channels: DistributionChannel[],
  assignments: SpeciesChannelAssignment[],
): SpeciesProfitability['distribution'] {
  const channelMap = new Map(channels.map(c => [c.id, c]));
  const speciesAssignments = assignments.filter(a => a.species_id === speciesId);

  // Default to 100% family if no assignments
  const effectiveAssignments = speciesAssignments.length > 0
    ? speciesAssignments
    : [{ species_id: speciesId, channel_id: 'family', fraction: 1.0 }];

  const channelResults: ChannelEconomics[] = [];

  for (const assignment of effectiveAssignments) {
    const channel = channelMap.get(assignment.channel_id);
    if (!channel) continue;

    const lbs = harvestLbs * assignment.fraction;
    const effectivePrice = basePricePerLb * channel.price_modifier;
    const grossRevenue = lbs * effectivePrice;
    const packagingLaborHours = (lbs * channel.packaging_minutes_per_lb) / 60;
    const packagingCost = lbs * channel.packaging_cost_per_lb;
    const channelFixedCost = channel.fixed_cost_per_event * channel.events_per_season;
    const channelStaffingHours = channel.staffing_hours_per_event * channel.events_per_season;
    const netRevenue = grossRevenue - packagingCost;

    channelResults.push({
      channel_id: channel.id,
      channel_name: channel.name,
      fraction: assignment.fraction,
      harvest_lbs: lbs,
      effective_price_per_lb: effectivePrice,
      gross_revenue: grossRevenue,
      packaging_labor_hours: packagingLaborHours,
      packaging_cost: packagingCost,
      channel_fixed_cost: channelFixedCost,
      channel_staffing_hours: channelStaffingHours,
      net_revenue: netRevenue,
    });
  }

  return {
    channels: channelResults,
    total_net_revenue: channelResults.reduce((s, c) => s + c.net_revenue, 0),
    total_packaging_cost: channelResults.reduce((s, c) => s + c.packaging_cost, 0),
    total_packaging_labor_hours: channelResults.reduce((s, c) => s + c.packaging_labor_hours, 0),
    total_channel_fixed_cost: channelResults.reduce((s, c) => s + c.channel_fixed_cost, 0),
    total_channel_staffing_hours: channelResults.reduce((s, c) => s + c.channel_staffing_hours, 0),
  };
}

/**
 * Extend farm-gate profitability with distribution economics for all species at once.
 *
 * Channel staffing/fixed costs are shared across all species selling through
 * that channel, allocated proportionally by each species' gross revenue share.
 * This must be computed across all species simultaneously.
 */
export function computeAllDeliveredProfitability(
  farmGateResults: SpeciesProfitability[],
  channels: DistributionChannel[],
  assignments: SpeciesChannelAssignment[],
): SpeciesProfitability[] {
  // First pass: compute per-species distribution (raw, unshared staffing)
  const withDist = farmGateResults.map(fg => ({
    fg,
    dist: computeDistribution(fg.species_id, fg.harvest_lbs, fg.price_per_lb, channels, assignments),
  }));

  // Compute total gross revenue per channel across all species
  const channelTotalRevenue = new Map<string, number>();
  for (const { dist } of withDist) {
    for (const ch of dist.channels) {
      channelTotalRevenue.set(ch.channel_id, (channelTotalRevenue.get(ch.channel_id) ?? 0) + ch.gross_revenue);
    }
  }

  // Second pass: allocate shared channel costs by revenue share
  return withDist.map(({ fg, dist }) => {
    let allocatedStaffingHours = 0;
    let allocatedFixedCost = 0;

    for (const ch of dist.channels) {
      const totalRev = channelTotalRevenue.get(ch.channel_id) ?? 0;
      const share = totalRev > 0 ? ch.gross_revenue / totalRev : 0;
      allocatedStaffingHours += ch.channel_staffing_hours * share;
      allocatedFixedCost += ch.channel_fixed_cost * share;
    }

    // Override totals with allocated values
    const adjustedDist = {
      ...dist,
      total_channel_staffing_hours: allocatedStaffingHours,
      total_channel_fixed_cost: allocatedFixedCost,
    };

    const deliveredProfit = dist.total_net_revenue - fg.costs.total - allocatedFixedCost;
    const totalLaborHours = fg.labor_hours + dist.total_packaging_labor_hours + allocatedStaffingHours;
    const deliveredProfitPerHour = totalLaborHours === 0 ? Infinity : deliveredProfit / totalLaborHours;

    return {
      ...fg,
      distribution: adjustedDist,
      delivered_profit: deliveredProfit,
      total_labor_hours: totalLaborHours,
      delivered_profit_per_hour: deliveredProfitPerHour,
    };
  });
}

/**
 * Single-species convenience wrapper. Uses full channel staffing (no sharing).
 * Prefer computeAllDeliveredProfitability for cross-species allocation.
 */
export function computeDeliveredProfitability(
  farmGate: SpeciesProfitability,
  channels: DistributionChannel[],
  assignments: SpeciesChannelAssignment[],
): SpeciesProfitability {
  return computeAllDeliveredProfitability([farmGate], channels, assignments)[0]!;
}
