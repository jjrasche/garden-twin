/**
 * Flavor model — computes taste quality score from environmental conditions.
 *
 * Each species can define flavor_response curves mapping conditions to
 * compound levels (sugar, lactucin, brix, glucosinolate). The overall
 * flavor score combines these: high sugar + low bitterness = good flavor.
 *
 * Score: 0.0 = poor taste, 1.0 = peak flavor.
 */

import type { PlantSpecies, FlavorResponse } from '../types/PlantSpecies';
import { interpolate } from './interpolate';

/** Compound levels at given conditions. */
export interface FlavorProfile {
  compounds: Record<string, number>;  // compound name → intensity 0-1
  score: number;                       // overall flavor quality 0-1
}

/** Positive compounds — higher = better flavor. */
const POSITIVE_COMPOUNDS = new Set(['sugar', 'brix', 'sweetness']);

/** Negative compounds — higher = worse flavor. */
const NEGATIVE_COMPOUNDS = new Set(['lactucin', 'lactucopicrin', 'bitterness', 'glucosinolate']);

/** Compute flavor profile for a species under given conditions. */
export function computeFlavorProfile(
  species: PlantSpecies,
  conditions: Record<string, number>,
): FlavorProfile {
  const responses = species.flavor_response;
  if (!responses || responses.length === 0) {
    return { compounds: {}, score: 1.0 }; // No flavor model = assume fine
  }

  const compounds: Record<string, number> = {};

  for (const resp of responses) {
    const conditionValue = conditions[resp.factor];
    if (conditionValue === undefined) continue;
    const intensity = interpolate(resp.curve, conditionValue);
    // Average if multiple curves for same compound
    if (compounds[resp.compound] !== undefined) {
      compounds[resp.compound] = (compounds[resp.compound]! + intensity) / 2;
    } else {
      compounds[resp.compound] = intensity;
    }
  }

  // Score: average of (positive compounds) - average of (negative compounds)
  let positiveSum = 0, positiveCount = 0;
  let negativeSum = 0, negativeCount = 0;

  for (const [name, value] of Object.entries(compounds)) {
    if (POSITIVE_COMPOUNDS.has(name)) {
      positiveSum += value;
      positiveCount++;
    } else if (NEGATIVE_COMPOUNDS.has(name)) {
      negativeSum += value;
      negativeCount++;
    }
  }

  const positiveAvg = positiveCount > 0 ? positiveSum / positiveCount : 0.5;
  const negativeAvg = negativeCount > 0 ? negativeSum / negativeCount : 0;

  // Score = positive contribution - negative contribution, clamped to [0, 1]
  const score = Math.max(0, Math.min(1, positiveAvg - negativeAvg * 0.5));

  return { compounds, score };
}

/** Simple flavor score (0-1) for chart display. */
export function computeFlavorScore(
  species: PlantSpecies,
  conditions: Record<string, number>,
): number {
  return computeFlavorProfile(species, conditions).score;
}
