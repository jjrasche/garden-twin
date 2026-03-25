/**
 * Profitability calculator tests.
 *
 * Tests the per-species cost allocation and profit/hr computation.
 */

import { describe, test, expect } from 'vitest';
import { computeProfitability, allocateCosts, computeAreaFractions } from '../../src/core/calculators/Profitability';
import type { Expenditure, MarketPrice } from '../../src/core/types/Expenditure';

// ── Fixtures ────────────────────────────────────────────────────────────────

const SPECIES_IDS = ['tomato_paste', 'kale', 'potato'];

// Area fractions: tomato 30%, kale 50%, potato 20%
const AREA_FRACTIONS = new Map<string, number>([
  ['tomato_paste', 0.30],
  ['kale', 0.50],
  ['potato', 0.20],
]);

const EXPENDITURES: Expenditure[] = [
  {
    id: 'seed_tomato',
    name: 'Tomato seeds',
    amount_dollars: 4.00,
    date: '2026-02-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'tomato_paste', allocation_pct: 1.0 }],
  },
  {
    id: 'seed_kale',
    name: 'Kale seeds',
    amount_dollars: 3.00,
    date: '2026-02-15',
    category: 'seed',
    useful_life_years: 1,
    recurring: true,
    allocations: [{ species_id: 'kale', allocation_pct: 1.0 }],
  },
  {
    id: 'trellis',
    name: 'Trellis conduit',
    amount_dollars: 100.00,
    date: '2026-04-01',
    category: 'infrastructure',
    useful_life_years: 10,
    recurring: false,
    // 100% to tomato
    allocations: [{ species_id: 'tomato_paste', allocation_pct: 1.0 }],
  },
  {
    id: 'compost',
    name: 'Compost',
    amount_dollars: 80.00,
    date: '2026-04-01',
    category: 'amendment',
    useful_life_years: 1,
    recurring: true,
    // Garden-wide — split by area
    allocations: [{ species_id: null, allocation_pct: 1.0 }],
  },
  {
    id: 'fence',
    name: 'Fence',
    amount_dollars: 200.00,
    date: '2026-03-15',
    category: 'infrastructure',
    useful_life_years: 20,
    recurring: false,
    allocations: [{ species_id: null, allocation_pct: 1.0 }],
  },
];

const MARKET_PRICES: MarketPrice[] = [
  { species_id: 'tomato_paste', price_per_lb: 3.00, unit: 'lb', source: 'test', year: 2026 },
  { species_id: 'kale', price_per_lb: 4.00, unit: 'lb', source: 'test', year: 2026 },
  { species_id: 'potato', price_per_lb: 1.50, unit: 'lb', source: 'test', year: 2026 },
];

// Simulation results
const HARVEST_LBS = new Map<string, number>([
  ['tomato_paste', 100],
  ['kale', 80],
  ['potato', 150],
]);

const LABOR_HOURS = new Map<string, number>([
  ['tomato_paste', 40],
  ['kale', 60],
  ['potato', 5],
]);

// ── Tests ───────────────────────────────────────────────────────────────────

describe('allocateCosts', () => {
  test('direct allocation goes 100% to species', () => {
    const costs = allocateCosts(EXPENDITURES, AREA_FRACTIONS);
    const tomatoCosts = costs.get('tomato_paste')!;

    const seedLine = tomatoCosts.find(c => c.expenditure_id === 'seed_tomato');
    expect(seedLine).toBeDefined();
    expect(seedLine!.allocated_cost).toBeCloseTo(4.00);
  });

  test('amortized infrastructure spreads over useful life', () => {
    const costs = allocateCosts(EXPENDITURES, AREA_FRACTIONS);
    const tomatoCosts = costs.get('tomato_paste')!;

    const trellisLine = tomatoCosts.find(c => c.expenditure_id === 'trellis');
    expect(trellisLine).toBeDefined();
    // $100 / 10 years × 100% allocation = $10/yr
    expect(trellisLine!.annual_cost).toBeCloseTo(10.00);
    expect(trellisLine!.allocated_cost).toBeCloseTo(10.00);
  });

  test('garden-wide costs split by area fraction', () => {
    const costs = allocateCosts(EXPENDITURES, AREA_FRACTIONS);

    // Compost: $80/yr garden-wide. Tomato gets 30% = $24
    const tomatoCompost = costs.get('tomato_paste')!.find(c => c.expenditure_id === 'compost');
    expect(tomatoCompost!.allocated_cost).toBeCloseTo(24.00);

    // Kale gets 50% = $40
    const kaleCompost = costs.get('kale')!.find(c => c.expenditure_id === 'compost');
    expect(kaleCompost!.allocated_cost).toBeCloseTo(40.00);

    // Potato gets 20% = $16
    const potatoCompost = costs.get('potato')!.find(c => c.expenditure_id === 'compost');
    expect(potatoCompost!.allocated_cost).toBeCloseTo(16.00);
  });

  test('amortized garden-wide cost combines both reductions', () => {
    const costs = allocateCosts(EXPENDITURES, AREA_FRACTIONS);

    // Fence: $200 / 20 years = $10/yr. Tomato at 30% = $3
    const tomatoFence = costs.get('tomato_paste')!.find(c => c.expenditure_id === 'fence');
    expect(tomatoFence!.annual_cost).toBeCloseTo(10.00);
    expect(tomatoFence!.allocated_cost).toBeCloseTo(3.00);
  });

  test('species with no direct costs only gets garden-wide share', () => {
    const costs = allocateCosts(EXPENDITURES, AREA_FRACTIONS);
    const potatoCosts = costs.get('potato')!;

    // Potato has no direct expenditures in this set — only garden-wide
    const directCosts = potatoCosts.filter(c =>
      c.expenditure_id !== 'compost' && c.expenditure_id !== 'fence',
    );
    expect(directCosts.length).toBe(0);
  });
});

