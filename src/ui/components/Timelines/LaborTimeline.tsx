import React, { useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { buildLaborSchedule, ScheduledTask } from '../../../core/calculators/LaborSchedule';
import { PRODUCTION_PLAN } from '../../../core/calculators/ProductionTimeline';
import { LIFECYCLE_SPECS } from '../../../core/data/lifecycle';

const LABOR_GROUPS = ['Lettuce', 'Spinach', 'Kale', 'Paste', 'Cherry', 'Potato', 'Corn'] as const;
type LaborGroup = (typeof LABOR_GROUPS)[number];

const GROUP_COLORS: Record<string, string> = {
  Lettuce: '#7BC67E',
  Spinach: '#2E8B57',
  Kale: '#8B4513',
  Paste: '#C0392B',
  Cherry: '#E74C3C',
  Potato: '#a78bfa',
  Corn: '#fbbf24',
};

interface LaborChartRow {
  week: string;
  Lettuce: number;
  Spinach: number;
  Kale: number;
  Paste: number;
  Cherry: number;
  Potato: number;
  Corn: number;
  total_hours: number;
  beginner_hours: number;
  intermediate_hours: number;
  tasks: ScheduledTask[];
}

function formatWeekLabel(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function buildLaborChartData(): LaborChartRow[] {
  const schedule = buildLaborSchedule(
    PRODUCTION_PLAN,
    LIFECYCLE_SPECS,
    new Date('2025-04-14'),
    new Date('2025-11-24'),
  );

  return schedule.map(week => {
    const row: LaborChartRow = {
      week: formatWeekLabel(week.week_start),
      Lettuce: 0, Spinach: 0, Kale: 0, Paste: 0,
      Cherry: 0, Potato: 0, Corn: 0,
      total_hours: 0,
      beginner_hours: 0,
      intermediate_hours: 0,
      tasks: week.tasks,
    };

    for (const task of week.tasks) {
      const hours = task.duration_minutes / 60;
      const group = task.display_group as LaborGroup;
      if (group in row && typeof row[group] === 'number') {
        row[group] = +(row[group] + hours).toFixed(2);
      }
      if (task.skill_level === 'beginner') {
        row.beginner_hours += hours;
      } else {
        row.intermediate_hours += hours;
      }
    }

    row.total_hours = +(week.total_minutes / 60).toFixed(1);
    row.beginner_hours = +row.beginner_hours.toFixed(1);
    row.intermediate_hours = +row.intermediate_hours.toFixed(1);
    return row;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LaborTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row: LaborChartRow = payload[0]?.payload;
  if (!row) return null;

  const groups = LABOR_GROUPS.filter(g => row[g] > 0);

  return (
    <div style={{
      backgroundColor: '#1f2937', border: '1px solid #374151',
      borderRadius: 4, padding: '8px 12px', fontSize: 12, maxWidth: 300,
    }}>
      <p style={{ color: '#f3f4f6', margin: '0 0 6px', fontWeight: 600 }}>
        {label} — click bar for detail
      </p>
      <p style={{ color: '#d1d5db', margin: '0 0 4px' }}>
        Total: {row.total_hours} hrs ({(row.total_hours / 7 * 60).toFixed(0)} min/day)
      </p>
      {groups.map(g => (
        <p key={g} style={{ color: GROUP_COLORS[g], margin: '2px 0' }}>
          {g}: {row[g].toFixed(1)} hrs
        </p>
      ))}
      <div style={{ borderTop: '1px solid #374151', marginTop: 6, paddingTop: 4 }}>
        <p style={{ color: '#86efac', margin: '2px 0' }}>
          Beginner (kids): {row.beginner_hours} hrs
        </p>
        <p style={{ color: '#fca5a5', margin: '2px 0' }}>
          Intermediate (you): {row.intermediate_hours} hrs
        </p>
      </div>
    </div>
  );
}

const SKILL_BADGE: Record<string, { bg: string; text: string }> = {
  beginner: { bg: 'bg-emerald-900', text: 'text-emerald-300' },
  intermediate: { bg: 'bg-amber-900', text: 'text-amber-300' },
  advanced: { bg: 'bg-red-900', text: 'text-red-300' },
};

function WeekDetail({ row }: { row: LaborChartRow }) {
  // Group tasks by activity for compact display
  const grouped: { key: string; task: ScheduledTask; count: number }[] = [];
  const seen = new Map<string, number>();
  for (const task of row.tasks) {
    const key = `${task.display_group}|${task.activity_name}`;
    const idx = seen.get(key);
    if (idx !== undefined) {
      grouped[idx]!.count++;
    } else {
      seen.set(key, grouped.length);
      grouped.push({ key, task, count: 1 });
    }
  }
  // Sort: longest tasks first
  grouped.sort((a, b) => b.task.duration_minutes * b.count - a.task.duration_minutes * a.count);

  return (
    <div className="border-t border-gray-700 pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">
          {row.week} — {row.total_hours} hrs ({(row.total_hours / 7 * 60).toFixed(0)} min/day)
        </h3>
        <div className="flex gap-3 text-xs">
          <span className="text-emerald-400">Beginner: {row.beginner_hours} hrs</span>
          <span className="text-amber-400">Intermediate: {row.intermediate_hours} hrs</span>
        </div>
      </div>
      <div className="grid gap-1 max-h-64 overflow-y-auto">
        {grouped.map(({ key, task, count }) => {
          const totalMin = task.duration_minutes * count;
          const badge = (SKILL_BADGE[task.skill_level] ?? SKILL_BADGE.beginner)!;
          return (
            <div key={key} className="flex items-center gap-2 py-1 px-2 rounded bg-gray-800 text-xs">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: GROUP_COLORS[task.display_group] ?? '#6b7280' }}
              />
              <span className="text-gray-300 w-16 shrink-0">{task.display_group}</span>
              <span className="text-white flex-1">{task.activity_name}</span>
              {task.task_type === 'process' && (
                <span className="text-gray-500 text-[10px]">processing</span>
              )}
              <span className={`px-1.5 py-0.5 rounded ${badge.bg} ${badge.text} text-[10px]`}>
                {task.skill_level}
              </span>
              <span className="text-gray-400 w-20 text-right shrink-0">
                {totalMin >= 60
                  ? `${(totalMin / 60).toFixed(1)} hrs`
                  : `${Math.round(totalMin)} min`
                }
              </span>
              {task.equipment.length > 0 && (
                <span className="text-gray-600 text-[10px] truncate max-w-32">
                  {task.equipment.slice(0, 2).join(', ')}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {grouped.some(g => g.task.instructions) && (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer">Show instructions</summary>
          <div className="mt-1 grid gap-1 max-h-48 overflow-y-auto">
            {grouped.filter(g => g.task.instructions).map(({ key, task }) => (
              <div key={`inst-${key}`} className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
                <span style={{ color: GROUP_COLORS[task.display_group] }}>{task.activity_name}</span>
                {': '}
                {task.instructions}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

const BUDGET_LOW_HOURS = 20 * 7 / 60;   // 2.33 hrs/week
const BUDGET_HIGH_HOURS = 30 * 7 / 60;  // 3.5 hrs/week

export function LaborTimeline() {
  const chartData = useMemo(() => buildLaborChartData(), []);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = useCallback((data: any) => {
    if (data?.activeLabel) {
      setSelectedWeek(prev => prev === data.activeLabel ? null : data.activeLabel);
    }
  }, []);

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-900 p-4">
        <p className="text-gray-400 text-xs">No labor data available</p>
      </div>
    );
  }

  const maxHours = Math.max(...chartData.map(r => r.total_hours));
  const peakWeek = chartData.find(r => r.total_hours === maxHours);
  const totalSeason = chartData.reduce((sum, r) => sum + r.total_hours, 0);
  const avgHours = totalSeason / chartData.length;
  const overBudgetWeeks = chartData.filter(r => r.total_hours > BUDGET_HIGH_HOURS).length;
  const selectedRow = selectedWeek ? chartData.find(r => r.week === selectedWeek) : null;

  return (
    <div className="bg-gray-900 p-4 h-full flex flex-col">
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3 text-xs text-gray-400">
        <span>Peak: <strong className="text-white">{maxHours.toFixed(1)} hrs</strong> ({peakWeek?.week})</span>
        <span>Avg: <strong className="text-white">{avgHours.toFixed(1)} hrs/wk</strong></span>
        <span>Season: <strong className="text-white">{totalSeason.toFixed(0)} hrs</strong></span>
        <span>Over budget: <strong className={overBudgetWeeks > 0 ? 'text-red-400' : 'text-emerald-400'}>
          {overBudgetWeeks} weeks
        </strong></span>
        <span>Budget: <strong className="text-emerald-400">20-30 min/day</strong></span>
      </div>
      <div className={selectedRow ? 'h-48 shrink-0' : 'flex-1 min-h-0'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
            onClick={handleBarClick}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="week"
              stroke="#9ca3af"
              tick={{ fontSize: 10 }}
              interval={2}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 10 }}
              label={{
                value: 'hours/week',
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
                fill: '#9ca3af',
                offset: 10,
              }}
            />
            <Tooltip content={<LaborTooltip />} />
            <Legend wrapperStyle={{ fontSize: '10px' }} iconType="square" iconSize={8} />
            <ReferenceLine
              y={BUDGET_HIGH_HOURS}
              stroke="#22d3ee"
              strokeDasharray="6 3"
              label={{ value: '30 min/day', fill: '#22d3ee', fontSize: 10, position: 'right' }}
            />
            <ReferenceLine
              y={BUDGET_LOW_HOURS}
              stroke="#86efac"
              strokeDasharray="3 3"
              label={{ value: '20 min/day', fill: '#86efac', fontSize: 10, position: 'right' }}
            />
            {LABOR_GROUPS.map(group => (
              <Bar
                key={group}
                dataKey={group}
                stackId="1"
                fill={GROUP_COLORS[group]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {selectedRow && <WeekDetail row={selectedRow} />}
    </div>
  );
}
