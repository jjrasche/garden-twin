/**
 * Growth modifier timeline — shows the combined growth_mod for each species
 * over the season. growth_mod = product of all growth_rate response curves
 * (temperature, sun, moisture, soil nutrients, spacing).
 *
 * This is what controls how fast each species accumulates biomass and
 * therefore how quickly cut-and-come-again regrowth reaches harvest threshold.
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
import { formatWeekLabel, buildDefaultSowingDots, CHART_RANGE } from './chartUtils';
import { useWeatherSource } from '../../hooks/useWeatherSource';
import { useLegendHighlight } from '../../hooks/useLegendHighlight';
import { computeGrowthModifier } from '@core/calculators/yieldModel';
import { GARDEN_SPECIES_MAP } from '@core/data/species';

const SPECIES_TO_SHOW: Array<{ id: string; label: string; color: string }> = [
  { id: 'kale_red_russian', label: 'Kale', color: '#22c55e' },
  { id: 'lettuce_bss', label: 'Lettuce', color: '#a3e635' },
  { id: 'spinach_bloomsdale', label: 'Spinach', color: '#34d399' },
  { id: 'tomato_amish_paste', label: 'Paste', color: '#ef4444' },
  { id: 'tomato_sun_gold', label: 'Cherry', color: '#f97316' },
  { id: 'corn_nothstine_dent', label: 'Corn', color: '#eab308' },
  { id: 'potato_kennebec', label: 'Potato', color: '#a78bfa' },
];

interface ChartRow {
  week: string;
  [speciesLabel: string]: number | string;
}

function buildGrowthModData(env: ReturnType<typeof useWeatherSource>['env']): ChartRow[] {
  const rows: ChartRow[] = [];
  const day = new Date(CHART_RANGE.start);
  const end = CHART_RANGE.end;

  // Sample weekly (every 7 days)
  while (day <= end) {
    const cond = env.getConditions(day);
    const conditions: Record<string, number> = {
      temperature_f: cond.avg_high_f,
      soil_temp_f: cond.soil_temp_f,
      photoperiod_h: cond.photoperiod_h,
      sun_hours: cond.sunshine_hours ?? 8,
    };
    if (cond.soil_moisture_pct_fc !== undefined) {
      conditions.soil_moisture_pct_fc = cond.soil_moisture_pct_fc;
    }

    const row: ChartRow = { week: formatWeekLabel(day) };

    for (const spec of SPECIES_TO_SHOW) {
      const species = GARDEN_SPECIES_MAP.get(spec.id);
      if (!species?.growth_response) {
        row[spec.label] = 0;
        continue;
      }
      const mod = computeGrowthModifier(species.growth_response, conditions);
      row[spec.label] = +mod.toFixed(3);
    }

    rows.push(row);
    day.setDate(day.getDate() + 7);
  }

  return rows;
}

const SPECIES_COLOR_MAP = new Map(SPECIES_TO_SHOW.map(s => [s.label, s.color]));

function GrowthModTooltip({ active, payload, label }: any) {
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

export function GrowthModTimeline() {
  const { env } = useWeatherSource();
  const chartData = useMemo(() => buildGrowthModData(env), [env]);
  const sowingDots = useMemo(() => buildDefaultSowingDots(SPECIES_COLOR_MAP), []);
  const { onLegendEnter, onLegendLeave, seriesOpacity } = useLegendHighlight();

  if (chartData.length === 0) {
    return (
      <div className="bg-gray-900 p-4">
        <p className="text-gray-400 text-xs">No data</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-4 h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="week"
              stroke="#9ca3af"
              tick={{ fontSize: 10 }}
              interval={3}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 10 }}
              domain={[0, 1.1]}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              label={{
                value: 'growth mod',
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
                fill: '#9ca3af',
                offset: 10,
              }}
            />
            <Tooltip content={<GrowthModTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '10px', cursor: 'pointer' }}
              iconType="line"
              iconSize={12}
              onMouseEnter={onLegendEnter}
              onMouseLeave={onLegendLeave}
            />
            <ReferenceLine
              y={1.0}
              stroke="#4b5563"
              strokeDasharray="4 4"
            />
            <ReferenceLine
              y={0.5}
              stroke="#374151"
              strokeDasharray="2 4"
              label={{ value: '50%', fill: '#6b7280', fontSize: 9, position: 'left' }}
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
            {SPECIES_TO_SHOW.map(spec => {
              const opacity = seriesOpacity(spec.label);
              return (
                <Line
                  key={spec.id}
                  type="monotone"
                  dataKey={spec.label}
                  stroke={spec.color}
                  strokeWidth={1.5}
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
