/**
 * Order store — manages customer orders with Zustand.
 *
 * Orders are created, validated against projected inventory, confirmed,
 * and tracked through fulfillment. Persisted to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, OrderStatus } from '@core/types/Order';

interface OrderStoreState {
  orders: Order[];

  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  removeOrder: (orderId: string) => void;
}

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set) => ({
      orders: [],

      addOrder: (order) => {
        set((state) => ({ orders: [...state.orders, order] }));
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map(o =>
            o.order_id === orderId
              ? { ...o, status, updated_at: new Date().toISOString() }
              : o,
          ),
        }));
      },

      removeOrder: (orderId) => {
        set((state) => ({
          orders: state.orders.filter(o => o.order_id !== orderId),
        }));
      },
    }),
    {
      name: 'garden-twin-orders',
    },
  ),
);
