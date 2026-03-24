/**
 * Evaluate a TaskRule condition against plant + conditions context.
 *
 * Leaf function: one rule, one context -> boolean.
 * Uses safe property-path resolution instead of eval/Function.
 */

import type { TaskRule } from '../types/Rules';
import type { PlantState } from '../types/PlantState';
import type { ConditionsResolver } from '../environment/types';

export interface RuleContext {
  plant?: PlantState;
  conditions?: Record<string, number | undefined>;
}

/**
 * Evaluate a rule's condition string against context. Returns true if the rule fires.
 * Callers are responsible for checking rule.enabled before calling.
 */
export function evaluateRule(rule: TaskRule, ctx: RuleContext): boolean {
  return evaluateCondition(rule.condition, ctx);
}

/**
 * Parse and evaluate a simple condition expression.
 *
 * Supports:
 *   - Property access: plant.stage, conditions.soil_moisture_pct_fc
 *   - Comparisons: ==, !=, <, >, <=, >=
 *   - Logical: and, or
 *   - String literals: 'value' or "value"
 *   - Number literals: 42, 3.14
 *   - Boolean: true, false
 *
 * Limitation: and/or are evaluated left-to-right with NO operator precedence.
 * "A or B and C" evaluates as "(A or B) and C", not "A or (B and C)".
 * Avoid mixing and/or in a single condition. Use separate rules instead.
 */
export function evaluateCondition(condition: string, ctx: RuleContext): boolean {
  const parts = splitLogical(condition);

  if (parts.length === 1) {
    return evaluateComparison(parts[0]!.expr, ctx);
  }

  let result = evaluateComparison(parts[0]!.expr, ctx);
  for (let i = 1; i < parts.length; i++) {
    const { op, expr } = parts[i]!;
    const value = evaluateComparison(expr, ctx);
    result = op === 'and' ? result && value : result || value;
  }
  return result;
}

interface LogicalPart {
  op: 'and' | 'or' | 'start';
  expr: string;
}

function splitLogical(condition: string): LogicalPart[] {
  const parts: LogicalPart[] = [];
  const tokens = condition.split(/\b(and|or)\b/);
  let currentOp: 'and' | 'or' | 'start' = 'start';

  for (const token of tokens) {
    const trimmed = token.trim();
    if (trimmed === 'and' || trimmed === 'or') {
      currentOp = trimmed;
    } else if (trimmed.length > 0) {
      parts.push({ op: currentOp, expr: trimmed });
      currentOp = 'start';
    }
  }
  return parts;
}

function evaluateComparison(expr: string, ctx: RuleContext): boolean {
  // Match: left operator right
  const match = expr.match(/^(.+?)\s*(===?|!==?|<=?|>=?)\s*(.+)$/);
  if (!match) {
    // Bare truthy check (e.g. "true" or "plant.is_harvestable")
    const val = resolveValue(expr.trim(), ctx);
    return Boolean(val);
  }

  const [, leftRaw, op, rightRaw] = match;
  const left = resolveValue(leftRaw!.trim(), ctx);
  const right = resolveValue(rightRaw!.trim(), ctx);

  if (left === undefined || right === undefined) return false;

  switch (op) {
    case '==':
    case '===':
      return left === right;
    case '!=':
    case '!==':
      return left !== right;
    case '<':
      return (left as number) < (right as number);
    case '>':
      return (left as number) > (right as number);
    case '<=':
      return (left as number) <= (right as number);
    case '>=':
      return (left as number) >= (right as number);
    default:
      return false;
  }
}

type ResolvedValue = string | number | boolean | undefined;

function resolveValue(token: string, ctx: RuleContext): ResolvedValue {
  // String literal
  if ((token.startsWith("'") && token.endsWith("'")) ||
      (token.startsWith('"') && token.endsWith('"'))) {
    return token.slice(1, -1);
  }

  // Number literal
  const num = Number(token);
  if (!isNaN(num) && token.length > 0) return num;

  // Boolean literal
  if (token === 'true') return true;
  if (token === 'false') return false;

  // Property path: plant.stage, conditions.soil_moisture_pct_fc
  return resolvePath(token, ctx);
}

function resolvePath(path: string, ctx: RuleContext): ResolvedValue {
  const segments = path.split('.');
  const root = segments[0];

  let current: unknown;
  if (root === 'plant') {
    current = ctx.plant;
  } else if (root === 'conditions') {
    current = ctx.conditions;
  } else {
    return undefined;
  }

  for (let i = 1; i < segments.length; i++) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[segments[i]!];
  }

  if (typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean') {
    return current;
  }
  return undefined;
}

/** Build a conditions record from ConditionsResolver for rule evaluation. */
export function buildConditionsContext(
  env: ConditionsResolver,
  date: Date,
): Record<string, number | undefined> {
  const cond = env.getConditions(date);
  return {
    temperature_f: cond.avg_high_f,
    temperature_low_f: cond.avg_low_f,
    soil_temp_f: cond.soil_temp_f,
    photoperiod_h: cond.photoperiod_h,
    soil_moisture_pct_fc: cond.soil_moisture_pct_fc,
    sunshine_hours: cond.sunshine_hours,
    solar_radiation_mj: cond.solar_radiation_mj,
  };
}
