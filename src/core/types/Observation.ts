import { z } from 'zod';
import { GrowthStageSchema } from './GardenState';

// =============================================================================
// Observation Source - Where did this observation come from
// =============================================================================

/**
 * Source tracking for observations
 *
 * Every observation must have a source for:
 * - Training data provenance
 * - Audit trail for state changes
 * - Debugging perception issues
 */
export const ObservationSourceSchema = z.discriminatedUnion('source_type', [
  // From robot task execution
  z.object({
    source_type: z.literal('episode'),
    episode_id: z.string(),
    frame_index: z.number().int().min(0).optional(), // Which frame in episode
  }),
  // From human manual entry
  z.object({
    source_type: z.literal('manual'),
    user_id: z.string(),
    user_name: z.string().optional(),
  }),
  // From sensor reading
  z.object({
    source_type: z.literal('sensor'),
    sensor_id: z.string(),
    sensor_type: z.string().optional(), // 'soil_moisture', 'temperature', etc.
  }),
]);

export type ObservationSource = z.infer<typeof ObservationSourceSchema>;

// =============================================================================
// Observation Method - How was the data extracted
// =============================================================================

export const ObservationMethodSchema = z.enum([
  'neural_perception',  // ML model processed image
  'manual_entry',       // Human typed in values
  'sensor_reading',     // Direct sensor measurement
  'rule_inference',     // Derived from other observations
]);

export type ObservationMethod = z.infer<typeof ObservationMethodSchema>;

// =============================================================================
// Observation - Perception output that updates GardenState
// =============================================================================

/**
 * Observation - Interpreted reality from sensors/perception
 *
 * Created by:
 * - Perception model processing Episode frames
 * - Human manual inspection
 * - Direct sensor readings
 *
 * Updates GardenState when applied.
 */
export const ObservationSchema = z.object({
  observation_id: z.string(),
  timestamp: z.string(),                    // ISO datetime - when observed

  // What was observed (at least one required)
  plant_id: z.string().optional(),
  subcell_id: z.string().optional(),

  // Plant observations (sparse - only include what was measured)
  height_cm: z.number().min(0).optional(),
  growth_stage: GrowthStageSchema.optional(),
  fruit_count: z.number().int().min(0).optional(),
  leaf_count: z.number().int().min(0).optional(),
  flower_count: z.number().int().min(0).optional(),

  // Subcell/environment observations
  soil_moisture_pct: z.number().min(0).max(100).optional(),
  soil_temp_f: z.number().optional(),
  pest_detected: z.boolean().optional(),
  disease_detected: z.boolean().optional(),
  weed_detected: z.boolean().optional(),

  // Source tracking (required)
  source: ObservationSourceSchema,

  // Quality metrics
  method: ObservationMethodSchema,
  confidence: z.number().min(0).max(1),     // How confident in this observation

  // Supporting evidence
  image_url: z.string().optional(),         // Image that led to this observation
  bounding_box: z.object({                  // Where in image
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),

  // Metadata
  notes: z.string().optional(),
  applied_to_state: z.boolean().default(false), // Has this updated GardenState?
  applied_at: z.string().optional(),        // When it was applied
  created_at: z.string(),                   // ISO datetime
});

export type Observation = z.infer<typeof ObservationSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new Observation ID
 */
export function createObservationId(plantId?: string, subcellId?: string): string {
  const target = plantId || subcellId || 'unknown';
  return `obs_${target}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if observation has plant data
 */
export function hasPlantData(obs: Observation): boolean {
  return !!(
    obs.plant_id &&
    (obs.height_cm !== undefined ||
     obs.growth_stage !== undefined ||
     obs.fruit_count !== undefined)
  );
}

/**
 * Check if observation has environment data
 */
export function hasEnvironmentData(obs: Observation): boolean {
  return !!(
    obs.soil_moisture_pct !== undefined ||
    obs.soil_temp_f !== undefined ||
    obs.pest_detected !== undefined ||
    obs.disease_detected !== undefined ||
    obs.weed_detected !== undefined
  );
}

/**
 * Get observations for a specific plant
 */
export function getObservationsForPlant(
  observations: Observation[],
  plantId: string
): Observation[] {
  return observations
    .filter(obs => obs.plant_id === plantId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Get latest observation for a plant
 */
export function getLatestObservation(
  observations: Observation[],
  plantId: string
): Observation | null {
  const plantObs = getObservationsForPlant(observations, plantId);
  return plantObs[0] || null;
}

/**
 * Get observations from a specific episode
 */
export function getObservationsFromEpisode(
  observations: Observation[],
  episodeId: string
): Observation[] {
  return observations.filter(
    obs => obs.source.source_type === 'episode' && obs.source.episode_id === episodeId
  );
}

/**
 * Get unapplied observations (pending state updates)
 */
export function getUnappliedObservations(observations: Observation[]): Observation[] {
  return observations.filter(obs => !obs.applied_to_state);
}

/**
 * Filter observations by confidence threshold
 */
export function filterByConfidence(
  observations: Observation[],
  minConfidence: number
): Observation[] {
  return observations.filter(obs => obs.confidence >= minConfidence);
}

/**
 * Group observations by plant
 */
export function groupObservationsByPlant(
  observations: Observation[]
): Map<string, Observation[]> {
  const groups = new Map<string, Observation[]>();

  for (const obs of observations) {
    if (obs.plant_id) {
      const existing = groups.get(obs.plant_id) || [];
      existing.push(obs);
      groups.set(obs.plant_id, existing);
    }
  }

  return groups;
}
