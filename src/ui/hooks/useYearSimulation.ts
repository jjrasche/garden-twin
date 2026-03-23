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
import { AVAILABLE_YEARS } from '@core/environment/HistoricalSource';
import { simulateFromState } from '@core/engine/simulate';
import { GARDEN_SPECIES_MAP } from '@core/data/species';
import { SEASON_RANGE } from '@core/calculators/ProductionTimeline';

export type YearSelection = 'average' | number;

export const SELECTABLE_YEARS: YearSelection[] = ['average', ...([...AVAILABLE_YEARS].reverse())];

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
          // 2025 live: fetch observed weather from Open-Meteo, composite with historical fallback
          const entries = await fetchSeasonWeather(SEASON_RANGE.start);
          const observed = createObservedSource(entries);
          const dates = buildObservedDateSet(entries);
          env = createCompositeSource(observed, historical, dates);
        } else {
          // Past years: use local GHCN-Daily data
          env = createGrandRapidsHistorical(selectedYear as number);
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

    // All years use local GHCN-Daily data — no fetch needed
    if (selectedYear === 'average') {
      const snapshots = runSimulation(historical, gardenState);
      const result = { snapshots, env: historical };
      cache.current.set(selectedYear, result);
      setCurrent(result);
    } else if (typeof selectedYear === 'number' && AVAILABLE_YEARS.includes(selectedYear as any)) {
      const yearEnv = createGrandRapidsHistorical(selectedYear);
      const snapshots = runSimulation(yearEnv, gardenState);
      const result = { snapshots, env: yearEnv };
      cache.current.set(selectedYear, result);
      setCurrent(result);
    } else {
      // Future year (2025+) — try live fetch, fall back to historical
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
