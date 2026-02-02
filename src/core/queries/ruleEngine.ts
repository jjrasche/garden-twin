import { TaskRule } from '../types/Rules';
import { Task, TaskType, isDuplicateTask } from '../types/Task';
import { GardenState, PlantInstance } from '../types/GardenState';
import { SubcellState } from '../types/GardenState';
import * as math from 'mathjs';

// =============================================================================
// Rule Evaluation
// =============================================================================

/**
 * Evaluate a rule condition against context
 * Uses mathjs for safe expression evaluation
 */
export function evaluateRuleCondition(
  rule: TaskRule,
  context: {
    plant?: PlantInstance;
    subcell?: SubcellState;
    expected?: PlantInstance;
    environment?: any;
  }
): boolean {
  try {
    const result = math.evaluate(rule.condition, context);
    return Boolean(result);
  } catch (error) {
    console.error(`Failed to evaluate rule ${rule.rule_id}:`, error);
    return false;
  }
}

/**
 * Check if task should be generated based on cooldown
 * Checks task history against rule's cooldown_days
 */
export function isInCooldownPeriod(
  rule: TaskRule,
  targetId: string,
  taskHistory: Task[]
): boolean {
  if (!rule.cooldown_days) return false;

  const cooldownMs = rule.cooldown_days * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return taskHistory.some(task => {
    // Check if task matches rule's type
    if (task.type !== rule.task_type) return false;

    // Check if task was completed
    if (task.status !== 'completed') return false;
    if (!task.completed_at) return false;

    // Check if within cooldown period
    const completedTime = new Date(task.completed_at).getTime();
    if (now - completedTime > cooldownMs) return false;

    // Check if target matches
    switch (task.target.target_type) {
      case 'plant':
        return task.target.plant_id === targetId;
      case 'subcell':
        return task.target.subcell_id === targetId;
      default:
        return false;
    }
  });
}

/**
 * Check if task should be generated (deduplication logic)
 */
export function shouldGenerateTask(
  rule: TaskRule,
  targetId: string,
  existingTasks: Task[],
  taskHistory: Task[]
): boolean {
  // Check if identical task already queued
  const duplicateQueued = existingTasks.some(task =>
    task.type === rule.task_type &&
    task.status !== 'completed' &&
    task.status !== 'failed' &&
    task.status !== 'cancelled' &&
    matchesTarget(task, targetId)
  );

  if (duplicateQueued) return false;

  // Check cooldown period
  if (isInCooldownPeriod(rule, targetId, taskHistory)) {
    return false;
  }

  return true;
}

/**
 * Helper to check if task matches target ID
 */
function matchesTarget(task: Task, targetId: string): boolean {
  switch (task.target.target_type) {
    case 'plant':
      return task.target.plant_id === targetId;
    case 'subcell':
      return task.target.subcell_id === targetId;
    default:
      return false;
  }
}

// =============================================================================
// Task Generation from Rules
// =============================================================================

/**
 * Generate tasks from rules for a GardenState
 * Compares actual vs projected state
 */
export function generateTasksFromRules(
  rules: TaskRule[],
  actualState: GardenState,
  projectedState: GardenState,
  existingTasks: Task[],
  taskHistory: Task[]
): Task[] {
  const newTasks: Task[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    switch (rule.target_type) {
      case 'plant':
        newTasks.push(...generatePlantTasks(rule, actualState, projectedState, existingTasks, taskHistory));
        break;
      case 'subcell':
        newTasks.push(...generateSubcellTasks(rule, actualState, projectedState, existingTasks, taskHistory));
        break;
      case 'zone':
        newTasks.push(...generateZoneTasks(rule, actualState, existingTasks, taskHistory));
        break;
    }
  }

  return newTasks;
}

/**
 * Generate plant-targeted tasks
 */
