import {
  GardenState,
  PlantInstance,
  SubcellState,
  GardenStateSummary,
  calculateSummary,
  getVarianceFromExpected,
  getDaysSincePlanting,
} from '../types/GardenState';
import { Task, TaskStatus, sortTasksByPriority } from '../types/Task';
import { Observation } from '../types/Observation';

// =============================================================================
// Plant Queries
// =============================================================================

/**
 * Get plants needing attention (comparing actual vs projected state)
 * Requires both actual and projected GardenState
 */
export function getPlantsNeedingAttention(
  actualState: GardenState,
  projectedState: GardenState,
  varianceThreshold: number = 20
): PlantInstance[] {
  return actualState.plants.filter(actualPlant => {
    const expectedPlant = projectedState.plants.find(p => p.plant_id === actualPlant.plant_id);
    if (!expectedPlant) return false;

    const variance = getVarianceFromExpected(actualPlant, expectedPlant);
    return Math.abs(variance) > varianceThreshold;
  });
}

/**
 * Get plants by health status
 */
export function getPlantsByHealthStatus(
  state: GardenState,
  status: 'healthy' | 'attention_needed' | 'critical' | 'dead'
): PlantInstance[] {
  return state.plants.filter(p => p.health_status === status);
}

/**
 * Get plants in a specific zone
 */
export function getPlantsInZone(
  state: GardenState,
  zone_x: number,
  zone_y: number
): PlantInstance[] {
  // Get subcells in this zone
  const zoneSubcells = state.subcells.filter(s =>
    s.computed.zone_x === zone_x && s.computed.zone_y === zone_y
  );
  const subcellIds = new Set(zoneSubcells.map(s => s.subcell_id));

  // Get plants whose root or occupied subcells are in this zone
  return state.plants.filter(p =>
    subcellIds.has(p.root_subcell_id) ||
    p.occupied_subcells.some(id => subcellIds.has(id))
  );
}

/**
 * Get plants by growth stage
 */
export function getPlantsByStage(
  state: GardenState,
  stage: PlantInstance['current_stage']
): PlantInstance[] {
  return state.plants.filter(p => p.current_stage === stage);
}

/**
 * Get plants ready for harvest
 */
export function getPlantsReadyForHarvest(state: GardenState): PlantInstance[] {
  return state.plants.filter(p =>
    (p.current_stage === 'fruiting' || p.current_stage === 'harvest') &&
    (p.fruit_count ?? 0) > 0
  );
}

/**
 * Get plants by species
 */
export function getPlantsBySpecies(
  state: GardenState,
  speciesId: string
): PlantInstance[] {
  return state.plants.filter(p => p.species_id === speciesId);
}

// =============================================================================
// Subcell Queries
// =============================================================================

/**
 * Get subcells in a specific zone
 */
export function getSubcellsInZone(
  state: GardenState,
  zone_x: number,
  zone_y: number
): SubcellState[] {
  return state.subcells.filter(s =>
    s.computed.zone_x === zone_x && s.computed.zone_y === zone_y
  );
}

/**
 * Get subcells by type
 */
export function getSubcellsByType(
  state: GardenState,
  type: SubcellState['type']
): SubcellState[] {
  return state.subcells.filter(s => s.type === type);
}

/**
 * Get empty planting subcells (no plant assigned)
 */
export function getEmptyPlantingSubcells(state: GardenState): SubcellState[] {
  return state.subcells.filter(s =>
    s.type === 'planting' && !s.plant_id
  );
}

/**
 * Get subcells with low moisture
 */
export function getDrySubcells(
  state: GardenState,
  threshold: number = 40
): SubcellState[] {
  return state.subcells.filter(s =>
    s.soil.moisture_pct !== undefined && s.soil.moisture_pct < threshold
  );
}

// =============================================================================
// Task Queries
// =============================================================================

/**
 * Get tasks for a specific zone
 */
export function getTasksForZone(
  tasks: Task[],
  zone_x: number,
  zone_y: number
): Task[] {
  return tasks.filter(t =>
    t.target.target_type === 'zone' &&
    t.target.zone_x === zone_x &&
    t.target.zone_y === zone_y
  );
}

/**
 * Get tasks for a specific plant
 */
export function getTasksForPlant(tasks: Task[], plantId: string): Task[] {
  return tasks.filter(t =>
    t.target.target_type === 'plant' && t.target.plant_id === plantId
  );
}

/**
 * Get pending tasks (queued or assigned, not started)
 */
export function getPendingTasks(tasks: Task[]): Task[] {
  return tasks.filter(t =>
    t.status === 'queued' || t.status === 'assigned'
  );
}

/**
 * Get tasks by status
 */
export function getTasksByStatus(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter(t => t.status === status);
}

/**
 * Get overdue tasks
 */
export function getOverdueTasks(tasks: Task[]): Task[] {
  const now = new Date();
  return tasks.filter(t =>
    t.due_by &&
    new Date(t.due_by) < now &&
    (t.status === 'queued' || t.status === 'assigned')
  );
}

/**
 * Compute total labor hours from tasks
 */
export function computeWeeklyLaborHours(tasks: Task[]): number {
  return tasks.reduce((total, t) => {
    const minutes = t.estimated_duration_minutes ?? 0;
    return total + minutes / 60;
  }, 0);
}

