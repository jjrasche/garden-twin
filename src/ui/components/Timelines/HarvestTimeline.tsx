import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useGardenStore } from '../../store/gardenStore';

export function HarvestTimeline() {
  const projection = useGardenStore((state) => state.projection);

  if (!projection || projection.harvest_schedule.length === 0) {
    return (
      <div className="bg-gray-900 p-4 border-b border-gray-700">
        <h2 className="text-white text-sm font-semibold mb-2">Harvest Timeline</h2>
        <p className="text-gray-400 text-xs">No harvest data available</p>
      </div>
    );
  }

  const { harvest_schedule } = projection;

  // Transform data for chart
  const chartData = harvest_schedule.map((week) => {
    const dataPoint: Record<string, number | string> = {
      week: `W${week.week_number}`,
      weekNumber: week.week_number,
    };

    // Add species-specific yields
    for (const harvest of week.harvests) {
      const species = harvest.species_id;
      dataPoint[species] = (dataPoint[species] as number || 0) + harvest.lbs;
    }

    return dataPoint;
  });

  // Get all unique species IDs
  const allSpecies = Array.from(
    new Set(
      harvest_schedule.flatMap((week) =>
        week.harvests.map((h) => h.species_id)
      )
    )
  );

  const speciesColors: Record<string, string> = {
    corn_wapsie_valley: '#fbbf24', // amber
    tomato_better_boy: '#ef4444', // red
    potato_yukon_gold: '#a78bfa', // purple
  };

  return (
    <div className="bg-gray-900 p-4 border-b border-gray-700 h-full flex flex-col">
      <h2 className="text-white text-sm font-semibold mb-2">Harvest Timeline</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <defs>
            {allSpecies.map((speciesId) => (
              <linearGradient key={speciesId} id={`color-${speciesId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={speciesColors[speciesId]} stopOpacity={0.8} />
                <stop offset="95%" stopColor={speciesColors[speciesId]} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="week"
            stroke="#9ca3af"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fontSize: 10 }}
            label={{
              value: 'Yield (lbs)',
              angle: -90,
              position: 'insideLeft',
              fontSize: 10,
              fill: '#9ca3af',
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#f3f4f6' }}
            itemStyle={{ color: '#d1d5db' }}
          />
          <Legend wrapperStyle={{ fontSize: '10px' }} iconType="square" iconSize={8} />
          {allSpecies.map((speciesId) => (
            <Area
              key={speciesId}
              type="monotone"
              dataKey={speciesId}
              stackId="1"
              stroke={speciesColors[speciesId]}
              fill={`url(#color-${speciesId})`}
              name={formatSpeciesName(speciesId)}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatSpeciesName(speciesId: string): string {
  return speciesId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
