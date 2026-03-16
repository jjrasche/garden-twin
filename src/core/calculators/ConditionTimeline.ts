/**
 * Compute weekly growth-condition modifiers for visualization.
 *
 * Shows how temperature, sunshine, and moisture each affect growth
 * for cool-season vs warm-season crops. Each modifier is 0-1 where
 * 1.0 = optimal conditions for that factor.
 */

import type { EnvironmentSource } from '../environment/types';
import { computeEffectiveSunHours } from '../environment/ShadeModel';
import { interpolate } from './interpolate';
import { LETTUCE_BSS } from '../data/gardenSpecies';
import { TOMATO_AMISH_PASTE } from '../data/gardenSpecies';
import { MS_PER_DAY, SHADE_TREE_HEIGHT_FT, ZONE_PHYS_Y } from './growthMath';

export interface WeeklyConditionRow {
  week: string;
  week_start: Date;
  // Raw conditions (weekly averages)
  avg_high_f: number;
  avg_low_f: number;
  avg_sunshine_hours: number;
  avg_solar_radiation_mj: number;
  avg_moisture_pct: number;
  // Per-factor modifiers (0-1), two crop groups
  temp_cool: number;
  temp_warm: number;
  sun_cool: number;
  sun_warm: number;
  moisture_cool: number;
  moisture_warm: number;
  // Combined product
  combined_cool: number;
  combined_warm: number;
}

function formatWeekLabel(date: Date): string {
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

function computeModifier(
  curve: Record<string, number> | undefined,
  value: number | undefined,
): number {
  if (!curve || value === undefined) return 1.0;
  return interpolate(curve, value);
}

/** Compute weekly condition modifiers for the growing season. */
export function computeConditionTimeline(
  env: EnvironmentSource,
  seasonStart: Date,
  seasonEnd: Date,
): WeeklyConditionRow[] {
  const rows: WeeklyConditionRow[] = [];
  const cool = LETTUCE_BSS;
  const warm = TOMATO_AMISH_PASTE;

  const current = new Date(seasonStart);
  while (current < seasonEnd) {
    const weekEnd = new Date(current.getTime() + 7 * MS_PER_DAY);

    // Sample each day of the week
    let sumHigh = 0, sumLow = 0, sumSun = 0, sumRadiation = 0, sumMoisture = 0;
    let sumTempCool = 0, sumTempWarm = 0;
    let sumSunCool = 0, sumSunWarm = 0;
    let sumMoistCool = 0, sumMoistWarm = 0;
    let days = 0;

    const day = new Date(current);
    while (day < weekEnd && day < seasonEnd) {
      const cond = env.getConditions(day);

      const coolSunHours = computeEffectiveSunHours(ZONE_PHYS_Y.shade, day, SHADE_TREE_HEIGHT_FT, cond.sunshine_hours);
      const warmSunHours = computeEffectiveSunHours(ZONE_PHYS_Y.full_sun, day, SHADE_TREE_HEIGHT_FT, cond.sunshine_hours);

      sumHigh += cond.avg_high_f;
      sumLow += cond.avg_low_f;
      sumSun += cond.sunshine_hours ?? 8;
      sumRadiation += cond.solar_radiation_mj ?? 0;
      sumMoisture += cond.soil_moisture_pct_fc ?? 80;

      sumTempCool += computeModifier(cool.modifiers.temperature_f, cond.avg_high_f);
      sumTempWarm += computeModifier(warm.modifiers.temperature_f, cond.avg_high_f);
      sumSunCool += interpolate(cool.modifiers.sun, coolSunHours);
      sumSunWarm += interpolate(warm.modifiers.sun, warmSunHours);
      sumMoistCool += computeModifier(cool.modifiers.soil_moisture_pct_fc, cond.soil_moisture_pct_fc);
      sumMoistWarm += computeModifier(warm.modifiers.soil_moisture_pct_fc, cond.soil_moisture_pct_fc);

      days++;
      day.setDate(day.getDate() + 1);
    }

    if (days > 0) {
      const tc = sumTempCool / days, tw = sumTempWarm / days;
      const sc = sumSunCool / days, sw = sumSunWarm / days;
      const mc = sumMoistCool / days, mw = sumMoistWarm / days;

      rows.push({
        week: formatWeekLabel(current),
        week_start: new Date(current),
        avg_high_f: +(sumHigh / days).toFixed(1),
        avg_low_f: +(sumLow / days).toFixed(1),
        avg_sunshine_hours: +(sumSun / days).toFixed(1),
        avg_solar_radiation_mj: +(sumRadiation / days).toFixed(1),
        avg_moisture_pct: +(sumMoisture / days).toFixed(0),
        temp_cool: +tc.toFixed(2), temp_warm: +tw.toFixed(2),
        sun_cool: +sc.toFixed(2), sun_warm: +sw.toFixed(2),
        moisture_cool: +mc.toFixed(2), moisture_warm: +mw.toFixed(2),
        combined_cool: +(tc * sc * mc).toFixed(2),
        combined_warm: +(tw * sw * mw).toFixed(2),
      });
    }

    current.setDate(current.getDate() + 7);
  }

  return rows;
}
