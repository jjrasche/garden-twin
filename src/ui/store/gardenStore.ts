import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GardenState, PlantSpecies, Season, TimeSlot, SubcellState } from '@core/types';

interface ViewportState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

/**
 * Paint modes for terrain/shade painting
 */
export type PaintMode = 'none' | 'water' | 'path' | 'tree' | 'shade';

/**
 * Settings for shade painting mode
 */
export interface ShadeSettings {
  season: Season;
  timeSlots: TimeSlot[];
}

/**
 * Brush cursor position (world coordinates)
 */
export interface BrushCursor {
  x_in: number;
  y_in: number;
  radiusCells: number;
}

/**
 * Brush size options (radius in cells, so 0=1×1, 1=3×3, etc.)
 */
export type BrushSize = 0 | 1 | 2 | 3;

/**
 * Brush settings
 */
export interface BrushSettings {
  size: BrushSize;       // Manual brush size (0=1×1, 1=3×3, 2=5×5, 3=7×7)
  autoSize: boolean;     // Auto-adjust based on pixels per cell
}

interface GardenStoreState {
  // Core data (GardenState is the single source of truth)
  gardenState: GardenState | null;
  speciesMap: Map<string, PlantSpecies>;

  // UI state
  viewport: ViewportState;

  // Paint tool state
  paintMode: PaintMode;
  shadeSettings: ShadeSettings;
  brushSettings: BrushSettings;
  isPainting: boolean;
  brushCursor: BrushCursor | null;
  paintOverlay: Map<string, SubcellState>; // Painted cells during drag (not committed yet)

  // Internal cache (not persisted)
  _subcellIndexCache: Map<string, number> | null;

  // Actions
  setGardenState: (gardenState: GardenState) => void;
  setSpecies: (species: PlantSpecies[]) => void;
  setPan: (offsetX: number, offsetY: number) => void;
  setScale: (scale: number) => void;
  setViewport: (viewport: ViewportState) => void;
  reset: () => void;

  // Paint actions
  setPaintMode: (mode: PaintMode) => void;
  setShadeSettings: (settings: Partial<ShadeSettings>) => void;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;
  setIsPainting: (isPainting: boolean) => void;
  setBrushCursor: (cursor: BrushCursor | null) => void;
  paintSubcells: (subcellIds: string[]) => void;
  commitPaintOverlay: (overlay: Map<string, SubcellState>) => void; // Commit overlay to garden (on mouseup)
}

const initialState = {
  gardenState: null,
  speciesMap: new Map<string, PlantSpecies>(),
  viewport: {
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  },
  paintMode: 'none' as PaintMode,
  shadeSettings: {
    season: 'summer' as Season,
    timeSlots: ['mid_morning', 'early_afternoon'] as TimeSlot[],
  },
  brushSettings: {
    size: 1 as BrushSize,  // Default 3×3
    autoSize: true,        // Auto-adjust enabled by default
  },
  isPainting: false,
  brushCursor: null,
  paintOverlay: new Map<string, SubcellState>(),
  _subcellIndexCache: null,
};

