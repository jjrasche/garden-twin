import { z } from 'zod';

// =============================================================================
// Order Line — one species in an order
// =============================================================================

export const OrderLineSchema = z.object({
  species_id: z.string(),
  requested_lbs: z.number().min(0),
  fulfilled_lbs: z.number().min(0).default(0),  // Actual harvest weight (filled on fulfillment)
});

export type OrderLine = z.infer<typeof OrderLineSchema>;

// =============================================================================
// Order — a customer pickup order
// =============================================================================

export const OrderStatusSchema = z.enum([
  'pending',      // Placed, not yet validated against inventory
  'confirmed',    // Validated, harvest tasks not yet generated
  'harvesting',   // Harvest tasks generated and in progress
  'packaged',     // Harvested and packaged, ready for pickup
  'picked_up',    // Customer picked up
  'cancelled',
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderSchema = z.object({
  order_id: z.string(),
  customer_name: z.string(),
  pickup_date: z.string(),          // ISO date — when customer picks up
  status: OrderStatusSchema,
  lines: z.array(OrderLineSchema),

  // Computed at confirmation
  estimated_total_dollars: z.number().min(0).optional(),

  // Filled on fulfillment
  actual_total_dollars: z.number().min(0).optional(),

  // Metadata
  created_at: z.string(),
  updated_at: z.string(),
  notes: z.string().optional(),
});

export type Order = z.infer<typeof OrderSchema>;