describe('computeProfitability', () => {
  test('computes profit and profit_per_hour for each species', () => {
    const results = computeProfitability({
      expenditures: EXPENDITURES,
      marketPrices: MARKET_PRICES,
      harvestLbs: HARVEST_LBS,
      laborHours: LABOR_HOURS,
      areaFractions: AREA_FRACTIONS,
    });

    expect(results.length).toBe(3);

    const tomato = results.find(r => r.species_id === 'tomato_paste')!;
    // Revenue: 100 lbs × $3 = $300
    expect(tomato.revenue).toBeCloseTo(300);
    // Direct costs (seed/media): seed $4 = $4
    expect(tomato.costs.direct).toBeCloseTo(4);
    // Allocated costs (infra/amendment/tool): trellis $10 + compost $24 + fence $3 = $37
    expect(tomato.costs.allocated).toBeCloseTo(37);
    // Total: $41
    expect(tomato.costs.total).toBeCloseTo(41);
    // Profit: $300 - $41 = $259
    expect(tomato.profit).toBeCloseTo(259);
    // Profit/hr: $259 / 40 hrs = $6.48
    expect(tomato.profit_per_hour).toBeCloseTo(6.475, 1);
  });

  test('species with no harvest has zero revenue', () => {
    const noHarvest = new Map<string, number>([
      ['tomato_paste', 0],
      ['kale', 80],
      ['potato', 150],
    ]);

    const results = computeProfitability({
      expenditures: EXPENDITURES,
      marketPrices: MARKET_PRICES,
      harvestLbs: noHarvest,
      laborHours: LABOR_HOURS,
      areaFractions: AREA_FRACTIONS,
    });

    const tomato = results.find(r => r.species_id === 'tomato_paste')!;
    expect(tomato.revenue).toBe(0);
    expect(tomato.profit).toBeLessThan(0);
  });

  test('species with no labor has Infinity profit_per_hour', () => {
    const noLabor = new Map<string, number>([
      ['tomato_paste', 40],
      ['kale', 60],
      ['potato', 0],
    ]);

    const results = computeProfitability({
      expenditures: EXPENDITURES,
      marketPrices: MARKET_PRICES,
      harvestLbs: HARVEST_LBS,
      laborHours: noLabor,
      areaFractions: AREA_FRACTIONS,
    });

    const potato = results.find(r => r.species_id === 'potato')!;
    expect(potato.profit_per_hour).toBe(Infinity);
  });

  test('results sorted by profit_per_hour descending', () => {
    const results = computeProfitability({
      expenditures: EXPENDITURES,
      marketPrices: MARKET_PRICES,
      harvestLbs: HARVEST_LBS,
      laborHours: LABOR_HOURS,
      areaFractions: AREA_FRACTIONS,
    });

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].profit_per_hour).toBeGreaterThanOrEqual(results[i].profit_per_hour);
    }
  });
});

describe('computeAreaFractions', () => {
  test('computes fraction of total subcells per species', () => {
    const subcellCounts = new Map<string, number>([
      ['tomato_paste', 300],
      ['kale', 500],
      ['potato', 200],
    ]);

    const fractions = computeAreaFractions(subcellCounts);

    expect(fractions.get('tomato_paste')).toBeCloseTo(0.30);
    expect(fractions.get('kale')).toBeCloseTo(0.50);
    expect(fractions.get('potato')).toBeCloseTo(0.20);
  });

  test('fractions sum to 1.0', () => {
    const subcellCounts = new Map<string, number>([
      ['a', 100],
      ['b', 200],
      ['c', 300],
    ]);

    const fractions = computeAreaFractions(subcellCounts);
    let sum = 0;
    for (const v of fractions.values()) sum += v;
    expect(sum).toBeCloseTo(1.0);
  });
});