function generatePlantTasks(
  rule: TaskRule,
  actualState: GardenState,
  projectedState: GardenState,
  existingTasks: Task[],
  taskHistory: Task[]
): Task[] {
  const tasks: Task[] = [];

  for (const actualPlant of actualState.plants) {
    const expectedPlant = projectedState.plants.find(p => p.plant_id === actualPlant.plant_id);

    const context = {
      plant: actualPlant,
      expected: expectedPlant,
      environment: actualState.environment,
    };

    if (evaluateRuleCondition(rule, context)) {
      if (shouldGenerateTask(rule, actualPlant.plant_id, existingTasks, taskHistory)) {
        tasks.push({
          task_id: `task_${rule.task_type}_${actualPlant.plant_id}_${Date.now()}`,
          type: rule.task_type,
          target: {
            target_type: 'plant',
            plant_id: actualPlant.plant_id,
          },
          parameters: rule.task_parameters,
          created_at: new Date().toISOString(),
          priority: rule.priority,
          status: 'queued',
          required_capabilities: rule.required_capabilities,
          labor_type: rule.labor_type,
          estimated_duration_minutes: rule.estimated_duration_minutes,
          generated_by_rule: rule.rule_id,
          garden_state_id: actualState.state_id,
        });
      }
    }
  }

  return tasks;
}

/**
 * Generate subcell-targeted tasks
 */
function generateSubcellTasks(
  rule: TaskRule,
  actualState: GardenState,
  projectedState: GardenState,
  existingTasks: Task[],
  taskHistory: Task[]
): Task[] {
  const tasks: Task[] = [];

  for (const subcell of actualState.subcells) {
    const context = {
      subcell,
      environment: actualState.environment,
    };

    if (evaluateRuleCondition(rule, context)) {
      if (shouldGenerateTask(rule, subcell.subcell_id, existingTasks, taskHistory)) {
        tasks.push({
          task_id: `task_${rule.task_type}_${subcell.subcell_id}_${Date.now()}`,
          type: rule.task_type,
          target: {
            target_type: 'subcell',
            subcell_id: subcell.subcell_id,
          },
          parameters: rule.task_parameters,
          created_at: new Date().toISOString(),
          priority: rule.priority,
          status: 'queued',
          required_capabilities: rule.required_capabilities,
          labor_type: rule.labor_type,
          estimated_duration_minutes: rule.estimated_duration_minutes,
          generated_by_rule: rule.rule_id,
          garden_state_id: actualState.state_id,
        });
      }
    }
  }

  return tasks;
}

/**
 * Generate zone-targeted tasks
 */
function generateZoneTasks(
  rule: TaskRule,
  actualState: GardenState,
  existingTasks: Task[],
  taskHistory: Task[]
): Task[] {
  const tasks: Task[] = [];

  // Get unique zones from grid
  const zones = new Set<string>();
  for (const subcell of actualState.subcells) {
    zones.add(`${subcell.computed.zone_x}_${subcell.computed.zone_y}`);
  }

  for (const zoneKey of zones) {
    const [zone_x, zone_y] = zoneKey.split('_').map(Number);

    const context = {
      environment: actualState.environment,
    };

    if (evaluateRuleCondition(rule, context)) {
      if (shouldGenerateTask(rule, zoneKey, existingTasks, taskHistory)) {
        tasks.push({
          task_id: `task_${rule.task_type}_zone_${zone_x}_${zone_y}_${Date.now()}`,
          type: rule.task_type,
          target: {
            target_type: 'zone',
            zone_x,
            zone_y,
          },
          parameters: rule.task_parameters,
          created_at: new Date().toISOString(),
          priority: rule.priority,
          status: 'queued',
          required_capabilities: rule.required_capabilities,
          labor_type: rule.labor_type,
          estimated_duration_minutes: rule.estimated_duration_minutes,
          generated_by_rule: rule.rule_id,
          garden_state_id: actualState.state_id,
        });
      }
    }
  }

  return tasks;
}
