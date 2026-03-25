/**
 * Order → task pipeline tests.
 *
 * validateOrder checks availability, confirmOrder generates harvest tasks.
 */

import { describe, test, expect } from 'vitest';
import { validateOrderWithPrices as validateOrder, generateOrderTasks } from '../../src/core/engine/orderPipeline';
import type { Order } from '../../src/core/types/Order';
import type { AvailableSpecies } from '../../src/core/calculators/Inventory';
import type { MarketPrice } from '../../src/core/types/Expenditure';
import type { SpeciesSalesConfig } from '../../src/core/types/Expenditure';

// ── Fixtures ────────────────────────────────────────────────────────────────

const AVAILABLE: AvailableSpecies[] = [
  { species_id: 'potato_kennebec', available_lbs: 10, harvestable_plant_count: 6, total_plant_count: 88 },
  { species_id: 'kale_red_russian', available_lbs: 3, harvestable_plant_count: 15, total_plant_count: 120 },
  { species_id: 'tomato_sun_gold', available_lbs: 2, harvestable_plant_count: 4, total_plant_count: 8 },
];

const PRICES: MarketPrice[] = [
  { species_id: 'potato_kennebec', price_per_lb: 1.50, unit: 'lb', source: 'test', year: 2026 },
  { species_id: 'kale_red_russian', price_per_lb: 4.00, unit: 'lb', source: 'test', year: 2026 },
  { species_id: 'tomato_sun_gold', price_per_lb: 6.00, unit: 'lb', source: 'test', year: 2026 },
];

const SALES: SpeciesSalesConfig[] = [
  { species_id: 'potato_kennebec', family_fraction: 0.5, price_premium: 1.2, packaging_minutes_per_lb: 0.2, packaging_cost_per_lb: 0.05 },
  { species_id: 'kale_red_russian', family_fraction: 0.7, price_premium: 1.25, packaging_minutes_per_lb: 2.0, packaging_cost_per_lb: 0.10 },
  { species_id: 'tomato_sun_gold', family_fraction: 0.4, price_premium: 1.25, packaging_minutes_per_lb: 1.3, packaging_cost_per_lb: 0.20 },
];

function makeOrder(lines: { species_id: string; requested_lbs: number }[]): Order {
  return {
    order_id: 'ord_test_1',
    customer_name: 'Test Customer',
    pickup_date: '2026-07-15',
    status: 'pending',
    lines: lines.map(l => ({ ...l, fulfilled_lbs: 0 })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('validateOrder', () => {
  test('valid order passes when all lines are within available inventory', () => {
    const order = makeOrder([
      { species_id: 'potato_kennebec', requested_lbs: 5 },
      { species_id: 'kale_red_russian', requested_lbs: 0.5 },  // 3 avail × 0.3 sellable = 0.9 lbs
    ]);

    const result = validateOrder(order, AVAILABLE, SALES, PRICES);
    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  test('rejects order when requested exceeds sellable inventory', () => {
    const order = makeOrder([
      { species_id: 'potato_kennebec', requested_lbs: 8 },  // 10 available but 50% family = 5 sellable
    ]);

    const result = validateOrder(order, AVAILABLE, SALES, PRICES);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBe(1);
    expect(result.issues[0].species_id).toBe('potato_kennebec');
    expect(result.issues[0].sellable_lbs).toBeCloseTo(5);
  });

  test('rejects species not in current inventory', () => {
    const order = makeOrder([
      { species_id: 'spinach_bloomsdale', requested_lbs: 2 },
    ]);

    const result = validateOrder(order, AVAILABLE, SALES, PRICES);
    expect(result.valid).toBe(false);
    expect(result.issues[0].reason).toBe('not_available');
  });

  test('computes estimated total with premium pricing', () => {
    const order = makeOrder([
      { species_id: 'potato_kennebec', requested_lbs: 3 },   // 3 × $1.50 × 1.2 = $5.40
      { species_id: 'tomato_sun_gold', requested_lbs: 1 },   // 1 × $6.00 × 1.25 = $7.50
    ]);

    const result = validateOrder(order, AVAILABLE, SALES, PRICES);
    expect(result.valid).toBe(true);
    // Potato: 3 × $1.50 × 1.2 = $5.40, Sun Gold: 1 × $6.00 × 1.25 = $7.50
    expect(result.estimated_total).toBeCloseTo(12.90);
  });
});

describe('generateOrderTasks', () => {
  test('creates one harvest task per order line', () => {
    const order = makeOrder([
      { species_id: 'potato_kennebec', requested_lbs: 5 },
      { species_id: 'kale_red_russian', requested_lbs: 1 },
    ]);
    order.status = 'confirmed';

    const tasks = generateOrderTasks(order);

    expect(tasks.length).toBe(3); // 2 harvest + 1 packaging
    expect(tasks[0].type).toBe('harvest');
    expect(tasks[0].parameters?.order_id).toBe('ord_test_1');
    expect(tasks[0].parameters?.requested_lbs).toBe(5);
  });

  test('creates packaging task after harvest tasks', () => {
    const order = makeOrder([
      { species_id: 'potato_kennebec', requested_lbs: 5 },
    ]);
    order.status = 'confirmed';

    const tasks = generateOrderTasks(order);

    const pkgTask = tasks.find(t => t.type === 'prepare');
    expect(pkgTask).toBeDefined();
    expect(pkgTask!.parameters?.order_id).toBe('ord_test_1');
  });

  test('does not generate tasks for non-confirmed orders', () => {
    const order = makeOrder([
      { species_id: 'potato_kennebec', requested_lbs: 5 },
    ]);
    order.status = 'pending';

    const tasks = generateOrderTasks(order);
    expect(tasks.length).toBe(0);
  });
});
