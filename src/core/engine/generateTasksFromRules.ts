/**
 * Generate Task[] from TaskRules evaluated against plant state + conditions.
 *
 * Concept function: rules + plants + conditions -> Task[].
 * Each rule is evaluated per-plant (target_type=plant) or once (target_type=zone/garden).
 * Respects cooldown_days against previously completed tasks.
 */

import type { TaskRule } from '../types/Rules';
import type { PlantState } from '../types/PlantState';
import type { Task, TaskType } from '../types/Task';
import { createTaskId, isTaskInCooldown } from '../types/Task';
import type { ConditionsResolver } from '../environment/types';
import { evaluateRule, buildConditionsContext } from './evaluateRule';

/** Generate tasks from rules for a single date. */
export function generateTasksFromRules(
  rules: TaskRule[],
  plants: PlantState[],
  date: Date,
  env: ConditionsResolver,
  completedTasks: Task[],
): Task[] {
  const conditions = buildConditionsContext(env, date);
  const alive = plants.filter(p => p.lifecycle === 'growing' || p.lifecycle === 'stressed');
  const tasks: Task[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (rule.target_type === 'plant') {
      for (const plant of alive) {
        if (rule.cooldown_days && isTaskInCooldown(
          rule.task_type, plant.plant_id, completedTasks, rule.cooldown_days, date,
        )) continue;

        if (evaluateRule(rule, { plant, conditions })) {
          tasks.push(buildRuleTask(rule, date, plant));
        }
      }
    } else {
      // Zone/garden-level rules evaluate once against conditions only
      if (rule.cooldown_days && isTaskInCooldown(
        rule.task_type, '__garden__', completedTasks, rule.cooldown_days, date,
      )) continue;

      if (evaluateRule(rule, { conditions })) {
        tasks.push(buildRuleTask(rule, date));
      }
    }
  }

  return tasks;
}

function buildRuleTask(rule: TaskRule, date: Date, plant?: PlantState): Task {
  const dateIso = date.toISOString();

  return {
    task_id: createTaskId(rule.task_type as TaskType),
    type: rule.task_type as TaskType,
    target: plant
      ? { target_type: 'plant' as const, plant_id: plant.plant_id }
      : { target_type: 'garden' as const },
    parameters: {
      rule_id: rule.rule_id,
      rule_name: rule.name,
      ...(plant ? { species_id: plant.species_id, plant_id: plant.plant_id } : {}),
      ...(rule.task_parameters ?? {}),
    },
    created_at: dateIso,
    priority: rule.priority,
    due_by: dateIso,
    required_capabilities: rule.required_capabilities,
    labor_type: rule.labor_type,
    estimated_duration_minutes: rule.estimated_duration_minutes,
    status: 'queued',
    generated_by_rule: `rule:${rule.rule_id}`,
  };
}
