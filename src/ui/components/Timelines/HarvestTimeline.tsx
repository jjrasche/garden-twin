import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import {
  simulateSeason,
  PRODUCTION_PLAN,
  SEASON_RANGE,
  GREENS_TARGET_PER_WEEK,
  WEEKLY_TARGETS,
  CropPlanting,
  WeeklyHarvest,
} from '../../../core/calculators/ProductionTimeline';
import { useWeatherSource } from '../../hooks/useWeatherSource';
import { useLegendHighlight } from '../../hooks/useLegendHighlight';
import { formatWeekLabel as sharedFormatWeekLabel, buildDefaultSowingDots } from './chartUtils';

const GROUP_COLORS: Record<string, string> = {
  Lettuce: '#7BC67E',
  Spinach: '#2E8B57',
  Kale: '#8B4513',
  Paste: '#C0392B',
  Cherry: '#E74C3C',
  Potato: '#a78bfa',
  Corn: '#fbbf24',
};

const DISPLAY_GROUPS = ['Lettuce', 'Spinach', 'Kale', 'Paste', 'Cherry', 'Potato', 'Corn'];

const formatWeekLabel = sharedFormatWeekLabel;

interface ChartRow {
  week: string;
  Lettuce: number;
  Spinach: number;
  Kale: number;
  Paste: number;
  Cherry: number;
  Potato: number;
  Corn: number;
  Greens: number;
  Total: number;
  sowingGroups: Set<string>;
  // Actual overlay (undefined when no actual data provided)
  actual_Greens?: number;
  actual_Total?: number;
}

