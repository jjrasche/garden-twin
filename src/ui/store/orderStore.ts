/**
 * Order store — manages customer orders with Zustand.
 *
 * Orders are created, validated against projected inventory, confirmed,
 * and tracked through fulfillment. Persisted to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, OrderStatus } from '@core/types/Order';
import type { Task } from '@core/types/Task';
import type { Observation } from '@core/types/Observation';
import { generateOrderTasks } from '@core/engine/orderPipeline';
import { buildHarvestObservations, type FulfillmentWeight } from '@core/engine/observationCapture';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildTasksForOrder(order: Order): Task[] {
  return order.status === 'confirmed' ? generateOrderTasks(order) : [];
}

function removeTasksForOrder(tasks: Task[], orderId: string): Task[] {
  return tasks.filter(t => t.generated_by_rule !== `order:${orderId}`);
}

// ── Store ────────────────────────────────────────────────────────────────────

interface OrderStoreState {
  orders: Order[];
  orderTasks: Task[];
  observations: Observation[];

  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  fulfillOrder: (orderId: string, weights: FulfillmentWeight[]) => void;
  removeOrder: (orderId: string) => void;
}

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set) => ({
      orders: [],
      orderTasks: [],
      observations: [],

      addOrder: (order) => {
        const newTasks = buildTasksForOrder(order);
        set((state) => ({
          orders: [...state.orders, order],
          orderTasks: [...state.orderTasks, ...newTasks],
        }));
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map(o =>
            o.order_id === orderId
              ? { ...o, status, updated_at: new Date().toISOString() }
              : o,
          ),
          orderTasks: status === 'cancelled'
            ? removeTasksForOrder(state.orderTasks, orderId)
            : state.orderTasks,
        }));
      },

      fulfillOrder: (orderId, weights) => {
        const weightMap = new Map(weights.map(w => [w.species_id, w.fulfilled_lbs]));
        const newObservations = buildHarvestObservations(orderId, weights);

        set((state) => ({
          orders: state.orders.map(o =>
            o.order_id === orderId
              ? {
                  ...o,
                  status: 'packaged' as const,
                  updated_at: new Date().toISOString(),
                  lines: o.lines.map(l => ({
                    ...l,
                    fulfilled_lbs: weightMap.get(l.species_id) ?? l.fulfilled_lbs,
                  })),
                }
              : o,
          ),
          observations: [...state.observations, ...newObservations],
        }));
      },

      removeOrder: (orderId) => {
        set((state) => ({
          orders: state.orders.filter(o => o.order_id !== orderId),
          orderTasks: removeTasksForOrder(state.orderTasks, orderId),
        }));
      },
    }),
    {
      name: 'garden-twin-orders',
    },
  ),
);
