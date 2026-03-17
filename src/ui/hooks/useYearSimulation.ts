/**
 * Manages year selection, weather fetching, and season simulation.
 *
 * Returns pre-computed DaySnapshot[] for the selected year's conditions.
 * Scrubbing the timeline just indexes into this array — no re-simulation.
 *
 * Data sources by year:
 *   "average"  → createGrandRapidsHistorical() (instant, no fetch)
 *   "2025"     → fetchSeasonWeather() composite (observed + forecast + historical fallback)
 *   2020-2024  → fetchYearWeather() archive (remapped to 2025 calendar)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ConditionsResolver } from '@core/environment/types';
import type { GardenState } from '@core/types/GardenState';
import type { DaySnapshot } from '@core/engine/simulate';
import { createGrandRapidsHistorical } from '@core/environment/HistoricalSource';
import {
  fetchSeasonWeather,
  createObservedSource,
  createCompositeSource,
  buildObservedDateSet,
} from '@core/environment';
import { fetchYearWeather, remapToTargetYear, buildSource } from '@core/calculators/WeatherBacktest';
import { simulateFromState } from '@core/engine/simulate';
import { GARDEN_SPECIES_MAP } from '@core/data/species';
import { SEASON_RANGE } from '@core/calculators/ProductionTimeline';

export type YearSelection = 'average' | 2020 | 2021 | 2022 | 2023 | 2024 | 2025;

export const SELECTABLE_YEARS: YearSelection[] = ['average', 2025, 2024, 2023, 2022, 2021, 2020];

export interface YearSimulationResult {
  selectedYear: YearSelection;
  selectYear: (year: YearSelection) => void;
  snapshots: DaySnapshot[];
  env: ConditionsResolver | null;
  isLoading: boolean;
  seasonStart: Date;
  seasonEnd: Date;
}

interface CachedSimulation {
  snapshots: DaySnapshot[];
  env: ConditionsResolver;
}

const historical = createGrandRapidsHistorical();

export function useYearSimulation(gardenState: GardenState | null): YearSimulationResult {
  const [selectedYear, setSelectedYear] = useState<YearSelection>(2025);
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState<CachedSimulation | null>(null);
  const cache = useRef(new Map<YearSelection, CachedSimulation>());

  const runSimulation = useCallback((env: ConditionsResolver, state: GardenState): DaySnapshot[] => {
    return simulateFromState(state, GARDEN_SPECIES_MAP, env, SEASON_RANGE);
  }, []);

  useEffect(() => {
    if (!gardenState) return;

    const cached = cache.current.get(selectedYear);
    if (cached) {
      setCurrent(cached);
      return;
    }

    let cancelled = false;

    async function loadAndSimulate() {
      setIsLoading(true);

      try {
        let env: ConditionsResolver;

        if (selectedYear === 'average') {
          env = historical;
        } else if (selectedYear === 2025) {
          const entries = await fetchSeasonWeather(SEASON_RANGE.start);
          const observed = createObservedSource(entries);
          const dates = buildObservedDateSet(entries);
          env = createCompositeSource(observed, historical, dates);
        } else {
          const raw = await fetchYearWeather(selectedYear);
          const entries = remapToTargetYear(raw, 2025);
          env = buildSource(entries);
        }

        if (cancelled) return;

        const snapshots = runSimulation(env, gardenState!);
        const result = { snapshots, env };
        cache.current.set(selectedYear, result);
        setCurrent(result);
      } catch (err) {
        console.warn(`[simulation] Failed to load ${selectedYear}:`, (err as Error).message);
        // Fall back to historical averages
        if (!cancelled) {
          const snapshots = runSimulation(historical, gardenState!);
          const result = { snapshots, env: historical };
          setCurrent(result);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    // "average" is synchronous — no fetch needed
    if (selectedYear === 'average') {
      const snapshots = runSimulation(historical, gardenState);
      const result = { snapshots, env: historical };
      cache.current.set(selectedYear, result);
      setCurrent(result);
    } else {
      loadAndSimulate();
    }

    return () => { cancelled = true; };
  }, [selectedYear, gardenState, runSimulation]);

  return {
    selectedYear,
    selectYear: setSelectedYear,
    snapshots: current?.snapshots ?? [],
    env: current?.env ?? null,
    isLoading,
    seasonStart: SEASON_RANGE.start,
    seasonEnd: SEASON_RANGE.end,
  };
}
