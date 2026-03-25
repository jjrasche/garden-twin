/**
 * Orders view — inventory availability, order creation, and order tracking.
 *
 * Reads projected inventory from simulation snapshots.
 * Orders validate against inventory, generate harvest + packaging tasks.
 */

import React, { useState, useMemo } from 'react';
import type { DaySnapshot } from '@core/engine/simulate';
import type { Order, OrderLine } from '@core/types/Order';
import type { AvailableSpecies } from '@core/calculators/Inventory';
import { getAvailableHarvest } from '@core/calculators/Inventory';
import { validateOrder } from '@core/engine/orderPipeline';
import { MARKET_PRICES_2026, SALES_CONFIG } from '@core/data/expenditures-2026';
import { GARDEN_SPECIES_MAP } from '@core/data/species';
import { useOrderStore } from '../../store/orderStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

function speciesName(speciesId: string): string {
  return GARDEN_SPECIES_MAP.get(speciesId)?.name ?? speciesId;
}

function generateOrderId(): string {
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Inventory Panel ──────────────────────────────────────────────────────────

function InventoryPanel({ inventory }: { inventory: AvailableSpecies[] }) {
  if (inventory.length === 0) {
    return (
      <div className="text-gray-500 text-xs p-3">No produce available on this date.</div>
    );
  }

  return (
    <div className="space-y-1">
      {inventory.map(item => (
        <div
          key={item.species_id}
          className="flex items-center justify-between px-3 py-1.5 bg-gray-800 rounded text-xs"
        >
          <div>
            <span className="text-gray-200">{speciesName(item.species_id)}</span>
            <span className="text-gray-500 ml-2">
              {item.harvestable_plant_count}/{item.total_plant_count} plants
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-mono">
              {item.available_lbs.toFixed(1)} lbs
            </span>
            <span className="text-gray-500">
              Q: {(item.avg_quality_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Order Form ───────────────────────────────────────────────────────────────

interface OrderFormProps {
  inventory: AvailableSpecies[];
  validationError: string | null;
  onSubmit: (order: Order) => void;
}

function OrderForm({ inventory, validationError, onSubmit }: OrderFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [lines, setLines] = useState<{ species_id: string; lbs: string }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const addLine = () => {
    if (inventory.length === 0) return;
    setLines([...lines, { species_id: inventory[0]!.species_id, lbs: '' }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: 'species_id' | 'lbs', value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index]!, [field]: value };
    setLines(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    if (!pickupDate) {
      setFormError('Pickup date is required.');
      return;
    }
    if (lines.length === 0) {
      setFormError('Add at least one item.');
      return;
    }

    const orderLines: OrderLine[] = lines.map(l => ({
      species_id: l.species_id,
      requested_lbs: parseFloat(l.lbs) || 0,
      fulfilled_lbs: 0,
    }));

    const invalidLine = orderLines.find(l => l.requested_lbs <= 0);
    if (invalidLine) {
      setFormError(`Enter a valid weight for ${speciesName(invalidLine.species_id)}.`);
      return;
    }

    const now = new Date().toISOString();
    onSubmit({
      order_id: generateOrderId(),
      customer_name: customerName.trim(),
      pickup_date: pickupDate,
      status: 'pending',
      lines: orderLines,
      created_at: now,
      updated_at: now,
    });
    setCustomerName('');
    setPickupDate('');
    setLines([]);
  };

  const displayError = formError ?? validationError;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Customer name"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500"
        />
        <input
          type="date"
          value={pickupDate}
          onChange={e => setPickupDate(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
        />
      </div>

      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={line.species_id}
            onChange={e => updateLine(i, 'species_id', e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
          >
            {inventory.map(item => (
              <option key={item.species_id} value={item.species_id}>
                {speciesName(item.species_id)} ({item.available_lbs.toFixed(1)} lbs)
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.1"
            min="0.1"
            placeholder="lbs"
            value={line.lbs}
            onChange={e => updateLine(i, 'lbs', e.target.value)}
            className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 text-right"
          />
          <button
            type="button"
            onClick={() => removeLine(i)}
            className="text-gray-500 hover:text-red-400 text-xs px-1"
          >
            &times;
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addLine}
          disabled={inventory.length === 0}
          className="text-xs text-emerald-400 hover:text-emerald-300 disabled:text-gray-600"
        >
          + Add item
        </button>
        <div className="flex-1" />
        <button
          type="submit"
          disabled={lines.length === 0}
          className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
        >
          Place Order
        </button>
      </div>

      {displayError && (
        <div className="text-xs text-red-400 bg-red-900/30 border border-red-800 rounded px-2 py-1">
          {displayError}
        </div>
      )}
    </form>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  harvesting: '#22c55e',
  packaged: '#a78bfa',
  picked_up: '#6b7280',
  cancelled: '#ef4444',
};

// ── Harvest Weight Entry ──────────────────────────────────────────────────────

function HarvestWeightEntry({ order }: { order: Order }) {
  const fulfillOrder = useOrderStore(s => s.fulfillOrder);
  const [weights, setWeights] = useState<Record<string, string>>(
    () => Object.fromEntries(order.lines.map(l => [l.species_id, String(l.requested_lbs)])),
  );

  const updateWeight = (speciesId: string, value: string) => {
    setWeights(prev => ({ ...prev, [speciesId]: value }));
  };

  const handleComplete = () => {
    const fulfillments = order.lines.map(l => ({
      species_id: l.species_id,
      fulfilled_lbs: parseFloat(weights[l.species_id] ?? '0') || 0,
    }));
    fulfillOrder(order.order_id, fulfillments);
  };

  return (
    <div className="space-y-1.5 border-t border-gray-700 pt-2 mt-1">
      <div className="text-[10px] text-gray-400 font-medium">Actual harvest weights:</div>
      {order.lines.map(line => (
        <div key={line.species_id} className="flex items-center gap-2">
          <span className="flex-1 text-[11px] text-gray-400">{speciesName(line.species_id)}</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={weights[line.species_id] ?? ''}
            onChange={e => updateWeight(line.species_id, e.target.value)}
            className="w-20 bg-gray-900 border border-gray-600 rounded px-2 py-0.5 text-[11px] text-gray-200 text-right font-mono"
          />
          <span className="text-[10px] text-gray-500">lbs</span>
        </div>
      ))}
      <button
        onClick={handleComplete}
        className="text-[10px] px-2 py-0.5 bg-purple-700 hover:bg-purple-600 text-white rounded"
      >
        Complete Harvest
      </button>
    </div>
  );
}

// ── Order List ───────────────────────────────────────────────────────────────

function OrderList() {
  const orders = useOrderStore(s => s.orders);
  const updateStatus = useOrderStore(s => s.updateOrderStatus);
  const removeOrder = useOrderStore(s => s.removeOrder);

  if (orders.length === 0) {
    return <div className="text-gray-500 text-xs p-3">No orders yet.</div>;
  }

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-2">
      {sortedOrders.map(order => (
        <div key={order.order_id} className="bg-gray-800 rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[order.status] ?? '#6b7280' }}
              />
              <span className="text-xs text-gray-200 font-medium">
                {order.customer_name}
              </span>
              <span className="text-[10px] text-gray-500 capitalize">
                {order.status.replace('_', ' ')}
              </span>
            </div>
            <span className="text-[10px] text-gray-500">
              Pickup: {order.pickup_date}
            </span>
          </div>

          <div className="space-y-0.5">
            {order.lines.map((line, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">{speciesName(line.species_id)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 font-mono">{line.requested_lbs} lbs</span>
                  {line.fulfilled_lbs > 0 && (
                    <span className="text-emerald-400 font-mono text-[10px]">
                      ({line.fulfilled_lbs} actual)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {order.estimated_total_dollars != null && (
            <div className="text-[10px] text-gray-500">
              Est. total: ${order.estimated_total_dollars.toFixed(2)}
            </div>
          )}

          {order.status === 'harvesting' && <HarvestWeightEntry order={order} />}

          <div className="flex items-center gap-1 pt-1">
            {order.status === 'confirmed' && (
              <button
                onClick={() => updateStatus(order.order_id, 'harvesting')}
                className="text-[10px] px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded"
              >
                Start Harvest
              </button>
            )}
            {order.status === 'packaged' && (
              <button
                onClick={() => updateStatus(order.order_id, 'picked_up')}
                className="text-[10px] px-2 py-0.5 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                Picked Up
              </button>
            )}
            {(order.status === 'pending' || order.status === 'confirmed') && (
              <button
                onClick={() => updateStatus(order.order_id, 'cancelled')}
                className="text-[10px] px-2 py-0.5 text-red-400 hover:text-red-300"
              >
                Cancel
              </button>
            )}
            {(order.status === 'picked_up' || order.status === 'cancelled') && (
              <button
                onClick={() => removeOrder(order.order_id)}
                className="text-[10px] px-2 py-0.5 text-gray-500 hover:text-gray-400"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────

interface OrdersViewProps {
  snapshots: DaySnapshot[];
  selectedDate: Date | null;
}

export function OrdersView({ snapshots, selectedDate }: OrdersViewProps) {
  const addOrder = useOrderStore(s => s.addOrder);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const inventory = useMemo(() => {
    if (!selectedDate || snapshots.length === 0) return [];
    return getAvailableHarvest(snapshots, selectedDate);
  }, [snapshots, selectedDate]);

  const confirmOrder = (pendingOrder: Order) => {
    setInventoryError(null);
    const result = validateOrder(pendingOrder, inventory, SALES_CONFIG, MARKET_PRICES_2026);
    if (!result.valid) {
      const issueMessages = result.issues.map(i =>
        i.reason === 'not_available'
          ? `${speciesName(i.species_id)}: not available`
          : `${speciesName(i.species_id)}: requested ${i.requested_lbs} lbs, only ${i.sellable_lbs.toFixed(1)} available`,
      );
      setInventoryError(issueMessages.join('. '));
      return;
    }
    addOrder({ ...pendingOrder, status: 'confirmed', estimated_total_dollars: result.estimated_total });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Inventory */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Available Inventory
            {selectedDate && (
              <span className="ml-2 text-gray-500 normal-case font-normal">
                {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </h2>
          <InventoryPanel inventory={inventory} />
        </section>

        {/* New Order */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            New Order
          </h2>
          <OrderForm inventory={inventory} validationError={inventoryError} onSubmit={confirmOrder} />
        </section>

        {/* Order List */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Orders
          </h2>
          <OrderList />
        </section>
      </div>
    </div>
  );
}
