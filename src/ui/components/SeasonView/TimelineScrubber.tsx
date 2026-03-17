/**
 * Horizontal timeline slider for scrubbing through the growing season.
 *
 * Shows mini harvest bars underneath and emits the selected day index.
 * No re-simulation — just indexes into pre-computed DaySnapshot[].
 */

import React, { useMemo, useCallback } from 'react';
import type { DaySnapshot } from '@core/engine/simulate';

interface TimelineScrubberProps {
  snapshots: DaySnapshot[];
  dayIndex: number;
  onDayChange: (index: number) => void;
  seasonStart: Date;
}

const MS_PER_DAY = 86_400_000;

function formatDateLabel(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/** Aggregate daily harvest events into a normalized bar height per day. */
function buildHarvestBars(snapshots: DaySnapshot[]): number[] {
  const daily = snapshots.map(snap => {
    let lbs = 0;
    for (const event of snap.events) {
      if (event.type === 'harvest_ready') lbs += event.accumulated_lbs;
    }
    return lbs;
  });

  const max = Math.max(...daily, 0.01);
  return daily.map(v => v / max);
}

/** Generate tick marks at month boundaries. */
function buildMonthTicks(snapshots: DaySnapshot[]): Array<{ index: number; label: string }> {
  const ticks: Array<{ index: number; label: string }> = [];
  let prevMonth = -1;
  for (let i = 0; i < snapshots.length; i++) {
    const month = snapshots[i]!.date.getMonth();
    if (month !== prevMonth) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      ticks.push({ index: i, label: months[month]! });
      prevMonth = month;
    }
  }
  return ticks;
}

export function TimelineScrubber({ snapshots, dayIndex, onDayChange, seasonStart }: TimelineScrubberProps) {
  const harvestBars = useMemo(() => buildHarvestBars(snapshots), [snapshots]);
  const monthTicks = useMemo(() => buildMonthTicks(snapshots), [snapshots]);

  const currentDate = snapshots[dayIndex]?.date;
  const dateLabel = currentDate ? formatDateLabel(currentDate) : '';

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onDayChange(Number(e.target.value));
  }, [onDayChange]);

  if (snapshots.length === 0) {
    return <div className="h-16 bg-gray-900 border-t border-gray-700" />;
  }

  return (
    <div className="bg-gray-900 border-t border-gray-700 px-4 py-2 select-none">
      {/* Date label */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-mono">{dateLabel}</span>
        <span className="text-xs text-gray-500">
          Day {dayIndex + 1} / {snapshots.length}
        </span>
      </div>

      {/* Mini harvest bars */}
      <div className="flex items-end h-6 gap-px mb-1">
        {harvestBars.map((height, i) => (
          <div
            key={i}
            className="flex-1 min-w-0"
            style={{
              height: `${Math.max(height * 100, 0)}%`,
              backgroundColor: i === dayIndex
                ? '#34d399'
                : height > 0
                  ? 'rgba(52, 211, 153, 0.4)'
                  : 'transparent',
            }}
          />
        ))}
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={snapshots.length - 1}
        value={dayIndex}
        onChange={handleSliderChange}
        className="w-full h-1.5 accent-emerald-500 cursor-pointer"
      />

      {/* Month ticks */}
      <div className="relative h-3 mt-0.5">
        {monthTicks.map(tick => (
          <span
            key={tick.index}
            className="absolute text-[9px] text-gray-500"
            style={{ left: `${(tick.index / (snapshots.length - 1)) * 100}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
