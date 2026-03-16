/** Garden-wide conditions at a point in time (time-varying, same everywhere in garden) */
export interface WeeklyConditions {
  week_start: Date;
  avg_high_f: number;
  avg_low_f: number;
  soil_temp_f: number;      // Estimated soil temp at 4" depth under mulch
  photoperiod_h: number;
  sunshine_hours?: number;         // Actual sun hours (clouds reduce from photoperiod)
  solar_radiation_mj?: number;     // Shortwave radiation (MJ/m²/day)
  soil_moisture_pct_fc?: number;   // Soil moisture as % of field capacity (0-100+)
}

/** Single day of observed weather data. */
export interface WeatherEntry {
  date: string;              // ISO date (YYYY-MM-DD)
  high_f: number;
  low_f: number;
  soil_temp_f?: number;      // Falls back to (high+low)/2 - 3
  precipitation_in?: number;
  sunshine_hours?: number;   // Actual sunshine duration (hours)
  solar_radiation_mj?: number; // Shortwave radiation (MJ/m²/day)
  et0_in?: number;           // Reference evapotranspiration (inches)
  source: 'manual' | 'api' | 'sensor';
}

/** Pluggable source of environmental conditions */
export interface EnvironmentSource {
  readonly source_type: 'historical' | 'observed' | 'forecast';
  readonly location: string;

  /** Average date of last spring frost (32°F) */
  readonly avg_last_frost: Date;
  /** Average date of first fall frost (32°F) */
  readonly avg_first_frost: Date;

  /** Conditions for a single date (interpolated from underlying data) */
  getConditions(date: Date): Omit<WeeklyConditions, 'week_start'>;

  /** Conditions for a date range, one entry per week */
  getWeeklyConditions(start: Date, end: Date): WeeklyConditions[];
}
