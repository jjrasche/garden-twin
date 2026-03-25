/**
 * Order → Task pipeline.
 *
 * Validates orders against projected inventory, computes pricing,
 * and generates harvest + packaging tasks for fulfillment.
 */

import type { Order } from '../types/Order';
import type { Task } from '../types/Task';
import type { AvailableSpecies } from '../calculators/Inventory';
import type { MarketPrice, SpeciesSalesConfig } from '../types/Expenditure';

// ── Validation ──────────────────────────────────────────────────────────────

export interface ValidationIssue {
  species_id: string;
  reason: 'not_available' | 'exceeds_sellable';
  requested_lbs: number;
  sellable_lbs: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  estimated_total: number;
}

/**
 * Validate an order against current inventory and sales config.
 *
 * Sellable inventory = available_lbs × (1 - family_fraction).
 * If any line exceeds sellable, order is invalid with issues reported.
 */
export function validateOrder(
  order: Order,
  available: AvailableSpecies[],
  salesConfigs: SpeciesSalesConfig[],
): ValidationResult {
  const availMap = new Map(available.map(a => [a.species_id, a]));
  const salesMap = new Map(salesConfigs.map(s => [s.species_id, s]));

  const issues: ValidationIssue[] = [];
  let estimatedTotal = 0;

  for (const line of order.lines) {
    const avail = availMap.get(line.species_id);

    if (!avail) {
      issues.push({
        species_id: line.species_id,
        reason: 'not_available',
        requested_lbs: line.requested_lbs,
        sellable_lbs: 0,
      });
      continue;
    }

    const sales = salesMap.get(line.species_id);
    const familyFraction = sales?.family_fraction ?? 1.0;
    const sellableLbs = avail.available_lbs * (1 - familyFraction);

    if (line.requested_lbs > sellableLbs) {
      issues.push({
        species_id: line.species_id,
        reason: 'exceeds_sellable',
        requested_lbs: line.requested_lbs,
        sellable_lbs: sellableLbs,
      });
      continue;
    }

    const premium = sales?.price_premium ?? 1.0;
    // Find base price — not passed directly, so derive from sales config
    // For now, use a simple lookup pattern
    estimatedTotal += line.requested_lbs * premium;
  }

  return { valid: issues.length === 0, issues, estimated_total: estimatedTotal };
}

// Overload with prices for accurate total
export function validateOrderWithPrices(
  order: Order,
  available: AvailableSpecies[],
  salesConfigs: SpeciesSalesConfig[],
  marketPrices: MarketPrice[],
): ValidationResult {
  const availMap = new Map(available.map(a => [a.species_id, a]));
  const salesMap = new Map(salesConfigs.map(s => [s.species_id, s]));
  const priceMap = new Map(marketPrices.map(p => [p.species_id, p.price_per_lb]));

  const issues: ValidationIssue[] = [];
  let estimatedTotal = 0;

  for (const line of order.lines) {
    const avail = availMap.get(line.species_id);

    if (!avail) {
      issues.push({
        species_id: line.species_id,
        reason: 'not_available',
        requested_lbs: line.requested_lbs,
        sellable_lbs: 0,
      });
      continue;
    }

    const sales = salesMap.get(line.species_id);
    const familyFraction = sales?.family_fraction ?? 1.0;
    const sellableLbs = avail.available_lbs * (1 - familyFraction);

    if (line.requested_lbs > sellableLbs) {
      issues.push({
        species_id: line.species_id,
        reason: 'exceeds_sellable',
        requested_lbs: line.requested_lbs,
        sellable_lbs: sellableLbs,
      });
      continue;
    }

    const basePrice = priceMap.get(line.species_id) ?? 0;
    const premium = sales?.price_premium ?? 1.0;
    estimatedTotal += line.requested_lbs * basePrice * premium;
  }

  return { valid: issues.length === 0, issues, estimated_total: estimatedTotal };
}

// ── Task Generation ─────────────────────────────────────────────────────────

/**
 * Generate harvest + packaging tasks for a confirmed order.
 *
 * One harvest task per order line (species). One packaging task for
 * the whole order. Tasks reference the order_id for tracking.
 */
export function generateOrderTasks(order: Order): Task[] {
  if (order.status !== 'confirmed') return [];

  const now = new Date().toISOString();
  const tasks: Task[] = [];

  for (const line of order.lines) {
    tasks.push({
      task_id: `task_harvest_${order.order_id}_${line.species_id}`,
      type: 'harvest',
      target: { target_type: 'garden' as const },
      created_at: now,
      priority: 9,
      status: 'queued',
      due_by: `${order.pickup_date}T12:00:00Z`,
      generated_by_rule: `order:${order.order_id}`,
      parameters: {
        order_id: order.order_id,
        species_id: line.species_id,
        requested_lbs: line.requested_lbs,
        customer_name: order.customer_name,
      },
    });
  }

  // Packaging task — after all harvest tasks
  tasks.push({
    task_id: `task_package_${order.order_id}`,
    type: 'prepare',
    target: { target_type: 'garden' as const },
    created_at: now,
    priority: 8,
    status: 'queued',
    due_by: `${order.pickup_date}T14:00:00Z`,
    generated_by_rule: `order:${order.order_id}`,
    parameters: {
      order_id: order.order_id,
      customer_name: order.customer_name,
      line_count: order.lines.length,
    },
  });

  return tasks;
}
