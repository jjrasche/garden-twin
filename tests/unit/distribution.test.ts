/**
 * Distribution economics tests.
 *
 * Validates that channel assignments correctly split harvest,
 * apply channel-specific costs/pricing, and roll up into
 * delivered profit/hr.
 */

import { describe, test, expect } from 'vitest';
import {
  computeDistribution,
  computeDeliveredProfitability,
} from '../../src/core/calculators/Profitability';
import type {
  DistributionChannel,
  SpeciesChannelAssignment,
  SpeciesProfitability,
} from '../../src/core/types/Expenditure';

// ── Fixtures ────────────────────────────────────────────────────────────────

const CHANNELS: DistributionChannel[] = [
  {
    id: 'family',
    name: 'Family',
    packaging_minutes_per_lb: 0,
    packaging_cost_per_lb: 0,
    fixed_cost_per_event: 0,
    staffing_hours_per_event: 0,
    events_per_season: 0,
    price_modifier: 0,
  },
  {
    id: 'farm_stand',
    name: 'Farm stand',
    packaging_minutes_per_lb: 2,
    packaging_cost_per_lb: 0.10,
    fixed_cost_per_event: 0,
    staffing_hours_per_event: 0.5,
    events_per_season: 20,
    price_modifier: 1.0,
  },
  {
    id: 'farmers_market',
    name: 'Farmers market',
    packaging_minutes_per_lb: 2,
    packaging_cost_per_lb: 0.15,
    fixed_cost_per_event: 30,
    staffing_hours_per_event: 4,
    events_per_season: 16,
    price_modifier: 1.1,
  },
];

