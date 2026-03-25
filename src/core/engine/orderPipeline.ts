/**
 * Order → Task pipeline.
 *
 * Validates orders against projected inventory, computes pricing,
 * and generates harvest + packaging tasks for fulfillment.
 */

import type { Order, OrderLine } from '../types/Order';
import type { Task } from '../types/Task';
import type { AvailableSpecies } from '../calculators/Inventory';
import type { MarketPrice, SpeciesSalesConfig } from '../types/Expenditure';

// ── Types ───────────────────────────────────────────────────────────────────

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

// ── Line Validation (concept) ───────────────────────────────────────────────

/** Get sellable lbs for a species (all inventory is available). */
function computeSellableLbs(
  speciesId: string,
  availableMap: Map<string, AvailableSpecies>,
): number {
  return availableMap.get(speciesId)?.available_lbs ?? 0;
}

/** Validate one order line against sellable inventory. Returns issue or null. */
function validateOrderLine(
  line: OrderLine,
  availableMap: Map<string, AvailableSpecies>,
): ValidationIssue | null {
  const available = availableMap.get(line.species_id);
  if (!available) {
    return { species_id: line.species_id, reason: 'not_available', requested_lbs: line.requested_lbs, sellable_lbs: 0 };
  }

  const sellableLbs = computeSellableLbs(line.species_id, availableMap);
  if (line.requested_lbs > sellableLbs) {
    return { species_id: line.species_id, reason: 'exceeds_sellable', requested_lbs: line.requested_lbs, sellable_lbs: sellableLbs };
  }

  return null;
}

/** Compute effective price for one line: base × premium. */
function computeLinePrice(
  line: OrderLine,
  priceMap: Map<string, number>,
  salesMap: Map<string, SpeciesSalesConfig>,
): number {
  const basePrice = priceMap.get(line.species_id) ?? 0;
  const premium = salesMap.get(line.species_id)?.price_premium ?? 1.0;
  return line.requested_lbs * basePrice * premium;
}

// ── Order Validation (orchestrator) ─────────────────────────────────────────

/**
 * Validate an order against current inventory and sales config.
 *
 * All inventory is available — family orders through the system.
 * Market prices are required for accurate total estimation.
 */
export function validateOrder(
  order: Order,
  available: AvailableSpecies[],
  salesConfigs: SpeciesSalesConfig[],
  marketPrices: MarketPrice[],
): ValidationResult {
  const availableMap = new Map(available.map(a => [a.species_id, a]));
  const salesMap = new Map(salesConfigs.map(s => [s.species_id, s]));
  const priceMap = new Map(marketPrices.map(p => [p.species_id, p.price_per_lb]));

  const issues: ValidationIssue[] = [];
  let estimatedTotal = 0;

  for (const line of order.lines) {
    const issue = validateOrderLine(line, availableMap);
    if (issue) {
      issues.push(issue);
      continue;
    }
    estimatedTotal += computeLinePrice(line, priceMap, salesMap);
  }

  return { valid: issues.length === 0, issues, estimated_total: estimatedTotal };
}

// ── Task Generation ─────────────────────────────────────────────────────────

/** Create a harvest task for one order line. */
function buildHarvestTask(order: Order, line: OrderLine, createdAt: string): Task {
  return {
    task_id: `task_harvest_${order.order_id}_${line.species_id}`,
    type: 'harvest',
    target: { target_type: 'garden' as const },
    created_at: createdAt,
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
  };
}

/** Create a packaging task for the whole order. */
function buildPackagingTask(order: Order, createdAt: string): Task {
  return {
    task_id: `task_package_${order.order_id}`,
    type: 'prepare',
    target: { target_type: 'garden' as const },
    created_at: createdAt,
    priority: 8,
    status: 'queued',
    due_by: `${order.pickup_date}T14:00:00Z`,
    generated_by_rule: `order:${order.order_id}`,
    parameters: {
      order_id: order.order_id,
      customer_name: order.customer_name,
      line_count: order.lines.length,
    },
  };
}

/**
 * Generate harvest + packaging tasks for a confirmed order.
 *
 * One harvest task per order line (species). One packaging task for
 * the whole order. Tasks reference the order_id for tracking.
 */
export function generateOrderTasks(order: Order): Task[] {
  if (order.status !== 'confirmed') return [];

  const createdAt = new Date().toISOString();
  const harvestTasks = order.lines.map(line => buildHarvestTask(order, line, createdAt));
  return [...harvestTasks, buildPackagingTask(order, createdAt)];
}
