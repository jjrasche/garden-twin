// =============================================================================
// Garden Twin Core Types
// =============================================================================
// 6-Object Data Model for garden robotics system
//
// Core Objects:
// 1. PlantSpecies - Genetic/biological reference data
// 2. GardenState  - Temporal snapshot (actual or projected)
// 3. Task         - Work directive for humans or robots
// 4. Robot        - Executor state
// 5. Episode      - VLA training record
// 6. Observation  - Perception output
//
// Supporting:
// - Subcell       - Spatial unit (conditions, not plant state)
// - Rules         - Task generation rules

// Reference data
export * from './PlantSpecies';

// Growth engine state
export * from './PlantState';

// Spatial foundation (conditions, shade, soil)
export * from './Subcell';

// Temporal state (replaces old Garden + Plan + Projection)
export * from './GardenState';

// Execution layer
export * from './Task';
export * from './Robot';
export * from './Episode';
export * from './Observation';

// Infrastructure (physical garden features)
export * from './Infrastructure';

// Rules engine
export * from './Rules';

// Pest/companion model (Companion → Pest → Crop chain)
export * from './Pest';
