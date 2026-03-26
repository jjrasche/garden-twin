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

// ── Concept Function ────────────────────────────────────────────────────────

/**
 * Compute unified quality score for a plant.
 *
 * quality = flavor × maturity(biomass_ratio).
 * Maturity starts at 0 (no biomass), peaks at ratio 1.0 (optimal size),
 * and declines as the plant overgrows. Quality is always computable at
 * any biomass level — it's a grading signal, not a harvest gate.
 */
export function computeQuality(
  species: PlantSpecies,
  conditions: Record<string, number>,
  accumulatedLbs: number,
): QualityResult {
  const optimalLbs = species.quality?.optimal_harvest_lbs ?? 0;
  const maturityCurve = species.quality?.maturity_curve;

  const flavorScore = computeFlavorScore(species, conditions);
  const biomassRatio = computeBiomassRatio(accumulatedLbs, optimalLbs);

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
