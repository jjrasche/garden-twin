/**
 * Unified season view — the single page for the garden twin.
 *
 * Composes CanvasGarden, TimelineScrubber, ConditionsPanel, and PlantTooltip.
 * The simulation runs once per year selection; scrubbing indexes into DaySnapshot[].
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { CanvasGarden } from '../GridLayout/CanvasGarden';
import { TimelineScrubber } from './TimelineScrubber';
import { ConditionsPanel } from './ConditionsPanel';
import { PlantTooltip } from './PlantTooltip';
import { HarvestTimeline } from '../Timelines/HarvestTimeline';
import { GrowthModTimeline } from '../Timelines/GrowthModTimeline';
import { FlavorTimeline } from '../Timelines/FlavorTimeline';

type BottomChart = 'none' | 'production' | 'growth' | 'flavor';
import { useYearSimulation, SELECTABLE_YEARS, type YearSelection } from '../../hooks/useYearSimulation';
import { useGardenStore } from '../../store/gardenStore';
import { GARDEN_SPECIES_MAP } from '@core/data/species';
import { screenToWorld } from '../../utils/canvasTransforms';
import { getStageColor } from '../../utils/plantIcons';
import { createGardenStateFromPlan } from '@core/data/sampleGarden';
import { PRODUCTION_PLAN } from '@core/calculators/ProductionTimeline';
import type { PlantState } from '@core/types/PlantState';

const SUBCELL_SIZE_IN = 3;

const YEAR_COLORS: Partial<Record<YearSelection, string>> = {
  2025: '#34d399',
  2024: '#60A5FA',
  2023: '#F59E0B',
  2022: '#A78BFA',
  2021: '#34D399',
  2020: '#FB7185',
};

/** Snap world position to subcell grid and return subcell_id. */
function resolveSubcellId(x_in: number, y_in: number): string {
  const snapped_x = Math.floor(x_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN;
  const snapped_y = Math.floor(y_in / SUBCELL_SIZE_IN) * SUBCELL_SIZE_IN;
  return `sub_${snapped_x}_${snapped_y}`;
}

/** Find the PlantState at a given subcell via the occupancy index. */
function findPlantAtSubcell(
  subcellId: string,
  plants: PlantState[],
  occupancyMap: Map<string, string>,
): PlantState | undefined {
  const plantId = occupancyMap.get(subcellId);
  if (!plantId) return undefined;
  return plants.find(p => p.plant_id === plantId);
}

/**
 * Build subcell_id → stage color map from the current snapshot.
 *
 * Uses the spatial occupancy from gardenState (which subcells each plant covers)
 * and the simulated stage from the DaySnapshot (which stage each plant is in).
 */
function buildStageColorMap(
  snapshot: { plants: PlantState[] },
  occupancyMap: Map<string, string>,
  plantStateIndex: Map<string, PlantState>,
): Map<string, string> {
  const colors = new Map<string, string>();
  for (const [subcellId, plantId] of occupancyMap) {
    const state = plantStateIndex.get(plantId);
    if (!state) continue;
    colors.set(subcellId, getStageColor(state.species_id, state.stage, state.is_dead));
  }
  return colors;
}

export function SeasonView() {
  const gardenState = useGardenStore(s => s.gardenState);
  const setGardenState = useGardenStore(s => s.setGardenState);
  const viewport = useGardenStore(s => s.viewport);
  const [bottomChart, setBottomChart] = useState<BottomChart>('none');

  // Ensure gardenState is initialized
  useEffect(() => {
    if (!gardenState) {
      setGardenState(createGardenStateFromPlan(PRODUCTION_PLAN));
    }
  }, [gardenState, setGardenState]);

  const sim = useYearSimulation(gardenState);
  const [dayIndex, setDayIndex] = useState(0);
  const [hoverPlant, setHoverPlant] = useState<{ plant: PlantState; x: number; y: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const stageColorRef = useRef<Map<string, string>>(new Map());

  const currentSnapshot = sim.snapshots[dayIndex] ?? null;

  // Build subcell_id → plant_id map from gardenState (spatial positions)
  const occupancyMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!gardenState) return map;
    for (const plant of gardenState.plants) {
      for (const sid of plant.occupied_subcells) {
        map.set(sid, plant.plant_id);
      }
    }
    return map;
  }, [gardenState]);

  // Build plant_id → PlantState index from current snapshot
  const plantStateIndex = useMemo(() => {
    const map = new Map<string, PlantState>();
    if (!currentSnapshot) return map;
    for (const p of currentSnapshot.plants) {
      map.set(p.plant_id, p);
    }
    return map;
  }, [currentSnapshot]);

  // Update stage color ref whenever snapshot changes
  useEffect(() => {
    if (currentSnapshot) {
      stageColorRef.current = buildStageColorMap(currentSnapshot, occupancyMap, plantStateIndex);
    } else {
      stageColorRef.current = new Map();
    }
  }, [currentSnapshot, occupancyMap, plantStateIndex]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!currentSnapshot || !mapRef.current) {
      setHoverPlant(null);
      return;
    }

    const rect = mapRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const world = screenToWorld({ x: screenX, y: screenY }, viewport);
    const subcellId = resolveSubcellId(world.x_in, world.y_in);
    const plant = findPlantAtSubcell(subcellId, currentSnapshot.plants, occupancyMap);

    if (plant) {
      setHoverPlant({ plant, x: e.clientX, y: e.clientY });
    } else {
      setHoverPlant(null);
    }
  }, [currentSnapshot, viewport, occupancyMap]);

  const handleMouseLeave = useCallback(() => {
    setHoverPlant(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header: title + year selector */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 border-b border-gray-700 shrink-0">
        <span className="text-sm font-semibold text-gray-300 mr-3">Garden Twin</span>
        <span className="text-xs text-gray-500 mr-1">Year:</span>
        {SELECTABLE_YEARS.map(year => {
          const isSelected = sim.selectedYear === year;
          const label = year === 'average' ? '10yr Avg' : year === 2025 ? '2025 Live' : String(year);
          const color = YEAR_COLORS[year] ?? '#9CA3AF';
          return (
            <button
              key={year}
              onClick={() => sim.selectYear(year)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                isSelected
                  ? 'text-white border border-gray-500'
                  : 'text-gray-500 border border-gray-700 hover:border-gray-500'
              }`}
              style={isSelected ? { backgroundColor: color + '33', borderColor: color } : undefined}
            >
              {label}
              {sim.isLoading && sim.selectedYear === year && '...'}
            </button>
          );
        })}

        {sim.isLoading && (
          <span className="text-[10px] text-gray-500 ml-2">Simulating...</span>
        )}
      </div>

      {/* Main content: map + side panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Garden map with hover detection */}
        <div
          ref={mapRef}
          className="flex-1 min-w-0 relative"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CanvasGarden stageColorRef={stageColorRef} />

          {/* Hover tooltip */}
          {hoverPlant && (
            <PlantTooltip
              plant={hoverPlant.plant}
              species={GARDEN_SPECIES_MAP.get(hoverPlant.plant.species_id)}
              x={hoverPlant.x}
              y={hoverPlant.y}
            />
          )}
        </div>

        {/* Right side panel */}
        <div className="w-56 shrink-0">
          <ConditionsPanel
            snapshot={currentSnapshot}
            snapshots={sim.snapshots}
            dayIndex={dayIndex}
            env={sim.env}
            catalog={GARDEN_SPECIES_MAP}
          />
        </div>
      </div>

      {/* Timeline scrubber */}
      <div className="shrink-0">
        <TimelineScrubber
          snapshots={sim.snapshots}
          dayIndex={dayIndex}
          onDayChange={setDayIndex}
          seasonStart={sim.seasonStart}
        />
      </div>

      {/* Bottom charts */}
      <div className="shrink-0 border-t border-gray-700">
        <div className="flex bg-gray-900 px-2">
          {([
            ['production', 'Weekly Production'],
            ['growth', 'Growth Modifiers'],
            ['flavor', 'Flavor Quality'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setBottomChart(bottomChart === id ? 'none' : id)}
              className={`px-3 py-1 text-xs transition-colors ${
                bottomChart === id
                  ? 'text-gray-200 border-b-2 border-emerald-500'
                  : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {bottomChart === 'production' && (
          <div className="h-64">
            <HarvestTimeline env={sim.env ?? undefined} />
          </div>
        )}
        {bottomChart === 'growth' && (
          <div className="h-64">
            <GrowthModTimeline env={sim.env ?? undefined} />
          </div>
        )}
        {bottomChart === 'flavor' && (
          <div className="h-64">
            <FlavorTimeline env={sim.env ?? undefined} />
          </div>
        )}
      </div>
    </div>
  );
}
