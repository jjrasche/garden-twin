/**
 * Quality model — unified produce quality from flavor, biomass, and freshness.
 *
 * Quality = flavor × freshness × min(1.0, biomass_readiness)
 *
 * All three factors must be good for high quality:
 *   - Flavor: existing compound model (sugar, bitterness from conditions)
 *   - Biomass readiness: accumulated_lbs / min_harvest_lbs (enough to harvest?)
 *   - Freshness: species-specific decay curve from days_since_harvestable
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
  biomass_readiness: number;  // 0 = empty, 1.0 = at threshold, >1.0 = overgrown
  freshness: number;          // 1.0 = just ready, decays with days
}

// ── Leaf Functions ──────────────────────────────────────────────────────────

/** Ratio of current biomass to minimum harvest threshold. */
export function computeBiomassReadiness(
  accumulatedLbs: number,
  minHarvestLbs: number,
): number {
  if (minHarvestLbs <= 0) return 0;
  return accumulatedLbs / minHarvestLbs;
}

/** Freshness decay from species-specific curve. 1.0 at day 0, decays over time. */
export function computeFreshnessFactor(
  daysSinceHarvestable: number,
  freshnessCurve: Record<number, number>,
): number {
  return interpolate(freshnessCurve, daysSinceHarvestable);
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
 * Otherwise: quality = flavor × freshness × min(1.0, biomass_readiness).
 * The min(1.0, ...) means overgrown biomass doesn't BOOST quality — it just
 * means you have enough. Quality degrades via freshness as the produce ages.
 */
export function computeQuality(
  species: PlantSpecies,
  conditions: Record<string, number>,
  accumulatedLbs: number,
  minHarvestLbs: number,
  daysSinceHarvestable: number,
): QualityResult {
  const biomassReadiness = computeBiomassReadiness(accumulatedLbs, minHarvestLbs);

  const flavorScore = computeFlavorScore(species, conditions);

  // Not enough biomass to harvest — quality is 0 but flavor is still computable
  // (lets UI show "this plant will taste great once it's big enough")
  if (biomassReadiness < 1.0) {
    return {
      quality_score: 0,
      flavor_score: flavorScore,
      biomass_readiness: biomassReadiness,
      freshness: 1.0,
    };
  }
  const freshnessCurve = species.quality?.freshness_curve;
  const freshness = freshnessCurve
    ? computeFreshnessFactor(daysSinceHarvestable, freshnessCurve)
    : 1.0;  // No curve defined = freshness doesn't degrade (companion plants)

  const qualityScore = Math.max(0, Math.min(1, flavorScore * freshness));

  return {
    quality_score: qualityScore,
    flavor_score: flavorScore,
    biomass_readiness: biomassReadiness,
    freshness,
  };
}
