/**
 * Harvest observation capture tests.
 *
 * Verifies that fulfilling an order creates weight observations
 * for growth model calibration.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { useOrderStore } from '../../src/ui/store/orderStore';
import { buildHarvestObservations } from '../../src/core/engine/observationCapture';
import { computeCalibrationFactor } from '../../src/core/engine/calibration';
import type { Order } from '../../src/core/types/Order';
import type { Observation } from '../../src/core/types/Observation';

function makeHarvestingOrder(id: string, lines: { species_id: string; requested_lbs: number }[]): Order {
  const now = new Date().toISOString();
  return {
    order_id: id,
    customer_name: 'Test Customer',
    pickup_date: '2026-08-01',
    status: 'harvesting',
    lines: lines.map(l => ({ ...l, fulfilled_lbs: 0 })),
    created_at: now,
    updated_at: now,
  };
}

// ── Pure function tests ──────────────────────────────────────────────────────

describe('buildHarvestObservations', () => {
  test('creates one observation per fulfilled line', () => {
    const fulfillments = [
      { species_id: 'potato_kennebec', fulfilled_lbs: 4.5 },
      { species_id: 'kale_red_russian', fulfilled_lbs: 0.8 },
    ];

    const observations = buildHarvestObservations('ord_1', fulfillments);

    expect(observations.length).toBe(2);
    expect(observations[0]!.source.source_type).toBe('manual');
    expect(observations[0]!.method).toBe('manual_entry');
    expect(observations[0]!.confidence).toBe(1.0);
  });

  test('populates structured harvest_weight_lbs and species_id', () => {
    const observations = buildHarvestObservations('ord_struct', [
      { species_id: 'potato_kennebec', fulfilled_lbs: 4.5 },
      { species_id: 'kale_red_russian', fulfilled_lbs: 0.8 },
    ]);

    expect(observations[0]!.harvest_weight_lbs).toBe(4.5);
    expect(observations[0]!.species_id).toBe('potato_kennebec');
    expect(observations[1]!.harvest_weight_lbs).toBe(0.8);
    expect(observations[1]!.species_id).toBe('kale_red_russian');
  });

  test('observation notes include order_id and species', () => {
    const observations = buildHarvestObservations('ord_notes', [
      { species_id: 'potato_kennebec', fulfilled_lbs: 3.0 },
    ]);

    expect(observations[0]!.notes).toContain('ord_notes');
    expect(observations[0]!.notes).toContain('potato_kennebec');
  });

  test('skips lines with zero fulfilled weight', () => {
    const observations = buildHarvestObservations('ord_zero', [
      { species_id: 'potato_kennebec', fulfilled_lbs: 5.0 },
      { species_id: 'kale_red_russian', fulfilled_lbs: 0 },
    ]);

    expect(observations.length).toBe(1);
    expect(observations[0]!.species_id).toBe('potato_kennebec');
  });
});

// ── Calibration tests ────────────────────────────────────────────────────────

describe('computeCalibrationFactor', () => {
  function makeObservation(speciesId: string, weightLbs: number): Observation {
    const now = new Date().toISOString();
    return {
      observation_id: `obs_test_${Math.random()}`,
      timestamp: now,
      species_id: speciesId,
      harvest_weight_lbs: weightLbs,
      source: { source_type: 'manual', user_id: 'test' },
      method: 'manual_entry',
      confidence: 1.0,
      applied_to_state: false,
      created_at: now,
    };
  }

  test('returns 1.0 when actual matches projected', () => {
    const observations = [makeObservation('potato_kennebec', 5.0)];
    const factor = computeCalibrationFactor('potato_kennebec', observations, 5.0);
    expect(factor).toBe(1.0);
  });

  test('returns ratio of actual to projected', () => {
    const observations = [
      makeObservation('potato_kennebec', 2.5),
      makeObservation('potato_kennebec', 2.3),
    ];
    const factor = computeCalibrationFactor('potato_kennebec', observations, 5.0);
    expect(factor).toBeCloseTo(0.96, 2); // (2.5+2.3)/5.0
  });

  test('returns null when no observations for species', () => {
    const observations = [makeObservation('kale_red_russian', 1.0)];
    const factor = computeCalibrationFactor('potato_kennebec', observations, 5.0);
    expect(factor).toBeNull();
  });

  test('returns null when projected is zero', () => {
    const observations = [makeObservation('potato_kennebec', 2.0)];
    const factor = computeCalibrationFactor('potato_kennebec', observations, 0);
    expect(factor).toBeNull();
  });

  test('ignores observations for other species', () => {
    const observations = [
      makeObservation('potato_kennebec', 4.0),
      makeObservation('kale_red_russian', 1.0),
    ];
    const factor = computeCalibrationFactor('potato_kennebec', observations, 5.0);
    expect(factor).toBeCloseTo(0.8, 2);
  });
});

// ── Store integration tests ──────────────────────────────────────────────────

describe('order store observation capture', () => {
  beforeEach(() => {
    useOrderStore.setState({ orders: [], orderTasks: [], observations: [] });
  });

  test('fulfillOrder updates line weights and creates observations', () => {
    const order = makeHarvestingOrder('ord_fulfill', [
      { species_id: 'potato_kennebec', requested_lbs: 5 },
      { species_id: 'kale_red_russian', requested_lbs: 1 },
    ]);
    // Add as confirmed first so tasks are generated, then transition to harvesting
    order.status = 'confirmed';
    useOrderStore.getState().addOrder(order);
    useOrderStore.getState().updateOrderStatus('ord_fulfill', 'harvesting');

    useOrderStore.getState().fulfillOrder('ord_fulfill', [
      { species_id: 'potato_kennebec', fulfilled_lbs: 4.8 },
      { species_id: 'kale_red_russian', fulfilled_lbs: 0.9 },
    ]);

    const state = useOrderStore.getState();

    // Order should be packaged
    const updatedOrder = state.orders.find(o => o.order_id === 'ord_fulfill')!;
    expect(updatedOrder.status).toBe('packaged');

    // Lines should have fulfilled weights
    expect(updatedOrder.lines[0]!.fulfilled_lbs).toBe(4.8);
    expect(updatedOrder.lines[1]!.fulfilled_lbs).toBe(0.9);

    // Observations should be captured
    expect(state.observations.length).toBe(2);
  });

  test('fulfillOrder accumulates observations across orders', () => {
    const order1 = makeHarvestingOrder('ord_obs_a', [
      { species_id: 'potato_kennebec', requested_lbs: 5 },
    ]);
    order1.status = 'confirmed';
    useOrderStore.getState().addOrder(order1);
    useOrderStore.getState().updateOrderStatus('ord_obs_a', 'harvesting');
    useOrderStore.getState().fulfillOrder('ord_obs_a', [
      { species_id: 'potato_kennebec', fulfilled_lbs: 4.5 },
    ]);

    const order2 = makeHarvestingOrder('ord_obs_b', [
      { species_id: 'kale_red_russian', requested_lbs: 2 },
    ]);
    order2.status = 'confirmed';
    useOrderStore.getState().addOrder(order2);
    useOrderStore.getState().updateOrderStatus('ord_obs_b', 'harvesting');
    useOrderStore.getState().fulfillOrder('ord_obs_b', [
      { species_id: 'kale_red_russian', fulfilled_lbs: 1.8 },
    ]);

    expect(useOrderStore.getState().observations.length).toBe(2);
  });
});