/** Map each week label to the set of groups sowed that week. */
function buildSowingByWeek(plan: readonly CropPlanting[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const seasonStart = SEASON_RANGE.start;
  const msPerDay = 86_400_000;
  for (const p of plan) {
    const d = new Date(p.planting_date);
    const weekIndex = Math.floor((d.getTime() - seasonStart.getTime()) / (7 * msPerDay));
    const weekStart = new Date(seasonStart.getTime() + weekIndex * 7 * msPerDay);
    const label = formatWeekLabel(weekStart);
    const groups = map.get(label) ?? new Set<string>();
    groups.add(p.display_group);
    map.set(label, groups);
  }
  return map;
}

function buildChartData(plan: typeof PRODUCTION_PLAN, env: import('@core/environment').ConditionsResolver, actualData?: WeeklyHarvest[]): ChartRow[] {
  const weeks = simulateSeason(plan, env);
  const sowingByWeek = buildSowingByWeek(plan);

  const actualByWeek = new Map<string, WeeklyHarvest>();
  if (actualData) {
    for (const aw of actualData) {
      actualByWeek.set(formatWeekLabel(aw.week_start), aw);
    }
  }

  return weeks.map((w) => {
    const greens = (w.lbs_by_group['Lettuce'] ?? 0) +
      (w.lbs_by_group['Spinach'] ?? 0) +
      (w.lbs_by_group['Kale'] ?? 0);
    const label = formatWeekLabel(w.week_start);
    const aw = actualByWeek.get(label);

    const row: ChartRow = {
      week: label,
      Lettuce: +(w.lbs_by_group['Lettuce'] ?? 0).toFixed(1),
      Spinach: +(w.lbs_by_group['Spinach'] ?? 0).toFixed(1),
      Kale: +(w.lbs_by_group['Kale'] ?? 0).toFixed(1),
      Paste: +(w.lbs_by_group['Paste'] ?? 0).toFixed(1),
      Cherry: +(w.lbs_by_group['Cherry'] ?? 0).toFixed(1),
      Potato: +(w.lbs_by_group['Potato'] ?? 0).toFixed(1),
      Corn: +(w.lbs_by_group['Corn'] ?? 0).toFixed(1),
      Greens: +greens.toFixed(1),
      Total: +w.total_lbs.toFixed(1),
      sowingGroups: sowingByWeek.get(label) ?? new Set(),
    };

    if (aw) {
      const actualGreens = (aw.lbs_by_group['Lettuce'] ?? 0) +
        (aw.lbs_by_group['Spinach'] ?? 0) +
        (aw.lbs_by_group['Kale'] ?? 0);
      row.actual_Greens = +actualGreens.toFixed(1);
      row.actual_Total = +aw.total_lbs.toFixed(1);
    }

    return row;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HarvestTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row: ChartRow = payload[0]?.payload;
  if (!row) return null;

  const lines: { name: string; value: string; color: string }[] = [];
  for (const group of DISPLAY_GROUPS) {
    const lbs = row[group as keyof ChartRow] as number;
    const isSowing = row.sowingGroups.has(group);
    if (lbs > 0) {
      lines.push({ name: group, value: `${lbs} lbs`, color: GROUP_COLORS[group] ?? '#9ca3af' });
    } else if (isSowing) {
      lines.push({ name: group, value: 'sow', color: GROUP_COLORS[group] ?? '#9ca3af' });
    }
  }
  if (row.Greens > 0) {
    lines.push({ name: 'Greens total', value: `${row.Greens} lbs`, color: '#22d3ee' });
  }

  return (
    <div style={{
      backgroundColor: '#1f2937', border: '1px solid #374151',
      borderRadius: 4, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ color: '#f3f4f6', margin: '0 0 4px', fontWeight: 600 }}>{label}</p>
      {lines.map((l) => (
        <p key={l.name} style={{ color: l.color, margin: '2px 0' }}>
          {l.name}: {l.value}
        </p>
      ))}
    </div>
  );
}


interface HarvestTimelineProps {
  actualData?: WeeklyHarvest[];
  env?: import('@core/environment/types').ConditionsResolver;
}

export function HarvestTimeline({ actualData, env: envProp }: HarvestTimelineProps = {}) {
  const { env: defaultEnv } = useWeatherSource();
  const env = envProp ?? defaultEnv;
  const chartData = useMemo(() => buildChartData(PRODUCTION_PLAN, env, actualData), [env, actualData]);
  const sowingDots = useMemo(() => buildDefaultSowingDots(GROUP_COLORS), []);
  const { onLegendEnter, onLegendLeave, seriesOpacity } = useLegendHighlight();

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-900 p-4">
        <p className="text-gray-400 text-xs">No harvest data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-4 h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <defs>
              {DISPLAY_GROUPS.map((group) => (
                <linearGradient key={group} id={`color-${group}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GROUP_COLORS[group]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={GROUP_COLORS[group]} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
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
                value: 'lbs/week',
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
                fill: '#9ca3af',
                offset: 10,
              }}
            />
            <Tooltip content={<HarvestTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '10px', cursor: 'pointer' }}
              iconType="square"
              iconSize={8}
              onMouseEnter={onLegendEnter}
              onMouseLeave={onLegendLeave}
            />
            <ReferenceLine
              y={GREENS_TARGET_PER_WEEK}
              stroke="#22d3ee"
              strokeDasharray="6 3"
              label={{ value: 'Greens 15 lb', fill: '#22d3ee', fontSize: 10, position: 'right' }}
            />
            {sowingDots.map((dot) => (
              <ReferenceDot
                key={`sow-${dot.weekLabel}-${dot.group}`}
                x={dot.weekLabel}
                y={0}
                r={5}
                fill={dot.color}
                stroke="#1f2937"
                strokeWidth={1}
              />
            ))}
            {DISPLAY_GROUPS.map((group) => {
              const opacity = seriesOpacity(group);
              return (
                <Area
                  key={group}
                  type="monotone"
                  dataKey={group}
                  stackId="1"
                  stroke={GROUP_COLORS[group]}
                  fill={`url(#color-${group})`}
                  fillOpacity={opacity.fillOpacity}
                  strokeOpacity={opacity.strokeOpacity}
                />
              );
            })}
            <Line
              type="monotone"
              dataKey="Greens"
              stroke="#22d3ee"
              strokeWidth={actualData ? 1 : 2}
              strokeDasharray={actualData ? '6 3' : undefined}
              strokeOpacity={actualData ? 0.5 : 1}
              dot={false}
              legendType="line"
            />
            {actualData && (
              <Line
                type="monotone"
                dataKey="actual_Greens"
                name="Greens (actual)"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
                legendType="line"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
