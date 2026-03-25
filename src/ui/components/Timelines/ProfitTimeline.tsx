/**
 * Species Profitability — per-species economics from simulation data.
 *
 * Shows a ranked list of species by profit/hr. Click a row for detailed
 * cost breakdown modal.
 */

import React, { useMemo, useState } from 'react';
import type { DaySnapshot } from '@core/engine/simulate';
import type { SpeciesProfitability, CostLineItem, ChannelEconomics } from '@core/types/Expenditure';
import { computeProfitability, computeAreaFractions, computeAllDeliveredProfitability } from '@core/calculators/Profitability';
import { EXPENDITURES_2026, MARKET_PRICES_2026, DISTRIBUTION_CHANNELS, CHANNEL_ASSIGNMENTS_DEFAULT } from '@core/data/expenditures-2026';
import { GARDEN_SPECIES_MAP } from '@core/data/species';
import type { GardenState } from '@core/types/GardenState';

// ── Helpers ─────────────────────────────────────────────────────────────────

function speciesName(speciesId: string): string {
  const species = GARDEN_SPECIES_MAP.get(speciesId);
  return species?.name ?? speciesId.replace(/_/g, ' ');
}

function speciesIcon(speciesId: string): string {
  const species = GARDEN_SPECIES_MAP.get(speciesId);
  if (!species?.icon) return '';
  return typeof species.icon === 'string' ? species.icon : species.icon.emoji;
}

function formatDollars(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  if (Math.abs(amount) < 1) return `$${amount.toFixed(2)}`;
  return `$${Math.round(amount)}`;
}

function formatProfitPerHour(value: number): string {
  if (!isFinite(value)) return '--';
  if (value < 0) return `-$${Math.abs(Math.round(value))}/hr`;
  return `$${Math.round(value)}/hr`;
}

// ── Extract simulation data ─────────────────────────────────────────────────

function extractHarvestLbs(snapshots: DaySnapshot[]): Map<string, number> {
  const lbs = new Map<string, number>();
  for (const snap of snapshots) {
    for (const event of snap.events) {
      if (event.type !== 'harvest_ready') continue;
      const plant = snap.plants.find(p => p.plant_id === event.plant_id);
      if (!plant) continue;
      lbs.set(plant.species_id, (lbs.get(plant.species_id) ?? 0) + event.accumulated_lbs);
    }
  }
  return lbs;
}

function extractLaborHours(snapshots: DaySnapshot[]): Map<string, number> {
  const hours = new Map<string, number>();
  for (const snap of snapshots) {
    for (const task of snap.tasks ?? []) {
      const speciesId = task.parameters?.species_id as string | undefined;
      if (!speciesId) continue;
      const min = task.estimated_duration_minutes ?? 0;
      hours.set(speciesId, (hours.get(speciesId) ?? 0) + min / 60);
    }
  }
  return hours;
}

function extractAreaFractions(gardenState: GardenState | null): Map<string, number> {
  if (!gardenState) return new Map();
  const subcellCounts = new Map<string, number>();
  for (const plant of gardenState.plants) {
    const count = plant.occupied_subcells.length;
    subcellCounts.set(plant.species_id, (subcellCounts.get(plant.species_id) ?? 0) + count);
  }
  return computeAreaFractions(subcellCounts);
}

// ── Cost Detail Modal ───────────────────────────────────────────────────────

