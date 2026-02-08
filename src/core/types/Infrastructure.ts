import { z } from 'zod';

/**
 * Position in continuous space (inches from southwest corner)
 */
const PositionSchema = z.object({
  x_in: z.number(),
  y_in: z.number(),
});

/**
 * Mound - Raised planting area
 *
 * Physical mound of soil, typically 12-48" diameter, 4-12" high.
 * Plants on the mound are regular PlantInstance records whose
 * root_subcell_id falls within the mound geometry.
 */
const MoundFeatureSchema = z.object({
  feature_id: z.string(),
  type: z.literal('mound'),
  center: PositionSchema,
  diameter_in: z.number().min(1),
  height_in: z.number().min(0),
});

/**
 * Channel - Water channel or irrigation path
 *
 * Defined by a polyline path with width.
 * Affects moisture of nearby subcells.
 */
const ChannelFeatureSchema = z.object({
  feature_id: z.string(),
  type: z.literal('channel'),
  path: z.array(PositionSchema).min(2),
  width_in: z.number().min(1),
});

/**
 * Trellis - Vertical support structure
 *
 * Line segment with height. Plants can reference this
 * via support_plant_id (for plant-to-plant) or spatial proximity.
 */
const TrellisFeatureSchema = z.object({
  feature_id: z.string(),
  type: z.literal('trellis'),
  start: PositionSchema,
  end: PositionSchema,
  height_in: z.number().min(1),
});

/**
 * Path - Walkway or access route
 *
 * Navigation corridor for robots and humans.
 * Defined by a polyline path with width.
 */
const PathFeatureSchema = z.object({
  feature_id: z.string(),
  type: z.literal('path'),
  path: z.array(PositionSchema).min(2),
  width_in: z.number().min(1),
});

/**
 * InfrastructureFeature - Physical garden feature that isn't a plant
 *
 * Exists in continuous space (inches), not snapped to the subcell grid.
 * Used for robot navigation, layout planning, and rendering.
 */
export const InfrastructureFeatureSchema = z.discriminatedUnion('type', [
  MoundFeatureSchema,
  ChannelFeatureSchema,
  TrellisFeatureSchema,
  PathFeatureSchema,
]);

export type InfrastructureFeature = z.infer<typeof InfrastructureFeatureSchema>;
export type MoundFeature = z.infer<typeof MoundFeatureSchema>;
export type ChannelFeature = z.infer<typeof ChannelFeatureSchema>;
export type TrellisFeature = z.infer<typeof TrellisFeatureSchema>;
export type PathFeature = z.infer<typeof PathFeatureSchema>;
