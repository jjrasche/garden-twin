/**
 * Open-Meteo API client for Grand Rapids, MI weather data.
 *
 * Three endpoints, identical response shape:
 *   - archive: 1940 to ~5 days ago (ERA5 reanalysis)
 *   - historical-forecast: last 5 days (fills gap)
 *   - forecast: today + 14 days
 *
 * No API key required. Free tier: 10,000 calls/day.
 */

import { WeatherEntry } from './types';

const LAT = 42.9634;
const LON = -85.6681;
const TZ = 'America%2FNew_York';
const BASE_PARAMS = 'temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration,shortwave_radiation_sum,et0_fao_evapotranspiration,wind_speed_10m_max,wind_gusts_10m_max';
const BASE_QS = `latitude=${LAT}&longitude=${LON}&temperature_unit=fahrenheit&timezone=${TZ}`;
// soil_temperature_6cm_mean only available on forecast endpoint, not archive
const ARCHIVE_QS = `${BASE_QS}&daily=${BASE_PARAMS}`;
const FORECAST_QS = `${BASE_QS}&daily=${BASE_PARAMS},soil_temperature_6cm_mean`;

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum?: number[];
  sunshine_duration?: number[];
  shortwave_radiation_sum?: number[];
  et0_fao_evapotranspiration?: number[];
  soil_temperature_6cm_mean?: number[];
  wind_speed_10m_max?: number[];
  wind_gusts_10m_max?: number[];
}

interface OpenMeteoResponse {
  daily: OpenMeteoDaily;
}

function parseEntries(data: OpenMeteoDaily, source: WeatherEntry['source']): WeatherEntry[] {
  return data.time.map((date, i) => ({
    date,
    high_f: data.temperature_2m_max[i]!,
    low_f: data.temperature_2m_min[i]!,
    ...(data.precipitation_sum?.[i] != null ? { precipitation_in: data.precipitation_sum[i]! / 25.4 } : {}),
    ...(data.sunshine_duration?.[i] != null ? { sunshine_hours: data.sunshine_duration[i]! / 3600 } : {}),
    ...(data.shortwave_radiation_sum?.[i] != null ? { solar_radiation_mj: data.shortwave_radiation_sum[i]! } : {}),
    ...(data.et0_fao_evapotranspiration?.[i] != null ? { et0_in: data.et0_fao_evapotranspiration[i]! / 25.4 } : {}),
    ...(data.soil_temperature_6cm_mean?.[i] != null ? { soil_temp_f: data.soil_temperature_6cm_mean[i]! } : {}),
    ...(data.wind_speed_10m_max?.[i] != null ? { wind_speed_mph: data.wind_speed_10m_max[i]! * 2.237 } : {}),
    ...(data.wind_gusts_10m_max?.[i] != null ? { wind_gust_mph: data.wind_gusts_10m_max[i]! * 2.237 } : {}),
    source,
  }));
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fetch historical daily weather (archive endpoint, up to ~5 days ago). */
export async function fetchHistorical(startDate: Date, endDate: Date): Promise<WeatherEntry[]> {
  const url = `https://archive-api.open-meteo.com/v1/archive?${ARCHIVE_QS}&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo archive ${resp.status}: ${await resp.text()}`);
  const json: OpenMeteoResponse = await resp.json();
  return parseEntries(json.daily, 'api');
}

/** Fetch forecast daily weather (today + 14 days). */
export async function fetchForecast(): Promise<WeatherEntry[]> {
  const url = `https://api.open-meteo.com/v1/forecast?${FORECAST_QS}&forecast_days=14`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo forecast ${resp.status}: ${await resp.text()}`);
  const json: OpenMeteoResponse = await resp.json();
  return parseEntries(json.daily, 'api');
}

/**
 * Fetch full season weather: historical through today + 14-day forecast.
 * Merges both into a single WeatherEntry[] (forecast wins on overlap).
 */
export async function fetchSeasonWeather(seasonStart: Date): Promise<WeatherEntry[]> {
  const today = new Date();
  const archiveEnd = new Date(today);
  archiveEnd.setDate(archiveEnd.getDate() - 5);

  const requests: Promise<WeatherEntry[]>[] = [];

  if (seasonStart < archiveEnd) {
    requests.push(fetchHistorical(seasonStart, archiveEnd));
  }
  requests.push(fetchForecast());

  const results = await Promise.all(requests);
  const byDate = new Map<string, WeatherEntry>();

  // Historical first, forecast overwrites overlapping dates
  for (const entries of results) {
    for (const entry of entries) {
      byDate.set(entry.date, entry);
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
