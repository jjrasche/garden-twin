/**
 * Crop succession types — express "plant B after A finishes in the same zone."
 *
 * Trigger is compound: predecessor death percentage AND environmental conditions.
 * This prevents planting a cool-season successor into hostile conditions even
 * if the predecessor died early from a heatwave.
 */

import { z } from 'zod';

/** Condition gate — an environmental factor that must be met for planting. */
export const ConditionGateSchema = z.object({
  factor: z.string(),              // 'temperature_f' | 'soil_temp_f' | 'photoperiod_h'
  threshold: z.number(),
  direction: z.enum(['above', 'below']),
});

export type ConditionGate = z.infer<typeof ConditionGateSchema>;

/** When to plant the successor crop. */
export const SuccessionTriggerSchema = z.object({
  /** Fraction of predecessor plants that must be dead/done (0-1). */
  predecessor_death_pct: z.number().min(0).max(1),
  /** Environmental conditions that must also hold for successor establishment. */
  conditions: z.array(ConditionGateSchema).optional(),
});

export type SuccessionTrigger = z.infer<typeof SuccessionTriggerSchema>;

/** Evaluates a condition gate against current environmental conditions. */
export function evaluateConditionGate(
  gate: ConditionGate,
  conditions: Record<string, number>,
): boolean {
  const value = conditions[gate.factor];
  if (value === undefined) return true; // Unknown factor — pass by default
  return gate.direction === 'above'
    ? value >= gate.threshold
    : value <= gate.threshold;
}
