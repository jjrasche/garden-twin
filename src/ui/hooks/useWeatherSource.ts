/**
 * Hook that fetches real weather from Open-Meteo and returns a CompositeSource.
 *
 * Starts with GR_HISTORICAL (instant, no network). Upgrades to composite
 * (observed + historical fallback) once the fetch completes.
 */

import { useState, useEffect } from 'react';
import type { ConditionsResolver } from '@core/environment';
import {
  createGrandRapidsHistorical,
  createObservedSource,
  createCompositeSource,
  buildObservedDateSet,
  fetchSeasonWeather,
} from '@core/environment';

const historical = createGrandRapidsHistorical();
const SEASON_START = new Date('2025-04-14');

export function useWeatherSource(): { env: ConditionsResolver; isLive: boolean } {
  const [env, setEnv] = useState<ConditionsResolver>(historical);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchSeasonWeather(SEASON_START)
      .then(entries => {
        if (cancelled) return;
        const observed = createObservedSource(entries);
        const dates = buildObservedDateSet(entries);
        const composite = createCompositeSource(observed, historical, dates);
        setEnv(composite);
        setIsLive(true);
        console.log(`[weather] Loaded ${entries.length} days from Open-Meteo`);
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('[weather] Open-Meteo fetch failed, using historical averages:', err.message);
      });

    return () => { cancelled = true; };
  }, []);

  return { env, isLive };
}
