/**
 * Observation capture — creates Observation records from harvest fulfillment data.
 *
 * Every order fulfillment is an observation event: actual harvested weight
 * calibrates the growth model (projected vs actual).
 */

import type { Observation } from '../types/Observation';
import { createObservationId } from '../types/Observation';

export interface FulfillmentWeight {
  species_id: string;
  fulfilled_lbs: number;
}

/**
 * Build harvest weight observations from order fulfillment data.
 *
 * One observation per species line with non-zero weight.
 * Source: manual entry (scale or hand-weigh at harvest time).
 */
export function buildHarvestObservations(
  orderId: string,
  fulfillments: FulfillmentWeight[],
): Observation[] {
  const now = new Date().toISOString();

  return fulfillments
    .filter(f => f.fulfilled_lbs > 0)
    .map(f => ({
      observation_id: createObservationId(undefined, undefined),
      timestamp: now,
      species_id: f.species_id,
      harvest_weight_lbs: f.fulfilled_lbs,
      source: { source_type: 'manual' as const, user_id: 'garden_owner' },
      method: 'manual_entry' as const,
      confidence: 1.0,
      notes: `Harvest fulfillment: ${f.fulfilled_lbs} lbs ${f.species_id} for order ${orderId}`,
      applied_to_state: false,
      created_at: now,
    }));
}
