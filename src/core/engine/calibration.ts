/**
 * Calibration — compare actual harvest weights (observations) against
 * projected harvest (simulation) to derive per-species correction factors.
 *
 * calibration_factor = actual_total / projected_total
 * - > 1.0 means the model under-predicts yield
 * - < 1.0 means the model over-predicts yield
 * - null means insufficient data
 */

import type { Observation } from '../types/Observation';

/**
 * Compute calibration factor for a single species.
 *
 * Sums all harvest_weight_lbs observations for the species and divides
 * by the projected total (from simulation accumulated_lbs).
 *
 * Returns null when there are no observations or projected is zero.
 */
export function computeCalibrationFactor(
  speciesId: string,
  observations: Observation[],
  projectedTotalLbs: number,
): number | null {
  if (projectedTotalLbs <= 0) return null;

  const speciesObservations = observations.filter(
    obs => obs.species_id === speciesId && obs.harvest_weight_lbs != null,
  );

  if (speciesObservations.length === 0) return null;

  const actualTotalLbs = speciesObservations.reduce(
    (sum, obs) => sum + obs.harvest_weight_lbs!,
    0,
  );

  return actualTotalLbs / projectedTotalLbs;
}
