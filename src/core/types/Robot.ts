import { z } from 'zod';

// =============================================================================
// Robot Capabilities
// =============================================================================

/**
 * Standard capability names for robot-task matching
 */
export const RobotCapabilitySchema = z.enum([
  'navigate',     // Move around garden
  'grip',         // Pick up objects
  'cut',          // Pruning, harvesting
  'rotate',       // Rotate end effector
  'dispense',     // Water, fertilizer
  'photograph',   // Take images
]);

export type RobotCapability = z.infer<typeof RobotCapabilitySchema>;

// =============================================================================
// Robot Status
// =============================================================================

export const RobotStatusSchema = z.enum([
  'idle',           // Ready for tasks
  'navigating',     // Moving to target
  'executing_task', // Performing task
  'charging',       // Battery charging
  'error',          // Something wrong
  'offline',        // Not communicating
]);

export type RobotStatus = z.infer<typeof RobotStatusSchema>;

// =============================================================================
// Localization Method
// =============================================================================

export const LocalizationMethodSchema = z.enum([
  'visual_odom',     // Visual odometry
  'apriltag',        // AprilTag fiducial markers
  'dead_reckoning',  // Wheel encoder only
  'gps',             // Outdoor GPS (if available)
]);

export type LocalizationMethod = z.infer<typeof LocalizationMethodSchema>;

// =============================================================================
// Robot Pose - Position and orientation
// =============================================================================

/**
 * Robot pose in garden coordinates
 */
export const RobotPoseSchema = z.object({
  timestamp: z.string(),                    // ISO datetime
  x_in: z.number(),                         // X position in inches from origin
  y_in: z.number(),                         // Y position in inches from origin
  theta_rad: z.number(),                    // Orientation in radians
  confidence: z.number().min(0).max(1),     // Localization confidence
  method: LocalizationMethodSchema,
});

export type RobotPose = z.infer<typeof RobotPoseSchema>;

// =============================================================================
// Joint State - Arm configuration
// =============================================================================

/**
 * Robot arm joint state
 */
export const JointStateSchema = z.object({
  timestamp: z.string(),                    // ISO datetime
  positions: z.array(z.number()),           // Joint positions (radians or meters)
  velocities: z.array(z.number()).optional(), // Joint velocities
  currents: z.array(z.number()),            // Motor currents (amps) - important for VLA
  targets: z.array(z.number()).optional(),  // Commanded target positions
});

export type JointState = z.infer<typeof JointStateSchema>;

// =============================================================================
// Robot - Executor entity
// =============================================================================

/**
 * Robot - A physical or simulated executor
 *
 * Tracks state, capabilities, and current assignment.
 * Same schema for real robots and Isaac Sim robots.
 */
export const RobotSchema = z.object({
  robot_id: z.string(),
  name: z.string(),

  // Source (real or simulation)
  source: z.enum(['real', 'isaac_sim']),

  // Hardware specs
  capabilities: z.array(RobotCapabilitySchema),
  max_payload_kg: z.number().min(0),
  max_reach_cm: z.number().min(0),
  dof: z.number().int().min(3),             // Degrees of freedom in arm

  // Current state
  status: RobotStatusSchema,
  battery_pct: z.number().min(0).max(100),

  // Position (most recent)
  current_pose: RobotPoseSchema.optional(),

  // Joints (most recent)
  current_joints: JointStateSchema.optional(),

  // Task assignment
  current_task_id: z.string().optional(),
  task_queue: z.array(z.string()).optional(), // Task IDs in order

  // Metadata
  last_seen: z.string(),                    // ISO datetime - last communication
  total_runtime_hours: z.number().min(0),
  created_at: z.string(),                   // ISO datetime
});

export type Robot = z.infer<typeof RobotSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new Robot ID
 */
export function createRobotId(name: string): string {
  return `robot_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
}

/**
 * Check if robot can perform task requiring specific capabilities
 */
export function robotCanPerformTask(
  robot: Robot,
  requiredCapabilities: string[]
): boolean {
  return requiredCapabilities.every(cap =>
    robot.capabilities.includes(cap as RobotCapability)
  );
}

/**
 * Check if robot is available for new tasks
 */
export function isRobotAvailable(robot: Robot): boolean {
  return (
    robot.status === 'idle' &&
    robot.battery_pct > 20 &&
    !robot.current_task_id
  );
}

/**
 * Get distance from robot to target position
 */
export function getDistanceToTarget(
  robot: Robot,
  target_x_in: number,
  target_y_in: number
): number | null {
  if (!robot.current_pose) return null;

  const dx = target_x_in - robot.current_pose.x_in;
  const dy = target_y_in - robot.current_pose.y_in;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find nearest available robot to a position
 */
export function findNearestAvailableRobot(
  robots: Robot[],
  target_x_in: number,
  target_y_in: number,
  requiredCapabilities: string[] = []
): Robot | null {
  const available = robots.filter(r =>
    isRobotAvailable(r) &&
    robotCanPerformTask(r, requiredCapabilities) &&
    r.current_pose !== undefined
  );

  if (available.length === 0) return null;

  let nearest: Robot | null = null;
  let minDistance = Infinity;

  for (const robot of available) {
    const distance = getDistanceToTarget(robot, target_x_in, target_y_in);
    if (distance !== null && distance < minDistance) {
      minDistance = distance;
      nearest = robot;
    }
  }

  return nearest;
}
