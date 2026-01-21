import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Garden, PlantSpecies, Projection, Plan, HarvestWeek, YieldProjection } from '@core/types';
import { YieldCalculator } from '@core/calculators/YieldCalculator';
import { LaborCalculator } from '@core/calculators/LaborCalculator';

interface ViewportState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface GardenState {
  // Core data
  garden: Garden | null;
  plan: Plan | null;
  speciesMap: Map<string, PlantSpecies>;
  projection: Projection | null;

  // UI state
  viewport: ViewportState;

  // Actions
  setGarden: (garden: Garden) => void;
  setPlan: (plan: Plan) => void;
  setSpecies: (species: PlantSpecies[]) => void;
  setPan: (offsetX: number, offsetY: number) => void;
  setScale: (scale: number) => void;
  setViewport: (viewport: ViewportState) => void;
  regenerateProjection: () => void;
  reset: () => void;
}

const yieldCalc = new YieldCalculator();
const laborCalc = new LaborCalculator();

/**
 * Helper function to calculate harvest schedule from yield projections
 */
function calculateHarvestSchedule(yields: YieldProjection[]): HarvestWeek[] {
  const weekMap = new Map<number, HarvestWeek>();

  for (const yieldProj of yields) {
    const firstDate = new Date(yieldProj.first_harvest_date);
    const lastDate = new Date(yieldProj.last_harvest_date);

    // Calculate week numbers for first and last harvest
    const firstWeek = getWeekNumber(firstDate);
    const lastWeek = getWeekNumber(lastDate);

    // Calculate how many weeks this harvest spans
    const weekSpan = lastWeek - firstWeek + 1;
    const lbsPerWeek = yieldProj.yield_lbs / weekSpan;
    const caloriesPerWeek = yieldProj.calories / weekSpan;

    // Distribute yield across weeks
    for (let weekNum = firstWeek; weekNum <= lastWeek; weekNum++) {
      // Initialize week if not exists
      if (!weekMap.has(weekNum)) {
        const weekStart = getWeekStart(weekNum, firstDate.getFullYear());
        weekMap.set(weekNum, {
          week_number: weekNum,
          week_starting: weekStart,
          harvests: [],
          total_lbs: 0,
        });
      }

      const week = weekMap.get(weekNum)!;

      // Find existing harvest for this species in this week
      const existingHarvest = week.harvests.find(
        (h) => h.species_id === yieldProj.species_id
      );

      if (existingHarvest) {
        // Accumulate
        existingHarvest.lbs += lbsPerWeek;
        existingHarvest.calories = (existingHarvest.calories || 0) + caloriesPerWeek;
      } else {
        // Add new harvest entry
        week.harvests.push({
          species_id: yieldProj.species_id,
          lbs: lbsPerWeek,
          calories: caloriesPerWeek,
        });
      }

      // Update total
      week.total_lbs += lbsPerWeek;
    }
  }

  // Convert to sorted array
  return Array.from(weekMap.values()).sort((a, b) => a.week_number - b.week_number);
}

/**
 * Get ISO week number for a date (1-52)
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNum;
}

/**
 * Get ISO date string for the Monday of a given week
 */
function getWeekStart(weekNum: number, year: number): string {
  const jan1 = new Date(year, 0, 1);
  const daysToMonday = (jan1.getDay() === 0 ? -6 : 1 - jan1.getDay());
  const firstMonday = new Date(year, 0, 1 + daysToMonday);

  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNum - 1) * 7);

  return weekStart.toISOString().split('T')[0]!;
}

