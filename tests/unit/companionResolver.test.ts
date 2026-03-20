import { describe, it, expect } from 'vitest';
import { resolveZoneCompanions } from '../../src/core/data/companionResolver';
import { GARDEN_SPECIES_MAP } from '../../src/core/data/gardenSpecies';
import { KALE_RED_RUSSIAN, POTATO_KENNEBEC, CORN_NOTHSTINE_DENT } from '../../src/core/data/gardenSpecies';

describe('resolveZoneCompanions', () => {
  const CROP_EAST_X = 300;

  it('places marigolds at kale zone borders from companion relationship', () => {
    const plants = resolveZoneCompanions(
      'kale',
      [KALE_RED_RUSSIAN.id],
      [240, 480],
      CROP_EAST_X,
      GARDEN_SPECIES_MAP,
      '2025-05-15',
    );

    const marigolds = plants.filter(p => p.species_id === 'marigold_french');
    expect(marigolds.length).toBeGreaterThan(0);

    // Should be at zone edges (south border ≈ physY 234, north border ≈ physY 486)
    // In screen coords: south border has higher x_in, north border has lower x_in
    // But we just check they exist and have valid subcell IDs
    for (const m of marigolds) {
      expect(m.root_subcell_id).toMatch(/^sub_\d+_\d+$/);
      expect(m.plant_id).toMatch(/^companion_marigold_french_kale_\d+$/);
    }
  });

  it('places calendula near potato zone from companion relationship', () => {
    const plants = resolveZoneCompanions(
      'potato',
      [POTATO_KENNEBEC.id],
      [480, 600],
      CROP_EAST_X,
      GARDEN_SPECIES_MAP,
      '2025-05-15',
    );

    const calendula = plants.filter(p => p.species_id === 'calendula');
    expect(calendula.length).toBeGreaterThan(0);
  });

  it('returns empty for crops with no companion relationships', () => {
    const plants = resolveZoneCompanions(
      'corn',
      [CORN_NOTHSTINE_DENT.id],
      [660, 1080],
      CROP_EAST_X,
      GARDEN_SPECIES_MAP,
      '2025-05-15',
    );

    expect(plants).toEqual([]);
  });

  it('skips trap crops (handled by trellis generator)', () => {
    const plants = resolveZoneCompanions(
      'kale',
      [KALE_RED_RUSSIAN.id],
      [240, 480],
      CROP_EAST_X,
      GARDEN_SPECIES_MAP,
      '2025-05-15',
    );

    const nasturtiums = plants.filter(p => p.species_id === 'nasturtium');
    expect(nasturtiums.length).toBe(0);
  });
});
