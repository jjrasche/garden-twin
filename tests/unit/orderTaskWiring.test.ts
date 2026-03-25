/**
 * Order → task wiring tests.
 *
 * Verifies that the order store generates harvest + packaging tasks
 * when orders are confirmed, and cleans them up on cancellation.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { useOrderStore } from '../../src/ui/store/orderStore';
import type { Order } from '../../src/core/types/Order';

function makeConfirmedOrder(id: string, lines: { species_id: string; requested_lbs: number }[]): Order {
  const now = new Date().toISOString();
  return {
    order_id: id,
    customer_name: 'Test Customer',
    pickup_date: '2026-07-15',
    status: 'confirmed',
    lines: lines.map(l => ({ ...l, fulfilled_lbs: 0 })),
    created_at: now,
    updated_at: now,
  };
}

beforeEach(() => {
  useOrderStore.setState({ orders: [], orderTasks: [], observations: [] });
});

describe('order → task generation', () => {
  test('addOrder with confirmed status generates harvest + packaging tasks', () => {
    const order = makeConfirmedOrder('ord_1', [
      { species_id: 'potato_kennebec', requested_lbs: 5 },
      { species_id: 'kale_red_russian', requested_lbs: 1 },
    ]);

    useOrderStore.getState().addOrder(order);

    const tasks = useOrderStore.getState().orderTasks;
    expect(tasks.length).toBe(3); // 2 harvest + 1 packaging
    expect(tasks.filter(t => t.type === 'harvest').length).toBe(2);
    expect(tasks.filter(t => t.type === 'prepare').length).toBe(1);
  });

  test('generated tasks reference the order_id', () => {
    const order = makeConfirmedOrder('ord_ref', [
      { species_id: 'potato_kennebec', requested_lbs: 3 },
    ]);

    useOrderStore.getState().addOrder(order);

    const tasks = useOrderStore.getState().orderTasks;
    for (const task of tasks) {
      expect(task.parameters?.order_id).toBe('ord_ref');
    }
  });

  test('addOrder with pending status does not generate tasks', () => {
    const order = makeConfirmedOrder('ord_pending', [
      { species_id: 'potato_kennebec', requested_lbs: 5 },
    ]);
    order.status = 'pending';

    useOrderStore.getState().addOrder(order);

    expect(useOrderStore.getState().orderTasks.length).toBe(0);
  });

  test('cancelling an order removes its tasks', () => {
    const order = makeConfirmedOrder('ord_cancel', [
      { species_id: 'potato_kennebec', requested_lbs: 5 },
    ]);

    useOrderStore.getState().addOrder(order);
    expect(useOrderStore.getState().orderTasks.length).toBe(2); // 1 harvest + 1 packaging

    useOrderStore.getState().updateOrderStatus('ord_cancel', 'cancelled');

    expect(useOrderStore.getState().orderTasks.length).toBe(0);
  });

  test('removing an order removes its tasks', () => {
    const order = makeConfirmedOrder('ord_remove', [
      { species_id: 'kale_red_russian', requested_lbs: 2 },
    ]);

    useOrderStore.getState().addOrder(order);
    expect(useOrderStore.getState().orderTasks.length).toBe(2);

    useOrderStore.getState().removeOrder('ord_remove');

    expect(useOrderStore.getState().orderTasks.length).toBe(0);
  });

  test('multiple orders accumulate tasks independently', () => {
    const order1 = makeConfirmedOrder('ord_a', [
      { species_id: 'potato_kennebec', requested_lbs: 5 },
    ]);
    const order2 = makeConfirmedOrder('ord_b', [
      { species_id: 'kale_red_russian', requested_lbs: 1 },
      { species_id: 'potato_kennebec', requested_lbs: 2 },
    ]);

    useOrderStore.getState().addOrder(order1);
    useOrderStore.getState().addOrder(order2);

    const tasks = useOrderStore.getState().orderTasks;
    expect(tasks.length).toBe(5); // ord_a: 1h+1p, ord_b: 2h+1p

    // Cancel ord_a — only ord_b tasks remain
    useOrderStore.getState().updateOrderStatus('ord_a', 'cancelled');
    expect(useOrderStore.getState().orderTasks.length).toBe(3);
  });

  test('harvest task due_by matches order pickup_date', () => {
    const order = makeConfirmedOrder('ord_due', [
      { species_id: 'potato_kennebec', requested_lbs: 3 },
    ]);

    useOrderStore.getState().addOrder(order);

    const harvestTask = useOrderStore.getState().orderTasks.find(t => t.type === 'harvest');
    expect(harvestTask?.due_by).toContain('2026-07-15');
  });
});