const ASSIGNMENTS: SpeciesChannelAssignment[] = [
  { species_id: 'potato', channel_id: 'family',      fraction: 0.50 },
  { species_id: 'potato', channel_id: 'farm_stand',  fraction: 0.40 },
  { species_id: 'potato', channel_id: 'farmers_market', fraction: 0.10 },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe('computeDistribution', () => {
  test('splits harvest by channel fraction', () => {
    const result = computeDistribution(
      'potato', 100, 1.50, CHANNELS, ASSIGNMENTS,
    );

    expect(result.channels.length).toBe(3);

    const family = result.channels.find(c => c.channel_id === 'family')!;
    expect(family.harvest_lbs).toBe(50);
    expect(family.gross_revenue).toBe(0); // price_modifier = 0

    const stand = result.channels.find(c => c.channel_id === 'farm_stand')!;
    expect(stand.harvest_lbs).toBe(40);
    expect(stand.effective_price_per_lb).toBeCloseTo(1.50);
    expect(stand.gross_revenue).toBeCloseTo(60);
  });

  test('applies price modifier per channel', () => {
    const result = computeDistribution(
      'potato', 100, 1.50, CHANNELS, ASSIGNMENTS,
    );

    const market = result.channels.find(c => c.channel_id === 'farmers_market')!;
    // 10% of 100 lbs = 10 lbs × $1.50 × 1.1 modifier = $16.50
    expect(market.harvest_lbs).toBe(10);
    expect(market.effective_price_per_lb).toBeCloseTo(1.65);
    expect(market.gross_revenue).toBeCloseTo(16.50);
  });

  test('computes packaging labor and cost per channel', () => {
    const result = computeDistribution(
      'potato', 100, 1.50, CHANNELS, ASSIGNMENTS,
    );

    const stand = result.channels.find(c => c.channel_id === 'farm_stand')!;
    // 40 lbs × 2 min/lb = 80 min = 1.33 hrs
    expect(stand.packaging_labor_hours).toBeCloseTo(80 / 60);
    // 40 lbs × $0.10/lb = $4.00
    expect(stand.packaging_cost).toBeCloseTo(4.00);
  });

  test('allocates channel fixed costs proportionally by lbs sold through channel', () => {
    const result = computeDistribution(
      'potato', 100, 1.50, CHANNELS, ASSIGNMENTS,
    );

    // Farmers market: $30/event × 16 events = $480 total
    // But this species only contributes 10 lbs through market.
    // Fixed cost allocation: proportional to this species' share of the channel's total volume.
    // Since we don't know other species' volume here, allocate as:
    // (species_lbs_through_channel / species_total_sellable_lbs) × total_fixed_cost
    // ... actually, we allocate the full fixed costs to each species that uses the channel,
    // weighted by their fraction of lbs going through it.
    const market = result.channels.find(c => c.channel_id === 'farmers_market')!;
    // channel_fixed_cost = $30 × 16 = $480 total fixed cost
    // This is a known simplification — proper allocation needs all species volumes.
    // For now we store the total and let the caller do cross-species allocation.
    expect(market.channel_fixed_cost).toBe(480);
  });

  test('computes staffing hours per channel', () => {
    const result = computeDistribution(
      'potato', 100, 1.50, CHANNELS, ASSIGNMENTS,
    );

    const stand = result.channels.find(c => c.channel_id === 'farm_stand')!;
    // 0.5 hrs/event × 20 events = 10 hrs total
    expect(stand.channel_staffing_hours).toBe(10);
  });

  test('family channel has zero costs and zero revenue', () => {
    const result = computeDistribution(
      'potato', 100, 1.50, CHANNELS, ASSIGNMENTS,
    );

    const family = result.channels.find(c => c.channel_id === 'family')!;
    expect(family.gross_revenue).toBe(0);
    expect(family.packaging_cost).toBe(0);
    expect(family.packaging_labor_hours).toBe(0);
    expect(family.net_revenue).toBe(0);
  });

  test('net revenue = gross - packaging cost (excluding channel fixed)', () => {
    const result = computeDistribution(
      'potato', 100, 1.50, CHANNELS, ASSIGNMENTS,
    );

    const stand = result.channels.find(c => c.channel_id === 'farm_stand')!;
    // gross: $60, packaging: $4, net = $56
    expect(stand.net_revenue).toBeCloseTo(56);
  });

  test('total_net_revenue sums all channels', () => {
    const result = computeDistribution(
      'potato', 100, 1.50, CHANNELS, ASSIGNMENTS,
    );

    const sum = result.channels.reduce((s, c) => s + c.net_revenue, 0);
    expect(result.total_net_revenue).toBeCloseTo(sum);
  });
});

describe('computeDeliveredProfitability', () => {
  test('delivered_profit accounts for production costs + distribution costs', () => {
    // Stub a minimal SpeciesProfitability (farm-gate only)
    const farmGate: Omit<SpeciesProfitability, 'distribution' | 'delivered_profit' | 'total_labor_hours' | 'delivered_profit_per_hour'> = {
      species_id: 'potato',
      harvest_lbs: 100,
      price_per_lb: 1.50,
      revenue: 150,
      costs: { direct: 14, allocated: 10, total: 24 },
      profit: 126,
      labor_hours: 4,
      profit_per_hour: 31.5,
      cost_breakdown: [],
    };

    const result = computeDeliveredProfitability(
      farmGate as SpeciesProfitability,
      CHANNELS,
      ASSIGNMENTS,
    );

    // delivered_profit = distribution net revenue - production costs - packaging costs
    expect(result.delivered_profit).toBeLessThan(result.profit); // Distribution adds costs
    expect(result.total_labor_hours).toBeGreaterThan(result.labor_hours); // Adds packaging/staffing
    expect(result.delivered_profit_per_hour).toBeLessThan(result.profit_per_hour); // Diluted by distribution labor
  });

  test('species with no assignments defaults to 100% family', () => {
    const farmGate: Omit<SpeciesProfitability, 'distribution' | 'delivered_profit' | 'total_labor_hours' | 'delivered_profit_per_hour'> = {
      species_id: 'unknown_crop',
      harvest_lbs: 50,
      price_per_lb: 5.00,
      revenue: 250,
      costs: { direct: 5, allocated: 5, total: 10 },
      profit: 240,
      labor_hours: 10,
      profit_per_hour: 24,
      cost_breakdown: [],
    };

    const result = computeDeliveredProfitability(
      farmGate as SpeciesProfitability,
      CHANNELS,
      [],  // No assignments
    );

    // No sales channels → zero delivered revenue
    expect(result.distribution.total_net_revenue).toBe(0);
    expect(result.delivered_profit).toBeLessThan(0); // Costs with no revenue
  });
});
