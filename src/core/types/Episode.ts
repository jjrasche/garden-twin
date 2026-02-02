import { z } from 'zod';
import { RobotPoseSchema, JointStateSchema } from './Robot';

// =============================================================================
// Camera Frame - Single image capture
// =============================================================================

/**
 * A single camera frame captured during task execution
 */
export const CameraFrameSchema = z.object({
  timestamp: z.string(),                    // ISO datetime
  camera_id: z.string(),                    // Which camera (if multiple)
  image_url: z.string(),                    // S3/blob storage path

  // Robot state at capture time
  pose_at_capture: z.object({
    x_in: z.number(),
    y_in: z.number(),
    theta_rad: z.number(),
  }),

  // Optional: Joint state at capture (for arm-mounted cameras)
  joints_at_capture: z.array(z.number()).optional(),

  // Image metadata
  width_px: z.number().int().optional(),
  height_px: z.number().int().optional(),
  format: z.enum(['jpeg', 'png', 'raw']).optional(),
});

export type CameraFrame = z.infer<typeof CameraFrameSchema>;

// =============================================================================
// Failure Mode - Why an episode failed
// =============================================================================

export const FailureModeSchema = z.enum([
  'grip_failed',        // Could not grasp object
  'plant_not_found',    // Target plant not visible
  'collision',          // Hit something
  'timeout',            // Took too long
  'localization_lost',  // Lost position tracking
  'battery_low',        // Battery depleted
  'user_abort',         // Human stopped it
  'hardware_error',     // Motor/sensor failure
  'unknown',            // Unclassified failure
]);

export type FailureMode = z.infer<typeof FailureModeSchema>;

// =============================================================================
// Episode - Complete execution record for VLA training
// =============================================================================

/**
 * Episode - Record of task execution
 *
 * Contains all data needed for VLA training:
 * - Camera frames (visual input)
 * - Joint trajectories (action output)
 * - Pose trajectories (robot movement)
 * - Success/failure outcome
 *
 * Same schema for real robots and Isaac Sim.
 */
export const EpisodeSchema = z.object({
  episode_id: z.string(),

  // What was executed
  task_id: z.string(),
  robot_id: z.string(),

  // Source (real or simulation)
  source: z.enum(['real', 'isaac_sim']),

  // Timing
  start_time: z.string(),                   // ISO datetime
  end_time: z.string(),                     // ISO datetime
  duration_seconds: z.number().min(0),

  // Telemetry streams
  camera_frames: z.array(CameraFrameSchema),
  joint_trajectory: z.array(JointStateSchema),
  pose_trajectory: z.array(RobotPoseSchema),

  // Outcome
  success: z.boolean(),
  failure_mode: FailureModeSchema.optional(),
  failure_details: z.string().optional(),

  // VLA training metadata
  teleop: z.boolean(),                      // Was this teleoperated?
  vla_model_version: z.string().optional(), // Which VLA model (if autonomous)
  human_corrections: z.number().int().min(0).optional(), // Interventions count

  // State linkage (for before/after comparison)
  state_before_id: z.string().optional(),   // GardenState ID before task
  state_after_id: z.string().optional(),    // GardenState ID after task

  // Observations generated from this episode
  observation_ids: z.array(z.string()).optional(),

  // Storage optimization
  compressed: z.boolean().default(false),
  sample_rate_hz: z.number().optional(),    // If downsampled

  // Metadata
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),     // For filtering/search
  created_at: z.string(),                   // ISO datetime
});

export type Episode = z.infer<typeof EpisodeSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new Episode ID
 */
export function createEpisodeId(taskId: string): string {
  return `ep_${taskId}_${Date.now()}`;
}

/**
 * Calculate episode statistics
 */
export function getEpisodeStats(episode: Episode) {
  return {
    frameCount: episode.camera_frames.length,
    trajectoryLength: episode.joint_trajectory.length,
    durationSeconds: episode.duration_seconds,
    framesPerSecond: episode.camera_frames.length / episode.duration_seconds,
    wasAutonomous: !episode.teleop,
    hadCorrections: (episode.human_corrections || 0) > 0,
  };
}

/**
 * Get frame at specific timestamp (or nearest)
 */
export function getFrameAtTime(
  episode: Episode,
  timestamp: string
): CameraFrame | null {
  if (episode.camera_frames.length === 0) return null;

  const targetTime = new Date(timestamp).getTime();
  let nearest = episode.camera_frames[0];
  let minDiff = Math.abs(new Date(nearest.timestamp).getTime() - targetTime);

  for (const frame of episode.camera_frames) {
    const diff = Math.abs(new Date(frame.timestamp).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = frame;
    }
  }

  return nearest || null;
}

/**
 * Get joint state at specific timestamp (or nearest)
 */
export function getJointsAtTime(
  episode: Episode,
  timestamp: string
): z.infer<typeof JointStateSchema> | null {
  if (episode.joint_trajectory.length === 0) return null;

  const targetTime = new Date(timestamp).getTime();
  let nearest = episode.joint_trajectory[0];
  let minDiff = Math.abs(new Date(nearest.timestamp).getTime() - targetTime);

  for (const joints of episode.joint_trajectory) {
    const diff = Math.abs(new Date(joints.timestamp).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = joints;
    }
  }

  return nearest || null;
}

/**
 * Filter episodes for VLA training (successful teleop episodes)
 */
export function getTrainingEpisodes(episodes: Episode[]): Episode[] {
  return episodes.filter(ep =>
    ep.success &&
    ep.teleop &&
    ep.camera_frames.length > 0 &&
    ep.joint_trajectory.length > 0
  );
}

/**
 * Get episode success rate for a task type
 */
export function getSuccessRate(episodes: Episode[]): number {
  if (episodes.length === 0) return 0;
  const successful = episodes.filter(ep => ep.success).length;
  return successful / episodes.length;
}
