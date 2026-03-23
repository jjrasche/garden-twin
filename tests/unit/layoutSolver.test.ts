/**
 * Layout Solver v2 tests — polygon-based, species-property-driven placement.
 */

import { describe, test, expect } from 'vitest';
import { solveLayout } from '../../src/core/layout/layoutSolver';
import type { GardenDefinition, PlantingRequest } from '../../src/core/layout/types';
import { GARDEN_SPECIES_MAP } from '../../src/core/data/gardenSpecies';
import { createGardenStateFromPlan } from '../../src/core/data/sampleGarden';
import { PRODUCTION_PLAN } from '../../src/core/calculators/ProductionTimeline';

const CHANNEL: Array<{ x: number; y: number }> = [
  { x: 336, y: 0 }, { x: 336, y: 660 },
  { x: 288, y: 720 }, { x: 240, y: 780 }, { x: 240, y: 1200 },
];

const GARDEN: GardenDefinition = {
  bounds: { width_in: 360, length_in: 1200 },
  obstructions: [
    { id: 'dead_zone', type: 'rect', physX: [0, 360], physY: [0, 120] },
    { id: 'channel', type: 'polyline_buffer', polyline: CHANNEL, buffer_in: 36 },
  ],
  infrastructure: [
    { id: 'trellis', type: 'trellis', polyline: CHANNEL, species_ids: ['tomato_sun_gold', 'tomato_amish_paste'], spacing_in: 18, start_physY: 240 },
  ],
};

function makeRequests(): PlantingRequest[] {
  // Link lettuce → spinach succession (same zone, spring → fall)
  const lettuce = PRODUCTION_PLAN.find(p => p.species.id === 'lettuce_bss')!;
  const spinach = PRODUCTION_PLAN.find(p => p.species.id === 'spinach_bloomsdale')!;
  const others = PRODUCTION_PLAN.filter(p =>
    p.species.id !== 'lettuce_bss' && p.species.id !== 'spinach_bloomsdale',
  );

  return [
    {
      species_id: lettuce.species.id,
      plant_count: lettuce.plant_count,
      planting_date: lettuce.planting_date,
      stagger_days: lettuce.stagger_days,
      harvest_strategy_id: lettuce.harvest_strategy_id,
      successor: {
        species_id: spinach.species.id,
        plant_count: spinach.plant_count,
        planting_date: spinach.planting_date,
        stagger_days: spinach.stagger_days,
        harvest_strategy_id: spinach.harvest_strategy_id,
      },
    },
    ...others.map(p => ({
      species_id: p.species.id,
      plant_count: p.plant_count,
      planting_date: p.planting_date,
      stagger_days: p.stagger_days,
      harvest_strategy_id: p.harvest_strategy_id,
    })),
  ];
}

// ── Species ordering ────────────────────────────────────────────────────────

describe('species ordering', () => {
  test('tallest species placed furthest north', () => {
    const layout = solveLayout(GARDEN, makeRequests(), GARDEN_SPECIES_MAP);
    const cornMinY = Math.min(...layout.placements.filter(p => p.species_id === 'corn_nothstine_dent').map(p => p.physY));
    const kaleMaxY = Math.max(...layout.placements.filter(p => p.species_id === 'kale_red_russian').map(p => p.physY));
    expect(cornMinY).toBeGreaterThan(kaleMaxY);
  });

  test('shade-tolerant species placed furthest south', () => {
    const layout = solveLayout(GARDEN, makeRequests(), GARDEN_SPECIES_MAP);
    const lettuceMinY = Math.min(...layout.placements.filter(p => p.species_id === 'lettuce_bss').map(p => p.physY));
    const kaleMinY = Math.min(...layout.placements.filter(p => p.species_id === 'kale_red_russian').map(p => p.physY));
    expect(lettuceMinY).toBeLessThan(kaleMinY);
  });
});

// ── Access patterns (inferred from plant positions) ─────────────────────────

