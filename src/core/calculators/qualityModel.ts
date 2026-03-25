/**
 * Quality model — unified produce quality from flavor and maturity.
 *
 * Quality = flavor × maturity
 *
 * Two factors determine quality:
 *   - Flavor: compound model from environmental conditions (sugar, bitterness)
 *   - Maturity: biomass ratio curve (baby → peak → overgrown)
 *
 * Maturity is a pre-harvest concept: how close is the plant to its ideal
 * harvest size? At optimal_harvest_lbs the plant is at peak quality.
 * Below that it's immature (still good, just small). Above it's overgrowing
 * (tougher stems, more fibrous). Eventually overmaturity forces harvest.
 *
 * Quality below species.must_harvest_floor triggers forced harvest.
 */

import type { PlantSpecies } from '../types/PlantSpecies';
import { computeFlavorScore } from './flavorModel';
import { interpolate } from './interpolate';

// ── Types ───────────────────────────────────────────────────────────────────

export interface QualityResult {
  quality_score: number;      // 0-1, combined quality
  flavor_score: number;       // 0-1, from flavor model
  maturity: number;           // 0-1, from maturity curve (biomass ratio)
  biomass_ratio: number;      // accumulated / optimal (1.0 = peak)
}

// ── Leaf Functions ──────────────────────────────────────────────────────────

/** Ratio of current biomass to optimal harvest point. */
export function computeBiomassRatio(
  accumulatedLbs: number,
  optimalHarvestLbs: number,
): number {
  if (optimalHarvestLbs <= 0) return 0;
  return accumulatedLbs / optimalHarvestLbs;
}

/** Maturity factor from species-specific curve. 1.0 at optimal, declining as overgrown. */
export function computeMaturityFactor(
  biomassRatio: number,
  maturityCurve: Record<number, number>,
): number {
  return interpolate(maturityCurve, biomassRatio);
}

/** Whether biomass meets minimum harvest threshold. */
export function isHarvestable(
  accumulatedLbs: number,
  minHarvestLbs: number,
): boolean {
  return accumulatedLbs >= minHarvestLbs;
}

// ── Concept Function ────────────────────────────────────────────────────────

/**
 * Compute unified quality score for a plant.
 *
 * Returns 0 if biomass is below minimum (not harvestable = no quality to assess).
 * Otherwise: quality = flavor × maturity(biomass_ratio).
 * Maturity peaks at ratio 1.0 (optimal size) and declines as the plant overgrows.
 */
export function computeQuality(
  species: PlantSpecies,
  conditions: Record<string, number>,
  accumulatedLbs: number,
): QualityResult {
  const minHarvestLbs = species.quality?.min_harvest_lbs ?? 0;
  const optimalLbs = species.quality?.optimal_harvest_lbs ?? minHarvestLbs;
  const maturityCurve = species.quality?.maturity_curve;

  const flavorScore = computeFlavorScore(species, conditions);
  const biomassRatio = computeBiomassRatio(accumulatedLbs, optimalLbs);

  // Not enough biomass to harvest — quality is 0 but flavor is still computable
  if (accumulatedLbs < minHarvestLbs) {
    return {
      quality_score: 0,
      flavor_score: flavorScore,
      maturity: 0,
      biomass_ratio: biomassRatio,
    };
  }

  const maturity = maturityCurve
    ? computeMaturityFactor(biomassRatio, maturityCurve)
    : 1.0;  // No curve = maturity doesn't degrade (companion plants)

  const qualityScore = Math.max(0, Math.min(1, flavorScore * maturity));

  return {
    quality_score: qualityScore,
    flavor_score: flavorScore,
    maturity,
    biomass_ratio: biomassRatio,
  };
}