/**
 * Group tasks by type
 */
export function groupTasksByType(tasks: Task[]): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const existing = groups.get(task.type) || [];
    existing.push(task);
    groups.set(task.type, existing);
  }
  return groups;
}

/**
 * Get prioritized task queue
 */
export function getPrioritizedTaskQueue(tasks: Task[]): Task[] {
  const pending = getPendingTasks(tasks);
  return sortTasksByPriority(pending);
}

// =============================================================================
// Summary and Statistics
// =============================================================================

/**
 * Compute or refresh GardenState summary
 */
export function computeOrRefreshSummary(
  state: GardenState,
  tasks: Task[]
): GardenStateSummary {
  const pendingTasks = getPendingTasks(tasks);
  return calculateSummary(state.plants, pendingTasks.length);
}

/**
 * Get zone statistics
 */
export function getZoneStats(
  state: GardenState,
  zone_x: number,
  zone_y: number
): {
  plantCount: number;
  healthyCount: number;
  emptySubcells: number;
  avgMoisture: number | null;
} {
  const plants = getPlantsInZone(state, zone_x, zone_y);
  const subcells = getSubcellsInZone(state, zone_x, zone_y);

  const healthy = plants.filter(p =>
    p.health_status === 'healthy' || p.health_score >= 0.8
  ).length;

  const empty = subcells.filter(s =>
    s.type === 'planting' && !s.plant_id
  ).length;

  const moistureReadings = subcells
    .filter(s => s.soil.moisture_pct !== undefined)
    .map(s => s.soil.moisture_pct!);

  const avgMoisture = moistureReadings.length > 0
    ? moistureReadings.reduce((a, b) => a + b, 0) / moistureReadings.length
    : null;

  return {
    plantCount: plants.length,
    healthyCount: healthy,
    emptySubcells: empty,
    avgMoisture,
  };
}

/**
 * Get species distribution
 */
export function getSpeciesDistribution(
  state: GardenState
): Map<string, number> {
  const distribution = new Map<string, number>();
  for (const plant of state.plants) {
    const count = distribution.get(plant.species_id) || 0;
    distribution.set(plant.species_id, count + 1);
  }
  return distribution;
}

// =============================================================================
// State Comparison
// =============================================================================

/**
 * Compare two states and return changes
 */
export function compareStates(
  before: GardenState,
  after: GardenState
): {
  plantsAdded: PlantInstance[];
  plantsRemoved: string[];
  plantsChanged: Array<{ plantId: string; changes: { [key: string]: any } }>;
} {
  const beforePlantIds = new Set(before.plants.map(p => p.plant_id));
  const afterPlantIds = new Set(after.plants.map(p => p.plant_id));

  const plantsAdded = after.plants.filter(p => !beforePlantIds.has(p.plant_id));
  const plantsRemoved = before.plants
    .filter(p => !afterPlantIds.has(p.plant_id))
    .map(p => p.plant_id);

  const plantsChanged: Array<{ plantId: string; changes: { [key: string]: any } }> = [];

  for (const afterPlant of after.plants) {
    const beforePlant = before.plants.find(p => p.plant_id === afterPlant.plant_id);
    if (beforePlant) {
      const changes: { [key: string]: any } = {};

      if (beforePlant.height_cm !== afterPlant.height_cm) {
        changes.height_cm = afterPlant.height_cm;
      }
      if (beforePlant.health_score !== afterPlant.health_score) {
        changes.health_score = afterPlant.health_score;
      }
      if (beforePlant.current_stage !== afterPlant.current_stage) {
        changes.current_stage = afterPlant.current_stage;
      }
      if (beforePlant.fruit_count !== afterPlant.fruit_count) {
        changes.fruit_count = afterPlant.fruit_count;
      }

      if (Object.keys(changes).length > 0) {
        plantsChanged.push({ plantId: afterPlant.plant_id, changes });
      }
    }
  }

  return { plantsAdded, plantsRemoved, plantsChanged };
}

// =============================================================================
// Observation Integration
// =============================================================================

/**
 * Apply observations to update a GardenState (returns new state)
 */
export function applyObservations(
  state: GardenState,
  observations: Observation[]
): GardenState {
  const newPlants = [...state.plants];

  for (const obs of observations) {
    if (obs.plant_id) {
      const plantIndex = newPlants.findIndex(p => p.plant_id === obs.plant_id);
      if (plantIndex >= 0) {
        const plant = { ...newPlants[plantIndex] };

        if (obs.height_cm !== undefined) plant.height_cm = obs.height_cm;
        if (obs.health_score !== undefined) plant.health_score = obs.health_score;
        if (obs.growth_stage !== undefined) plant.current_stage = obs.growth_stage;
        if (obs.fruit_count !== undefined) plant.fruit_count = obs.fruit_count;

        plant.last_observed = obs.timestamp;

        // Update health status based on score
        const healthScore = plant.health_score ?? 0;
        if (healthScore >= 0.8) plant.health_status = 'healthy';
        else if (healthScore >= 0.5) plant.health_status = 'attention_needed';
        else if (healthScore > 0) plant.health_status = 'critical';
        else plant.health_status = 'dead';

        newPlants[plantIndex] = plant;
      }
    }
  }

  return {
    ...state,
    plants: newPlants,
    updated_at: new Date().toISOString(),
  };
}
