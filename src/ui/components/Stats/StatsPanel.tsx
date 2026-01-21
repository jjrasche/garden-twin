import React from 'react';
import { useGardenStore } from '../../store/gardenStore';

export function StatsPanel() {
  const projection = useGardenStore((state) => state.projection);

  if (!projection) {
    return (
      <div className="bg-gray-800 text-white p-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">No garden plan loaded</p>
      </div>
    );
  }

  const {
    total_yield_lbs,
    total_calories,
    total_labor_hours,
    total_cost_dollars,
  } = projection.totals;

  return (
    <div className="bg-gray-800 text-white p-4 border-t border-gray-700">
      <div className="flex justify-around items-center max-w-6xl mx-auto">
        <StatItem
          label="Total Yield"
          value={`${total_yield_lbs.toFixed(1)} lbs`}
          color="text-green-400"
        />
        <StatItem
          label="Calories"
          value={formatNumber(total_calories)}
          color="text-yellow-400"
        />
        <StatItem
          label="Labor Hours"
          value={total_labor_hours.toFixed(1)}
          color="text-purple-400"
        />
        <StatItem
          label="Seed Cost"
          value={`$${total_cost_dollars.toFixed(2)}`}
          color="text-orange-400"
        />
      </div>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  color: string;
}

function StatItem({ label, value, color }: StatItemProps) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toFixed(0);
}