const initialState = {
  garden: null,
  plan: null,
  speciesMap: new Map<string, PlantSpecies>(),
  projection: null,
  viewport: {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
};

export const useGardenStore = create<GardenState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setGarden: (garden) => {
        set({ garden });
        // Regenerate projection when garden changes
        get().regenerateProjection();
      },

      setPlan: (plan) => {
        set({ plan });
        // Regenerate projection when plan changes
        get().regenerateProjection();
      },

      setSpecies: (species) => {
        const speciesMap = new Map<string, PlantSpecies>();
        for (const s of species) {
          speciesMap.set(s.id, s);
        }
        set({ speciesMap });
        // Regenerate projection when species data changes
        get().regenerateProjection();
      },

      setPan: (offsetX, offsetY) => {
        set({
          viewport: {
            ...get().viewport,
            offsetX,
            offsetY,
          },
        });
      },

      setScale: (scale) => {
        set({
          viewport: {
            ...get().viewport,
            scale,
          },
        });
      },

      setViewport: (viewport) => {
        set({ viewport });
      },

      regenerateProjection: () => {
        const { garden, plan, speciesMap } = get();

        if (!garden || !plan || speciesMap.size === 0) {
          set({ projection: null });
          return;
        }

        try {
          // Calculate yields for all planted subcells
          const yields: Projection['yields'] = [];
          let totalYield = 0;
          let totalCalories = 0;
          let totalCost = 0;
          let plantedSubcells = 0;

          for (const subcell of garden.subcells) {
            if (!subcell.plant) continue;

            const species = speciesMap.get(subcell.plant.species_id);
            if (!species) continue;

            plantedSubcells++;

            const yieldLbs = yieldCalc.calculate(
              species,
              subcell.conditions,
              species.plants_per_sq_ft // Use species default density
            );

            totalYield += yieldLbs;
            const calories = yieldLbs * species.nutrition_per_lb.calories;
            totalCalories += calories;
            totalCost += species.seed_cost_per_plant;

            // Calculate harvest dates (approximate)
            const plantingDate = new Date(subcell.plant.planted_date);
            const firstHarvestDate = new Date(plantingDate);
            firstHarvestDate.setDate(firstHarvestDate.getDate() + species.days_to_first_harvest);
            const lastHarvestDate = new Date(firstHarvestDate);
            lastHarvestDate.setDate(lastHarvestDate.getDate() + species.days_harvest_window);

            yields.push({
              subcell_id: subcell.id,
              species_id: species.id,
              yield_lbs: yieldLbs,
              calories: calories,
              confidence: species.success_rate,
              first_harvest_date: firstHarvestDate.toISOString().split('T')[0] || '',
              last_harvest_date: lastHarvestDate.toISOString().split('T')[0] || '',
            });
          }

          // Calculate labor schedule
          const laborSchedule = laborCalc.calculateSchedule(
            plan,
            speciesMap,
            1.0 // Default density
          );

          // Calculate total labor hours
          const totalLaborHours = laborSchedule.reduce(
            (sum, week) => sum + week.total_hours,
            0
          );

          // Calculate harvest schedule from yields
          const harvestSchedule = calculateHarvestSchedule(yields);

          // Create projection
          const projection: Projection = {
            plan_id: plan.id,
            type: 'initial',
            generated_date: new Date().toISOString(),
            as_of_date: new Date().toISOString(),
            yields,
            labor_schedule: laborSchedule,
            harvest_schedule: harvestSchedule,
            totals: {
              total_yield_lbs: totalYield,
              total_calories: totalCalories,
              total_labor_hours: totalLaborHours,
              total_cost_dollars: totalCost,
              planted_subcells: plantedSubcells,
              species_count: speciesMap.size,
            },
          };

          set({ projection });
        } catch (error) {
          console.error('Error generating projection:', error);
          set({ projection: null });
        }
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'garden-twin-storage',
      // Custom serialization to handle Map
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          const { state } = JSON.parse(str);
          // Convert speciesMap array back to Map
          if (state.speciesMap && Array.isArray(state.speciesMap)) {
            state.speciesMap = new Map(state.speciesMap);
          }
          return { state };
        },
        setItem: (name, value) => {
          const { state } = value;
          // Convert speciesMap Map to array for JSON
          const serializable = {
            ...state,
            speciesMap: Array.from(state.speciesMap.entries()),
          };
          localStorage.setItem(name, JSON.stringify({ state: serializable }));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
