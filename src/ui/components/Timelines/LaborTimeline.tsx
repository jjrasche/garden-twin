import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useGardenStore } from '../../store/gardenStore';

export function LaborTimeline() {
  const projection = useGardenStore((state) => state.projection);

  if (!projection || projection.labor_schedule.length === 0) {
    return (
      <div className="bg-gray-900 p-4 border-b border-gray-700">
        <h2 className="text-white text-sm font-semibold mb-2">Labor Schedule</h2>
        <p className="text-gray-400 text-xs">No labor schedule available</p>
      </div>
    );
  }

  const { labor_schedule } = projection;

  // Aggregate by species for stacked bars
  const chartData = labor_schedule.map((week) => {
    const dataPoint: Record<string, number | string> = {
      week: `W${week.week_number}`,
      weekNumber: week.week_number,
    };

    // Aggregate hours by species
    const speciesHours: Record<string, number> = {};
    for (const task of week.tasks) {
      const species = task.species_id || 'other';
      speciesHours[species] = (speciesHours[species] || 0) + task.hours;
    }

    Object.assign(dataPoint, speciesHours);
    return dataPoint;
  });

  // Get all unique species IDs for bar configuration
  const allSpecies = Array.from(
    new Set(
      labor_schedule.flatMap((week) =>
        week.tasks.map((task) => task.species_id || 'other')
      )
    )
  );

  const speciesColors: Record<string, string> = {
    corn_wapsie_valley: '#fbbf24', // amber
    tomato_better_boy: '#ef4444', // red
    potato_yukon_gold: '#a78bfa', // purple
    other: '#6b7280', // gray
  };

  return (
    <div className="bg-gray-900 p-4 border-b border-gray-700 h-full flex flex-col">
      <h2 className="text-white text-sm font-semibold mb-2">Labor Schedule</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="week"
            stroke="#9ca3af"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#9ca3af' }} />
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
          <Legend
            wrapperStyle={{ fontSize: '10px' }}
            iconType="square"
            iconSize={8}
          />
          {allSpecies.map((speciesId) => (
            <Bar
              key={speciesId}
              dataKey={speciesId}
              stackId="a"
              fill={speciesColors[speciesId] || '#6b7280'}
              name={formatSpeciesName(speciesId)}
            />
          ))}
        </BarChart>
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
