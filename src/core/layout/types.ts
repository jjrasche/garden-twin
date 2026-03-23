/**
 * Layout domain types — garden definition, solver I/O, zone/placement models.
 *
 * No rendering concepts. No display_group. No screen coordinates.
 * Physical inches from SW corner only.
 */

import type { Polyline } from '../geometry/gardenGeometry';

// ── Garden Definition (physical reality) ─────────────────────────────────────

export interface GardenDefinition {
  bounds: { width_in: number; length_in: number };
  obstructions: Obstruction[];
  infrastructure: InfrastructureRef[];
}

export type Obstruction =
  | { id: string; type: 'rect'; x: [number, number]; y: [number, number] }
  | { id: string; type: 'polyline_buffer'; polyline: Polyline; buffer_in: number };

export interface InfrastructureRef {
  id: string;
  type: 'trellis';
  polyline: Polyline;
  species_ids: string[];
  spacing_in: number;
  start_y: number;
}

// ── Solver Input ─────────────────────────────────────────────────────────────

export interface PlantingRequest {
  species_id: string;
  plant_count: number;
  planting_date: string;
  stagger_days?: number;
  harvest_strategy_id?: string;
  successor?: PlantingRequest;
}

// ── Solver Output ────────────────────────────────────────────────────────────

export interface PlantPlacement {
  plant_id: string;
  species_id: string;
  x: number;
  y: number;
  planted_date: string;
  density_plants_per_sqft: number;
  harvest_strategy_id?: string;
}

export interface PathSegment {
  y: number;
  x: [number, number];
  width_in: number;
}

export interface LayoutResult {
  placements: PlantPlacement[];
  paths: PathSegment[];
  capacity: Record<string, { requested: number; placed: number }>;
  warnings: string[];
}
