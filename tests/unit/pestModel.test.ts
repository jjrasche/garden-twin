import { describe, it, expect } from 'vitest';
import {
  findCropThreats,
  findCompanionsForPest,
  findProtectorsForCrop,
} from '../../src/core/types/Pest';
import {
  CROP_VULNERABILITIES,
  COMPANION_BENEFITS,
  PEST_MAP,
} from '../../src/core/data/pests';

describe('Pest model — Companion → Pest → Crop chain', () => {
  it('finds all pests that threaten kale', () => {
    const threats = findCropThreats('kale_red_russian', CROP_VULNERABILITIES);
    const pestIds = threats.map((t) => t.pest_id);

    expect(pestIds).toContain('cabbage_moth');
    expect(pestIds).toContain('aphid');
    expect(pestIds).toContain('flea_beetle');
    expect(pestIds).toHaveLength(3);
  });

  it('finds all companions that help against cabbage moth', () => {
    const helpers = findCompanionsForPest('cabbage_moth', COMPANION_BENEFITS);

    expect(helpers).toHaveLength(1);
    expect(helpers[0].companion_species_id).toBe('marigold_french');
    expect(helpers[0].mechanism).toBe('visual_confusion');
  });

  it('traverses full chain: protectors for kale', () => {
    const protectors = findProtectorsForCrop(
      'kale_red_russian',
      CROP_VULNERABILITIES,
      COMPANION_BENEFITS,
    );

    const companionIds = [...new Set(protectors.map((p) => p.benefit.companion_species_id))];
    expect(companionIds).toContain('marigold_french');

    const mechanisms = protectors.map((p) => p.benefit.mechanism);
    expect(mechanisms).toContain('visual_confusion');
    expect(mechanisms).toContain('chemical_repellent');
  });

  it('traverses full chain: protectors for potato', () => {
    const protectors = findProtectorsForCrop(
      'potato_kennebec',
      CROP_VULNERABILITIES,
      COMPANION_BENEFITS,
    );

    const companionIds = [...new Set(protectors.map((p) => p.benefit.companion_species_id))];
    expect(companionIds).toContain('marigold_french');
    expect(companionIds).toContain('calendula');

    const hasCPBProtection = protectors.some(
      (p) => p.vulnerability.pest_id === 'colorado_potato_beetle'
        && p.benefit.companion_species_id === 'marigold_french',
    );
    expect(hasCPBProtection).toBe(true);

    const hasNematodeProtection = protectors.some(
      (p) => p.vulnerability.pest_id === 'root_knot_nematode'
        && p.benefit.mechanism === 'nematode_suppression',
    );
    expect(hasNematodeProtection).toBe(true);
  });

  it('traverses full chain: protectors for tomato (aphid + earworm coverage)', () => {
    const protectors = findProtectorsForCrop(
      'tomato_amish_paste',
      CROP_VULNERABILITIES,
      COMPANION_BENEFITS,
    );

    const aphidProtectors = protectors.filter((p) => p.vulnerability.pest_id === 'aphid');
    const aphidCompanions = [...new Set(aphidProtectors.map((p) => p.benefit.companion_species_id))];
    expect(aphidCompanions).toContain('marigold_french');
    expect(aphidCompanions).toContain('nasturtium');
    expect(aphidCompanions).toContain('calendula');

    const earwormProtectors = protectors.filter((p) => p.vulnerability.pest_id === 'corn_earworm');
    expect(earwormProtectors).toHaveLength(0);
  });

  it('returns empty for crop with no vulnerabilities', () => {
    const protectors = findProtectorsForCrop(
      'nonexistent_crop',
      CROP_VULNERABILITIES,
      COMPANION_BENEFITS,
    );
    expect(protectors).toEqual([]);
  });

  it('all pest references in vulnerabilities exist in pest catalog', () => {
    for (const vuln of CROP_VULNERABILITIES) {
      expect(PEST_MAP.has(vuln.pest_id)).toBe(true);
    }
  });

  it('all pest references in benefits exist in pest catalog', () => {
    for (const ben of COMPANION_BENEFITS) {
      expect(PEST_MAP.has(ben.pest_id)).toBe(true);
    }
  });
});