export const useGardenStore = create<GardenStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setGardenState: (gardenState) => {
        set({ gardenState, _subcellIndexCache: null }); // Invalidate cache
      },

      setSpecies: (species) => {
        const speciesMap = new Map<string, PlantSpecies>();
        for (const s of species) {
          speciesMap.set(s.id, s);
        }
        set({ speciesMap });
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

      reset: () => {
        set(initialState);
      },

      // Paint actions
      setPaintMode: (mode) => {
        set({ paintMode: mode });
      },

      setShadeSettings: (settings) => {
        set((state) => ({
          shadeSettings: { ...state.shadeSettings, ...settings },
        }));
      },

      setBrushSettings: (settings) => {
        set((state) => ({
          brushSettings: { ...state.brushSettings, ...settings },
        }));
      },

      setIsPainting: (isPainting) => {
        set({ isPainting });
      },

      setBrushCursor: (cursor) => {
        set({ brushCursor: cursor });
      },

      paintSubcells: (subcellIds) => {
        const startTime = performance.now();
        const state = get();
        const { gardenState, paintMode, shadeSettings, paintOverlay } = state;
        if (!gardenState || paintMode === 'none') return;
        if (subcellIds.length === 0) return;

        // Use cached index map, or build it if null
        let subcellIndexMap = state._subcellIndexCache;
        if (!subcellIndexMap) {
          subcellIndexMap = new Map<string, number>();
          for (let i = 0; i < gardenState.subcells.length; i++) {
            subcellIndexMap.set(gardenState.subcells[i]!.subcell_id, i);
          }
          // Cache it for next call (but don't trigger re-render just for cache update)
          state._subcellIndexCache = subcellIndexMap;
        }

        // Add painted subcells to overlay (NO garden update, NO re-render)
        const newOverlay = new Map(paintOverlay);

        for (const id of subcellIds) {
          const index = subcellIndexMap.get(id);
          if (index === undefined) continue;

          const subcell = gardenState.subcells[index]!;

          // Apply paint based on mode
          if (paintMode === 'water' || paintMode === 'path' || paintMode === 'tree') {
            // Update terrain type (map 'path' to 'pathway' for type compatibility)
            const terrainType = paintMode === 'path' ? 'pathway' : paintMode;
            newOverlay.set(id, {
              ...subcell,
              type: terrainType as 'water' | 'pathway' | 'tree',
            });
          } else if (paintMode === 'shade') {
            // Update shade map
            const existingShadeMap = subcell.shade_map || {};
            const existingSeasonShade = existingShadeMap[shadeSettings.season] || {};

            // Set selected time slots as shaded
            const updatedSeasonShade = { ...existingSeasonShade };
            for (const slot of shadeSettings.timeSlots) {
              updatedSeasonShade[slot] = true;
            }

            newOverlay.set(id, {
              ...subcell,
              shade_map: {
                ...existingShadeMap,
                [shadeSettings.season]: updatedSeasonShade,
              },
            });
          }
        }

        // Only update overlay (lightweight, no React re-render cascade)
        set({ paintOverlay: newOverlay });

        const elapsed = performance.now() - startTime;
        if (elapsed > 5) {
          console.log(`[paintSubcells] ${elapsed.toFixed(2)}ms for ${subcellIds.length} cells (overlay)`);
        }
      },

      commitPaintOverlay: (overlay) => {
        const startTime = performance.now();
        const { gardenState } = get();
        if (!gardenState || overlay.size === 0) return;

        // Build index map
        const subcellIndexMap = new Map<string, number>();
        for (let i = 0; i < gardenState.subcells.length; i++) {
          subcellIndexMap.set(gardenState.subcells[i]!.subcell_id, i);
        }

        // Clone array once
        const updatedSubcells = [...gardenState.subcells];

        // Apply all overlay changes
        for (const [id, overlaySubcell] of overlay.entries()) {
          const index = subcellIndexMap.get(id);
          if (index !== undefined) {
            updatedSubcells[index] = overlaySubcell;
          }
        }

        // ONE garden update for entire stroke
        set({
          gardenState: {
            ...gardenState,
            subcells: updatedSubcells,
            updated_at: new Date().toISOString(),
          },
        });

        const elapsed = performance.now() - startTime;
        console.log(`[commitPaintOverlay] ${elapsed.toFixed(2)}ms for ${overlay.size} cells`);
      },
    }),
    {
      name: 'garden-twin-storage',
      // Exclude gardenState from persistence (too large for localStorage)
      partialize: (state) => ({
        viewport: state.viewport,
        paintMode: state.paintMode,
        brushSettings: state.brushSettings,
        shadeSettings: state.shadeSettings,
        // gardenState excluded (16,000 subcells exceeds localStorage quota)
      }),
      // Custom serialization to handle Map
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            if (!str) return null;

            const { state } = JSON.parse(str);

            // If state is too large or corrupted, clear it and start fresh
            if (str.length > 100000) { // > 100KB indicates old corrupted data
              console.warn('[gardenStore] Clearing corrupted localStorage (too large)');
              localStorage.removeItem(name);
              return null;
            }

            // Convert speciesMap array back to Map
            if (state.speciesMap && Array.isArray(state.speciesMap)) {
              state.speciesMap = new Map(state.speciesMap);
            }
            // Ensure paint state has defaults (not persisted but may be missing)
            if (!state.paintMode) state.paintMode = 'none';
            if (!state.shadeSettings) state.shadeSettings = { season: 'summer', timeSlots: ['mid_morning', 'early_afternoon'] };
            if (!state.brushSettings) state.brushSettings = { size: 1, autoSize: true };
            if (state.isPainting === undefined) state.isPainting = false;
            state.brushCursor = null; // Always reset brush cursor on load
            state.paintOverlay = new Map(); // Always start with empty overlay

            return { state };
          } catch (error) {
            console.error('[gardenStore] Failed to load from localStorage:', error);
            // Clear corrupted data
            localStorage.removeItem(name);
            return null;
          }
        },
        setItem: (name, value) => {
          const { state } = value;
          // Convert speciesMap Map to array for JSON (if it exists in partalized state)
          const serializable = {
            ...state,
            // Only serialize speciesMap if it's in the state (not excluded by partialize)
            ...(state.speciesMap ? { speciesMap: Array.from(state.speciesMap.entries()) } : {}),
          };
          localStorage.setItem(name, JSON.stringify({ state: serializable }));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
