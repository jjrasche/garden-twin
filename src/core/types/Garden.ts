import { z } from 'zod';
import { SubcellSchema } from './Subcell';

/**
 * Geographic location
 */
export const LocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  city: z.string(),
  state: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string(),          // IANA timezone (e.g., "America/New_York")
});

export type Location = z.infer<typeof LocationSchema>;

/**
 * Grid configuration
 */
export const GridConfigSchema = z.object({
  width_ft: z.number().int().min(1),      // Garden width in feet
  length_ft: z.number().int().min(1),     // Garden length in feet
  subcell_size_in: z.number().int().min(1), // Always 3 inches
  total_subcells: z.number().int().min(1),  // width_in/3 × length_in/3
});

export type GridConfig = z.infer<typeof GridConfigSchema>;

/**
 * Garden - Complete garden with all subcells
 *
 * This is the root data structure containing all 64,000 subcells (for 40×100 ft garden).
 * All spatial data is stored at subcell resolution.
 */
export const GardenSchema = z.object({
  id: z.string(),
  location: LocationSchema,
  grid: GridConfigSchema,

  // All subcells (the single source of truth)
  subcells: z.array(SubcellSchema),

  // Metadata
  created_at: z.string(),          // ISO datetime
  updated_at: z.string(),          // ISO datetime
});

export type Garden = z.infer<typeof GardenSchema>;

/**
 * Calculate total subcells for a garden
 */
export function calculateTotalSubcells(width_ft: number, length_ft: number, subcell_size_in: number): number {
  const width_in = width_ft * 12;
  const length_in = length_ft * 12;
  const subcells_x = Math.floor(width_in / subcell_size_in);
  const subcells_y = Math.floor(length_in / subcell_size_in);
  return subcells_x * subcells_y;
}

/**
 * Get garden dimensions in different units
 */
export function getGardenDimensions(grid: GridConfig) {
  return {
    width: {
      ft: grid.width_ft,
      in: grid.width_ft * 12,
      subcells: Math.floor((grid.width_ft * 12) / grid.subcell_size_in),
      cells: grid.width_ft,
      zones: Math.floor(grid.width_ft / 10),
    },
    length: {
      ft: grid.length_ft,
      in: grid.length_ft * 12,
      subcells: Math.floor((grid.length_ft * 12) / grid.subcell_size_in),
      cells: grid.length_ft,
      zones: Math.floor(grid.length_ft / 10),
    },
    total_area_sq_ft: grid.width_ft * grid.length_ft,
  };
}
