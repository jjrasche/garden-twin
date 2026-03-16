import React, { useMemo, useState, useEffect } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { computeConditionTimeline, type WeeklyConditionRow } from '../../../core/calculators/ConditionTimeline';
import { fetchYearWeather, remapToTargetYear, buildSource } from '../../../core/calculators/WeatherBacktest';

const SEASON_START = new Date('2025-04-14');
const SEASON_END = new Date('2025-12-15');
const AVAILABLE_YEARS = [2024, 2023, 2022, 2021, 2020] as const;
const YEAR_COLORS: Record<number, string> = {
  2024: '#60A5FA', // blue
  2023: '#F59E0B', // amber
  2022: '#A78BFA', // violet
  2021: '#34D399', // emerald
  2020: '#FB7185', // rose
};

type CropType = 'cool' | 'warm';

const PANEL_HEIGHT = 120;

interface MergedRow {
  week: string;
  [key: string]: number | string;
}

function mergeTimelines(
  byYear: Map<number, WeeklyConditionRow[]>,
  factor: string,
  cropType: CropType,
): MergedRow[] {
  const key = `${factor}_${cropType}`;
  const firstYear = byYear.values().next().value as WeeklyConditionRow[] | undefined;
  if (!firstYear) return [];

  return firstYear.map((row, i) => {
    const merged: MergedRow = { week: row.week };
    for (const [year, rows] of byYear) {
      merged[String(year)] = rows[i]?.[key as keyof WeeklyConditionRow] as number ?? 0;
    }
    return merged;
  });
}

function mergeRaw(
  byYear: Map<number, WeeklyConditionRow[]>,
  rawKey: string,
): MergedRow[] {
  const firstYear = byYear.values().next().value as WeeklyConditionRow[] | undefined;
  if (!firstYear) return [];

  return firstYear.map((row, i) => {
    const merged: MergedRow = { week: row.week };
    for (const [year, rows] of byYear) {
      merged[String(year)] = rows[i]?.[rawKey as keyof WeeklyConditionRow] as number ?? 0;
    }
    return merged;
  });
}

// ── Raw-value panel (temperature, radiation, moisture) ─────────────────────

interface RawPanelProps {
  data: MergedRow[];
  years: number[];
  title: string;
  domain: [number, number];
  unit: string;
  secondaryData?: MergedRow[];
  refLines?: { value: number; label: string }[];
}

