/**
 * Tooltip shown when hovering over a plant on the garden map.
 *
 * Displays PlantState detail: species, stage, GDD, biomass, stress.
 */

import React from 'react';
import type { PlantState } from '@core/types/PlantState';
import type { PlantSpecies } from '@core/types/PlantSpecies';

interface PlantTooltipProps {
  plant: PlantState;
  species: PlantSpecies | undefined;
  x: number;
  y: number;
}

export function PlantTooltip({ plant, species, x, y }: PlantTooltipProps) {
  const name = species?.name ?? plant.species_id;

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: x + 12, top: y - 8 }}
    >
      <div className="bg-gray-900 border border-gray-600 rounded px-2.5 py-1.5 shadow-lg text-xs max-w-56">
        <div className="font-semibold text-gray-100 mb-1">{name}</div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
          <span className="text-gray-500">Stage</span>
          <span className="text-gray-200">{plant.stage}</span>

          <span className="text-gray-500">GDD</span>
          <span className="text-gray-200 font-mono">{plant.accumulated_gdd.toFixed(0)}</span>

          <span className="text-gray-500">Biomass</span>
          <span className="text-gray-200 font-mono">{plant.accumulated_lbs.toFixed(3)} lbs</span>

          <span className="text-gray-500">Vigor</span>
          <span className="text-gray-200 font-mono">{(plant.vigor * 100).toFixed(0)}%</span>

          <span className="text-gray-500">Cut #</span>
          <span className="text-gray-200 font-mono">{plant.cut_number}</span>

          {plant.is_harvestable && (
            <>
              <span className="text-emerald-500">Harvestable</span>
              <span className="text-emerald-400">Yes</span>
            </>
          )}

          {plant.is_dead && (
            <>
              <span className="text-red-500">Dead</span>
              <span className="text-red-400">Yes</span>
            </>
          )}
        </div>

        {(plant.stress.drought_days > 0 || plant.stress.waterlog_days > 0 || plant.stress.heat_days > 0) && (
          <div className="mt-1 pt-1 border-t border-gray-700">
            <span className="text-[10px] text-gray-500">Stress: </span>
            {plant.stress.drought_days > 0 && (
              <span className="text-[10px] text-amber-400 mr-1">drought {plant.stress.drought_days}d</span>
            )}
            {plant.stress.heat_days > 0 && (
              <span className="text-[10px] text-red-400 mr-1">heat {plant.stress.heat_days}d</span>
            )}
            {plant.stress.waterlog_days > 0 && (
              <span className="text-[10px] text-blue-400">waterlog {plant.stress.waterlog_days}d</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
