/**
 * Flavor quality timeline — shows predicted flavor score (0-1) for each
 * species over the season based on environmental conditions.
 *
 * Higher score = better flavor. Lettuce peaks in spring (sweet, mild),
 * crashes in summer (bitter). Kale peaks in late fall (sweet from frost).
 * Tomatoes peak midsummer (high Brix from sun + warm temps).
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { computeFlavorScore } from '@core/calculators/flavorModel';
import { useWeatherSource } from '../../hooks/useWeatherSource';
import { useLegendHighlight } from '../../hooks/useLegendHighlight';
import { formatWeekLabel, buildDefaultSowingDots, DISPLAY_RANGE } from './chartUtils';
import { GARDEN_SPECIES_MAP } from '@core/data/species';

const SPECIES_TO_SHOW: Array<{ id: string; label: string; color: string }> = [
  { id: 'kale_red_russian', label: 'Kale', color: '#22c55e' },
  { id: 'lettuce_bss', label: 'Lettuce', color: '#a3e635' },
  { id: 'spinach_bloomsdale', label: 'Spinach', color: '#34d399' },
  { id: 'tomato_amish_paste', label: 'Paste', color: '#ef4444' },
  { id: 'tomato_sun_gold', label: 'Cherry', color: '#f97316' },
];

const SPECIES_COLOR_MAP = new Map(SPECIES_TO_SHOW.map(s => [s.label, s.color]));

interface ChartRow {
  week: string;
  [label: string]: number | string;
}

function buildFlavorData(env: ReturnType<typeof useWeatherSource>['env']): ChartRow[] {
  const rows: ChartRow[] = [];
  const day = new Date(DISPLAY_RANGE.start);
  const end = DISPLAY_RANGE.end;

  while (day <= end) {
    const cond = env.getConditions(day);
    const conditions: Record<string, number> = {
      temperature_f: cond.avg_high_f,
      soil_temp_f: cond.soil_temp_f,
      photoperiod_h: cond.photoperiod_h,
      sun_hours: cond.sunshine_hours ?? 8,
    };

    const row: ChartRow = { week: formatWeekLabel(day) };

    for (const spec of SPECIES_TO_SHOW) {
      const species = GARDEN_SPECIES_MAP.get(spec.id);
      if (!species?.flavor_response) {
        row[spec.label] = 0;
        continue;
      }
      row[spec.label] = +computeFlavorScore(species, conditions).toFixed(3);
    }

    rows.push(row);
    day.setDate(day.getDate() + 7);
  }

  return rows;
}

function FlavorTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-600 rounded p-2 text-xs shadow-lg">
      <div className="text-gray-300 font-semibold mb-1">{label}</div>
      {payload
        .filter((p: any) => p.value > 0)
        .sort((a: any, b: any) => b.value - a.value)
        .map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.dataKey}</span>
            <span className="text-gray-200 font-mono">{(p.value * 100).toFixed(0)}%</span>
          </div>
        ))}
    </div>
  );
}

export function FlavorTimeline({ env: envProp }: { env?: import('@core/environment/types').ConditionsResolver } = {}) {
  const { env: defaultEnv } = useWeatherSource();
  const env = envProp ?? defaultEnv;
  const chartData = useMemo(() => buildFlavorData(env), [env]);
  const sowingDots = useMemo(() => buildDefaultSowingDots(SPECIES_COLOR_MAP), []);
  const { onLegendEnter, onLegendLeave, seriesOpacity } = useLegendHighlight();

  if (chartData.length === 0) {
    return <div className="bg-gray-900 p-4"><p className="text-gray-400 text-xs">No data</p></div>;
  }

  return (
    <div className="bg-gray-900 p-4 h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="week" stroke="#9ca3af" tick={{ fontSize: 10 }} interval={3} />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 10 }}
              domain={[0, 1]}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              label={{ value: 'quality', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#9ca3af', offset: 10 }}
            />
            <Tooltip content={<FlavorTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '10px', cursor: 'pointer' }}
              iconType="line"
              iconSize={12}
              onMouseEnter={onLegendEnter}
              onMouseLeave={onLegendLeave}
            />
            <ReferenceLine y={0.7} stroke="#374151" strokeDasharray="2 4"
              label={{ value: 'Good', fill: '#6b7280', fontSize: 9, position: 'left' }} />
            {sowingDots.map((dot) => (
              <ReferenceDot
                key={`sow-${dot.weekLabel}-${dot.group}`}
                x={dot.weekLabel} y={0} r={5}
                fill={dot.color} stroke="#1f2937" strokeWidth={1}
              />
            ))}
            {SPECIES_TO_SHOW.map(spec => {
              const opacity = seriesOpacity(spec.label);
              return (
                <Line
                  key={spec.id}
                  type="monotone"
                  dataKey={spec.label}
                  stroke={spec.color}
                  strokeWidth={2}
                  strokeOpacity={opacity.strokeOpacity}
                  dot={false}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