function RawPanel({ data, years, title, domain, unit, secondaryData, refLines }: RawPanelProps) {
  const chartData = useMemo(() => {
    if (!secondaryData) return data;
    return data.map((row, i) => {
      const sec = secondaryData[i];
      if (!sec) return row;
      const merged = { ...row };
      for (const year of years) {
        merged[`lo_${year}`] = sec[String(year)] as number;
      }
      return merged;
    });
  }, [data, secondaryData, years]);

  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5 ml-12">{title}</div>
      <ResponsiveContainer width="100%" height={PANEL_HEIGHT}>
        <ComposedChart data={chartData} syncId="conditions" margin={{ left: 10, right: 10, top: 2, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#9CA3AF' }} interval={3} />
          <YAxis
            domain={domain}
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            tickFormatter={(v: number) => `${v}${unit}`}
            width={40}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', fontSize: 11 }}
            labelStyle={{ color: '#D1D5DB' }}
            formatter={(value: number, name: string) => {
              if (name.startsWith('lo_')) {
                return [`${value.toFixed(1)}${unit}`, `${name.slice(3)} Low`];
              }
              const label = secondaryData ? `${name} High` : name;
              return [`${value.toFixed(1)}${unit}`, label];
            }}
          />
          {refLines?.map(ref => (
            <ReferenceLine key={ref.value} y={ref.value} stroke="#4B5563" strokeDasharray="4 4" />
          ))}
          {years.map(year => (
            <Line
              key={year}
              type="monotone"
              dataKey={String(year)}
              stroke={YEAR_COLORS[year] ?? '#9CA3AF'}
              strokeWidth={1.5}
              dot={false}
              name={String(year)}
            />
          ))}
          {secondaryData && years.map(year => (
            <Line
              key={`lo_${year}`}
              type="monotone"
              dataKey={`lo_${year}`}
              stroke={YEAR_COLORS[year] ?? '#9CA3AF'}
              strokeWidth={1}
              strokeDasharray="3 2"
              strokeOpacity={0.5}
              dot={false}
              name={`lo_${year}`}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Modifier panel (combined growth potential) ─────────────────────────────

interface ModifierPanelProps {
  data: MergedRow[];
  years: number[];
  title: string;
}

function ModifierPanel({ data, years, title }: ModifierPanelProps) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5 ml-12">{title}</div>
      <ResponsiveContainer width="100%" height={PANEL_HEIGHT}>
        <ComposedChart data={data} syncId="conditions" margin={{ left: 10, right: 10, top: 2, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#9CA3AF' }} interval={3} />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.5, 1]}
            tick={{ fontSize: 9, fill: '#9CA3AF' }}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            width={40}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', fontSize: 11 }}
            labelStyle={{ color: '#D1D5DB' }}
            formatter={(value: number, name: string) => [`${(value * 100).toFixed(0)}%`, name]}
          />
          <ReferenceLine y={0.8} stroke="#4B5563" strokeDasharray="4 4" />
          {years.map(year => (
            <Line
              key={year}
              type="monotone"
              dataKey={String(year)}
              stroke={YEAR_COLORS[year] ?? '#9CA3AF'}
              strokeWidth={1.5}
              dot={false}
              name={String(year)}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConditionTimeline() {
  const [selectedYears, setSelectedYears] = useState<number[]>([2024]);
  const [cropType, setCropType] = useState<CropType>('warm');
  const [byYear, setByYear] = useState<Map<number, WeeklyConditionRow[]>>(new Map());
  const [loading, setLoading] = useState<Set<number>>(new Set());

  // Fetch weather data for selected years
  useEffect(() => {
    for (const year of selectedYears) {
      if (byYear.has(year) || loading.has(year)) continue;
      setLoading(prev => new Set(prev).add(year));

      fetchYearWeather(year)
        .then(raw => {
          const entries = remapToTargetYear(raw, 2025);
          const env = buildSource(entries);
          const timeline = computeConditionTimeline(env, SEASON_START, SEASON_END);
          setByYear(prev => new Map(prev).set(year, timeline));
        })
        .catch(err => console.warn(`[conditions] Failed to load ${year}:`, err.message))
        .finally(() => setLoading(prev => { const s = new Set(prev); s.delete(year); return s; }));
    }
  }, [selectedYears, byYear, loading]);

  const activeYears = selectedYears.filter(y => byYear.has(y));
  const activeData = useMemo(() => {
    const filtered = new Map<number, WeeklyConditionRow[]>();
    for (const y of activeYears) {
      const d = byYear.get(y);
      if (d) filtered.set(y, d);
    }
    return filtered;
  }, [activeYears, byYear]);

  const tempHigh = useMemo(() => mergeRaw(activeData, 'avg_high_f'), [activeData]);
  const tempLow = useMemo(() => mergeRaw(activeData, 'avg_low_f'), [activeData]);
  const radiation = useMemo(() => mergeRaw(activeData, 'avg_solar_radiation_mj'), [activeData]);
  const moisture = useMemo(() => mergeRaw(activeData, 'avg_moisture_pct'), [activeData]);
  const combinedData = useMemo(() => mergeTimelines(activeData, 'combined', cropType), [activeData, cropType]);

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year],
    );
  };

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center gap-4 mb-2 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-300">Growth Conditions</h2>

        <div className="flex items-center gap-1">
          {AVAILABLE_YEARS.map(year => (
            <button
              key={year}
              onClick={() => toggleYear(year)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                selectedYears.includes(year)
                  ? 'text-white border border-gray-500'
                  : 'text-gray-500 border border-gray-700 hover:border-gray-500'
              }`}
              style={selectedYears.includes(year) ? { backgroundColor: YEAR_COLORS[year] + '33', borderColor: YEAR_COLORS[year] } : undefined}
            >
              {year}
              {loading.has(year) && '...'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setCropType('cool')}
            className={`px-2 py-0.5 rounded ${cropType === 'cool' ? 'bg-green-800 text-green-200' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Cool-season
          </button>
          <button
            onClick={() => setCropType('warm')}
            className={`px-2 py-0.5 rounded ${cropType === 'warm' ? 'bg-red-900 text-red-200' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Warm-season
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {activeYears.map(year => (
            <span key={year} className="flex items-center gap-1">
              <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: YEAR_COLORS[year] }} />
              {year}
            </span>
          ))}
        </div>
      </div>

      {activeYears.length === 0 ? (
        <div className="text-gray-500 text-sm mt-8 text-center">Select a year to view conditions</div>
      ) : (
        <>
          <RawPanel data={tempHigh} years={activeYears} title="Temperature (°F)" domain={[20, 100]} unit="°F" secondaryData={tempLow} refLines={[{ value: 32, label: 'Frost' }]} />
          <RawPanel data={radiation} years={activeYears} title="Solar Radiation (MJ/m²/day)" domain={[0, 30]} unit=" MJ" />
          <RawPanel data={moisture} years={activeYears} title="Soil Moisture (% Field Capacity)" domain={[0, 100]} unit="%" />
          <ModifierPanel data={combinedData} years={activeYears} title="Combined Growth Potential" />
        </>
      )}
    </div>
  );
}
