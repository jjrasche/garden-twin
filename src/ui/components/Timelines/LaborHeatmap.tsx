import React from 'react';
import { useGardenStore } from '../../store/gardenStore';

export function LaborHeatmap() {
  const projection = useGardenStore((state) => state.projection);

  if (!projection || projection.labor_schedule.length === 0) {
    return (
      <div className="bg-gray-900 p-4 border-b border-gray-700">
        <h2 className="text-white text-sm font-semibold mb-2">Labor Heatmap</h2>
        <p className="text-gray-400 text-xs">No labor schedule available</p>
      </div>
    );
  }

  const { labor_schedule } = projection;

  // Find max hours for scaling colors
  const maxHours = Math.max(...labor_schedule.map((w) => w.total_hours));
  const minWeek = Math.min(...labor_schedule.map((w) => w.week_number));
  const maxWeek = Math.max(...labor_schedule.map((w) => w.week_number));

  // Create a map for quick lookup
  const weekMap = new Map(labor_schedule.map((w) => [w.week_number, w]));

  // Get color intensity based on hours
  const getColor = (hours: number): string => {
    if (hours === 0) return 'bg-gray-800';
    const intensity = hours / maxHours;
    if (intensity > 0.75) return 'bg-red-600';
    if (intensity > 0.5) return 'bg-orange-500';
    if (intensity > 0.25) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Group weeks into rows of 13 (roughly quarterly view)
  const rows: number[][] = [];
  for (let start = minWeek; start <= maxWeek; start += 13) {
    const row = [];
    for (let week = start; week < start + 13 && week <= maxWeek; week++) {
      row.push(week);
    }
    rows.push(row);
  }

  return (
    <div className="bg-gray-900 p-4 border-b border-gray-700 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-white text-sm font-semibold">Labor Heatmap (Hours per Week)</h2>
        <div className="flex gap-2 items-center text-xs text-gray-400">
          <span>Low</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-green-500 rounded-sm" />
            <div className="w-4 h-4 bg-yellow-500 rounded-sm" />
            <div className="w-4 h-4 bg-orange-500 rounded-sm" />
            <div className="w-4 h-4 bg-red-600 rounded-sm" />
          </div>
          <span>High</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="space-y-2">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1">
              {row.map((weekNum) => {
                const week = weekMap.get(weekNum);
                const hours = week?.total_hours || 0;
                const colorClass = getColor(hours);

                return (
                  <div
                    key={weekNum}
                    className={`flex-1 min-w-[40px] h-12 ${colorClass} rounded flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-white/50 transition-all group relative`}
                    title={`Week ${weekNum}: ${hours.toFixed(1)} hours`}
                  >
                    <span className="text-white text-xs font-semibold opacity-80 group-hover:opacity-100">
                      W{weekNum}
                    </span>
                    <span className="text-white text-[10px] opacity-60 group-hover:opacity-100">
                      {hours.toFixed(1)}h
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between text-xs text-gray-400">
        <span>Weeks {minWeek}-{maxWeek}</span>
        <span>
          Peak: <span className="text-white font-semibold">{maxHours.toFixed(1)}h</span>
        </span>
      </div>
    </div>
  );
}