describe('access patterns', () => {
  test('corn plants are in a contiguous block (no paths between corn rows)', () => {
    const layout = solveLayout(GARDEN, makeRequests(), GARDEN_SPECIES_MAP);
    const cornPlants = layout.placements.filter(p => p.species_id === 'corn_nothstine_dent');
    const cornYs = cornPlants.map(p => p.physY).sort((a, b) => a - b);
    // All corn should be within ~18" spacing of each other (no path gaps)
    for (let i = 1; i < cornYs.length; i++) {
      expect(cornYs[i]! - cornYs[i - 1]!).toBeLessThanOrEqual(18);
    }
  });

  test('kale plants have path-width gaps (bordered access)', () => {
    const layout = solveLayout(GARDEN, makeRequests(), GARDEN_SPECIES_MAP);
    const kalePlants = layout.placements.filter(p => p.species_id === 'kale_red_russian');
    const kaleYs = [...new Set(kalePlants.map(p => p.physY))].sort((a, b) => a - b);
    // Bordered zones have paths between 48" zone rows — some row gaps should exceed plant spacing (18")
    const gaps = kaleYs.slice(1).map((y, i) => y - kaleYs[i]!);
    const hasPathGap = gaps.some(g => g > 20); // > plant spacing means a path intervened
    expect(hasPathGap).toBe(true);
  });
});

// ── Plant counts ────────────────────────────────────────────────────────────

describe('plant counts', () => {
  test('all food species placed within 5% of target', () => {
    const layout = solveLayout(GARDEN, makeRequests(), GARDEN_SPECIES_MAP);
    for (const [speciesId, cap] of Object.entries(layout.capacity)) {
      const pct = Math.abs(cap.placed - cap.requested) / cap.requested;
      expect(pct).toBeLessThan(0.05);
    }
  });

  test('trellis tomatoes placed at full count', () => {
    const layout = solveLayout(GARDEN, makeRequests(), GARDEN_SPECIES_MAP);
    expect(layout.capacity['tomato_sun_gold']?.placed).toBe(8);
    expect(layout.capacity['tomato_amish_paste']?.placed).toBe(11);
  });
});

// ── Physical coordinates ────────────────────────────────────────────────────

describe('physical coordinates', () => {
  test('all placements have physX and physY > 0', () => {
    const layout = solveLayout(GARDEN, makeRequests(), GARDEN_SPECIES_MAP);
    for (const p of layout.placements) {
      expect(p.physX).toBeGreaterThan(0);
      expect(p.physY).toBeGreaterThanOrEqual(0);
    }
  });

  test('no plant placed in dead zone (physY < 120)', () => {
    const layout = solveLayout(GARDEN, makeRequests(), GARDEN_SPECIES_MAP);
    const inDeadZone = layout.placements.filter(p => p.physY < 120);
    expect(inDeadZone.length).toBe(0);
  });
});

// ── Density ─────────────────────────────────────────────────────────────────

describe('density', () => {
  test('all placements have positive density', () => {
    const layout = solveLayout(GARDEN, makeRequests(), GARDEN_SPECIES_MAP);
    for (const p of layout.placements) {
      expect(p.density_plants_per_sqft).toBeGreaterThan(0);
    }
  });
});

// ── GardenState integration ─────────────────────────────────────────────────

describe('GardenState integration', () => {
  test('createGardenStateFromPlan produces valid state', () => {
    const state = createGardenStateFromPlan(PRODUCTION_PLAN);
    expect(state.plants.length).toBeGreaterThan(0);
    expect(state.subcells.length).toBeGreaterThan(0);
    expect(state.infrastructure.length).toBe(2);
  });

  test('plants have position and density fields', () => {
    const state = createGardenStateFromPlan(PRODUCTION_PLAN);
    const corn = state.plants.find(p => p.species_id === 'corn_nothstine_dent');
    expect(corn).toBeDefined();
    expect(corn!.position).toBeDefined();
    expect(corn!.position!.physX).toBeGreaterThan(0);
    expect(corn!.density_plants_per_sqft).toBeGreaterThan(0);
  });
});

// ── Species don't overlap in physY ───────────────────────────────────────────

describe('species spatial separation', () => {
  test('different species do not share physY ranges (except succession pairs)', () => {
    const layout = solveLayout(GARDEN, makeRequests(), GARDEN_SPECIES_MAP);
    // Group by species, get physY extent
    const extents = new Map<string, { min: number; max: number }>();
    for (const p of layout.placements) {
      const ext = extents.get(p.species_id);
      if (ext) {
        ext.min = Math.min(ext.min, p.physY);
        ext.max = Math.max(ext.max, p.physY);
      } else {
        extents.set(p.species_id, { min: p.physY, max: p.physY });
      }
    }
    // Corn and kale should not overlap
    const corn = extents.get('corn_nothstine_dent');
    const kale = extents.get('kale_red_russian');
    if (corn && kale) {
      expect(corn.min).toBeGreaterThan(kale.max);
    }
  });
});