function CostDetailModal({ row, onClose }: { row: SpeciesProfitability; onClose: () => void }) {
  const groupedCosts = useMemo(() => {
    const groups = new Map<string, CostLineItem[]>();
    for (const item of row.cost_breakdown) {
      const items = groups.get(item.category) ?? [];
      items.push(item);
      groups.set(item.category, items);
    }
    return groups;
  }, [row.cost_breakdown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[90vw] max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">{speciesIcon(row.species_id)}</span>
            <div>
              <h3 className="text-sm font-semibold text-white">{speciesName(row.species_id)}</h3>
              <div className="text-xs text-gray-400">Season Economics</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg px-2">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Revenue */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Revenue</div>
            <div className="bg-gray-800/50 rounded px-3 py-2 flex justify-between items-center">
              <span className="text-xs text-gray-300">
                {Math.round(row.harvest_lbs)} lbs × {formatDollars(row.price_per_lb)}/lb
              </span>
              <span className="text-sm font-mono text-emerald-400">{formatDollars(row.revenue)}</span>
            </div>
          </div>

          {/* Costs by category */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              Costs (annual) — {formatDollars(row.costs.total)}
            </div>
            <div className="space-y-1">
              {[...groupedCosts.entries()].map(([category, items]) => {
                const categoryTotal = items.reduce((s, i) => s + i.allocated_cost, 0);
                if (categoryTotal < 0.01) return null;
                return (
                  <div key={category} className="bg-gray-800/50 rounded px-3 py-1.5">
                    <div className="flex justify-between items-center text-xs mb-0.5">
                      <span className="text-gray-400 capitalize">{category.replace(/_/g, ' ')}</span>
                      <span className="text-red-400 font-mono">-{formatDollars(categoryTotal)}</span>
                    </div>
                    {items.map(item => (
                      <div key={item.expenditure_id} className="flex justify-between text-[10px] text-gray-500 pl-2">
                        <span className="truncate mr-2">{item.name}</span>
                        <span className="font-mono shrink-0">
                          {item.annual_cost !== item.allocated_cost
                            ? `${formatDollars(item.annual_cost)} × ${Math.round((item.allocated_cost / item.annual_cost) * 100)}% = ${formatDollars(item.allocated_cost)}`
                            : formatDollars(item.allocated_cost)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribution channels */}
          {row.distribution.channels.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Distribution</div>
              <div className="space-y-1">
                {row.distribution.channels.map(ch => (
                  <div key={ch.channel_id} className="bg-gray-800/50 rounded px-3 py-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300">{ch.channel_name}</span>
                      <span className="text-gray-400 font-mono">{Math.round(ch.fraction * 100)}%</span>
                    </div>
                    {ch.harvest_lbs > 0 && (
                      <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                        <span>
                          {Math.round(ch.harvest_lbs)} lbs
                          {ch.effective_price_per_lb > 0 ? ` × ${formatDollars(ch.effective_price_per_lb)}/lb` : ''}
                        </span>
                        <span className="font-mono">
                          {ch.gross_revenue > 0 ? formatDollars(ch.gross_revenue) : 'consumed'}
                          {ch.packaging_cost > 0 ? ` - ${formatDollars(ch.packaging_cost)} pkg` : ''}
                        </span>
                      </div>
                    )}
                    {ch.packaging_labor_hours > 0 && (
                      <div className="text-[10px] text-gray-600">
                        +{ch.packaging_labor_hours.toFixed(1)} hrs packaging
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="border-t border-gray-700 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800/50 rounded px-3 py-2 text-center">
                <div className="text-[10px] text-gray-500">Farm-gate $/hr</div>
                <div className={`text-sm font-mono ${row.profit_per_hour >= 0 ? 'text-gray-400' : 'text-red-400'}`}>
                  {formatProfitPerHour(row.profit_per_hour)}
                </div>
              </div>
              <div className="bg-gray-800/50 rounded px-3 py-2 text-center">
                <div className="text-[10px] text-gray-500">Total labor</div>
                <div className="text-sm font-mono text-gray-200">{row.total_labor_hours.toFixed(1)} hrs</div>
              </div>
              <div className="bg-gray-800/50 rounded px-3 py-2 text-center col-span-2">
                <div className="text-[10px] text-gray-500">Delivered Profit/hr</div>
                <div className={`text-lg font-mono font-bold ${row.delivered_profit_per_hour >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatProfitPerHour(row.delivered_profit_per_hour)}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {formatDollars(row.delivered_profit)} profit on {Math.round(row.total_labor_hours)} hrs
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface ProfitTimelineProps {
  snapshots: DaySnapshot[];
  gardenState: GardenState | null;
}

export function ProfitTimeline({ snapshots, gardenState }: ProfitTimelineProps) {
  const [detailRow, setDetailRow] = useState<SpeciesProfitability | null>(null);

  const profitability = useMemo(() => {
    if (snapshots.length === 0 || !gardenState) return [];
    const farmGate = computeProfitability({
      expenditures: EXPENDITURES_2026,
      marketPrices: MARKET_PRICES_2026,
      harvestLbs: extractHarvestLbs(snapshots),
      laborHours: extractLaborHours(snapshots),
      areaFractions: extractAreaFractions(gardenState),
    });
    // Layer distribution economics — batch to share channel staffing costs
    const delivered = computeAllDeliveredProfitability(
      farmGate, DISTRIBUTION_CHANNELS, CHANNEL_ASSIGNMENTS_DEFAULT,
    );
    // Re-sort by delivered profit/hr
    delivered.sort((a, b) => b.delivered_profit_per_hour - a.delivered_profit_per_hour);
    return delivered;
  }, [snapshots, gardenState]);

  if (profitability.length === 0) {
    return (
      <div className="bg-gray-900 p-4">
        <p className="text-gray-400 text-xs">No profitability data — simulation may not include harvest events</p>
      </div>
    );
  }

  const totalDeliveredRevenue = profitability.reduce((s, r) => s + r.distribution.total_net_revenue, 0);
  const totalCost = profitability.reduce((s, r) => s + r.costs.total, 0);
  const totalDeliveredProfit = profitability.reduce((s, r) => s + r.delivered_profit, 0);
  const totalHours = profitability.reduce((s, r) => s + r.total_labor_hours, 0);
  const overallProfitPerHour = totalHours > 0 ? totalDeliveredProfit / totalHours : 0;

  // Max profit/hr for bar width scaling (exclude Infinity)
  const maxProfitHr = Math.max(
    ...profitability.filter(r => isFinite(r.delivered_profit_per_hour)).map(r => r.delivered_profit_per_hour),
    1,
  );

  return (
    <div className="bg-gray-900 p-4 h-full flex flex-col">
      {/* Summary header */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-3 text-xs text-gray-400">
        <span>Sold: <strong className="text-emerald-400">{formatDollars(totalDeliveredRevenue)}</strong></span>
        <span>Costs: <strong className="text-red-400">{formatDollars(totalCost)}</strong></span>
        <span>Profit: <strong className={totalDeliveredProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatDollars(totalDeliveredProfit)}</strong></span>
        <span>All labor: <strong className="text-white">{Math.round(totalHours)} hrs</strong></span>
        <span>Delivered: <strong className={overallProfitPerHour >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatProfitPerHour(overallProfitPerHour)}</strong></span>
      </div>

      {/* Species list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {profitability.map(row => {
          const barWidth = isFinite(row.delivered_profit_per_hour) && maxProfitHr > 0
            ? Math.max(0, Math.min(100, (row.delivered_profit_per_hour / maxProfitHr) * 100))
            : 0;

          return (
            <button
              key={row.species_id}
              onClick={() => setDetailRow(row)}
              className="grid grid-cols-[1.5rem_1fr_4rem_5rem_5rem_1rem] items-center gap-x-2 py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-750 text-sm text-left w-full transition-colors"
            >
              <span className="text-center">{speciesIcon(row.species_id)}</span>
              <div className="min-w-0">
                <div className="text-white text-xs truncate">{speciesName(row.species_id)}</div>
                <div className="relative h-1 mt-0.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${row.profit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-400 font-mono text-right">{Math.round(row.harvest_lbs)} lbs</span>
              <span className={`text-xs font-mono text-right ${row.delivered_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatDollars(row.delivered_profit)}
              </span>
              <span className={`text-xs font-mono font-bold text-right ${row.delivered_profit_per_hour >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatProfitPerHour(row.delivered_profit_per_hour)}
              </span>
              <span className="text-gray-600 text-xs">&rsaquo;</span>
            </button>
          );
        })}
      </div>

      {detailRow && (
        <CostDetailModal row={detailRow} onClose={() => setDetailRow(null)} />
      )}
    </div>
  );
}
