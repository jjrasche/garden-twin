/**
 * Integration test: Economics tab data pipeline.
 *
 * Verifies the exact same code path ProfitTimeline.tsx uses:
 * simulation → extract harvest/labor → computeProfitability → render data.
 */

import { describe, test, expect } from 'vitest';
import { computeProfitability } from '../../src/core/calculators/Profitability';
import { extractHarvestLbs, extractLaborHours, extractAreaFractions } from '../../src/core/calculators/extractSimulationData';
import { EXPENDITURES_2026, MARKET_PRICES_2026, SALES_CONFIG, PICKUP_OPERATION } from '../../src/core/data/expenditures-2026';
import { GARDEN_SPECIES_MAP } from '../../src/core/data/species';
import { createGardenStateFromPlan } from '../../src/core/data/sampleGarden';
import { PRODUCTION_PLAN, SEASON_RANGE } from '../../src/core/calculators/ProductionTimeline';
import { simulateWithTasks } from '../../src/core/engine/simulate';
import { createGrandRapidsHistorical } from '../../src/core/environment/HistoricalSource';
import { LIFECYCLE_SPECS } from '../../src/core/data/lifecycle';
import { DEFAULT_RULES } from '../../src/core/types/Rules';

describe('Economics tab data pipeline', () => {
  test('produces profitability for all harvested species', () => {
    const gardenState = createGardenStateFromPlan(PRODUCTION_PLAN);
    const env = createGrandRapidsHistorical();
    const snapshots = simulateWithTasks(gardenState, {
      catalog: GARDEN_SPECIES_MAP,
      env,
      dateRange: SEASON_RANGE,
      lifecycles: LIFECYCLE_SPECS,
      rules: DEFAULT_RULES,
    });

    const harvestLbs = extractHarvestLbs(snapshots);
    const laborHours = extractLaborHours(snapshots);

    const results = computeProfitability({
      expenditures: EXPENDITURES_2026,
      marketPrices: MARKET_PRICES_2026,
      harvestLbs,
      laborHours,
      areaFractions: extractAreaFractions(gardenState),
      salesConfigs: SALES_CONFIG,
      pickupOperation: PICKUP_OPERATION,
    });

    // Should have results for species that have market prices
    expect(results.length).toBeGreaterThan(0);

    // All results should have valid numbers (no NaN)
    for (const r of results) {
      expect(r.revenue).not.toBeNaN();
      expect(r.costs.total).not.toBeNaN();
      expect(r.profit).not.toBeNaN();
      expect(r.labor_hours).not.toBeNaN();
      expect(r.delivered_profit_per_hour).not.toBeNaN();
    }

    // Potato should be profitable
    const potato = results.find(r => r.species_id === 'potato_kennebec');
    expect(potato).toBeDefined();
    expect(potato!.harvest_lbs).toBeGreaterThan(0);
    expect(potato!.profit).toBeGreaterThan(0);

    // Sold species should have packaging labor > 0
    const potatoSales = potato!.sales;
    expect(potatoSales.sold_lbs).toBeGreaterThan(0);
    expect(potatoSales.packaging_labor_hours).toBeGreaterThan(0);
    // Delivered $/hr should be lower than farm-gate (packaging adds labor)
    expect(potato!.delivered_profit_per_hour).toBeLessThan(potato!.profit_per_hour);

    // Total farm-gate revenue in reasonable range
    const totalRevenue = results.reduce((s, r) => s + r.revenue, 0);
    expect(totalRevenue).toBeGreaterThan(1500);
    expect(totalRevenue).toBeLessThan(3500);

    // Log for debugging
    console.log('\n=== Economics Tab Verified (pickup model) ===');
    for (const r of results) {
      const name = GARDEN_SPECIES_MAP.get(r.species_id)?.name ?? r.species_id;
      const fg = isFinite(r.profit_per_hour) ? `$${Math.round(r.profit_per_hour)}/hr` : '--';
      const del = isFinite(r.delivered_profit_per_hour) ? `$${Math.round(r.delivered_profit_per_hour)}/hr` : '--';
      const sold = Math.round(r.sales.sold_lbs);
      const pkg = r.sales.packaging_labor_hours.toFixed(1);
      console.log(`  ${name.padEnd(25)} farm:${fg.padStart(7)}  pickup:${del.padStart(7)}  sell:${sold}lbs  pkg:${pkg}h`);
    }
  });
});
