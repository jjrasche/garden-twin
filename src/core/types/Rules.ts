import { z } from 'zod';
import { TaskTypeSchema } from './Task';

// =============================================================================
// Rule Test Case - For automated testing of rules
// =============================================================================

/**
 * Test case for validating rule behavior
 */
export const RuleTestCaseSchema = z.object({
  name: z.string(),
  description: z.string().optional(),

  // Input context for rule evaluation
  input: z.object({
    plant: z.record(z.any()).optional(),    // PlantInstance-like object
    subcell: z.record(z.any()).optional(),  // SubcellState-like object
    expected: z.record(z.any()).optional(), // Expected state for comparison
    environment: z.record(z.any()).optional(),
  }),

  // Expected output
  expected_output: z.object({
    should_trigger: z.boolean(),
    task_type: TaskTypeSchema.optional(),
    priority: z.number().optional(),
  }),
});

export type RuleTestCase = z.infer<typeof RuleTestCaseSchema>;

// =============================================================================
// Task Rule - Data-driven rule for task generation
// =============================================================================

/**
 * TaskRule - Defines when to generate a task
 *
 * Evaluated by the operational planner using mathjs expression parser.
 * Conditions compare current state vs expected state.
 *
 * Example:
 * {
 *   rule_id: "water_when_dry",
 *   condition: "subcell.soil.moisture_pct < 40",
 *   task_type: "water",
 *   priority: 8
 * }
 */
export const TaskRuleSchema = z.object({
  rule_id: z.string(),
  name: z.string(),
  description: z.string().optional(),

  // Condition expression (evaluated with mathjs)
  // Available variables: plant, subcell, expected, environment
  condition: z.string(),

  // Task generation
  task_type: TaskTypeSchema,
  priority: z.number().int().min(1).max(10),

  // Target type this rule applies to
  target_type: z.enum(['plant', 'subcell', 'zone']),

  // Optional: Additional parameters for generated task
  task_parameters: z.record(z.any()).optional(),

  // Optional: Required capabilities for robot
  required_capabilities: z.array(z.string()).optional(),

  // Optional: Labor classification
  labor_type: z.enum(['manual', 'robot', 'either']).optional(),
  estimated_duration_minutes: z.number().min(0).optional(),

  // Cooldown: Don't regenerate task for same target within this period
  cooldown_days: z.number().int().min(0).optional(),

  // Rule metadata
  enabled: z.boolean().default(true),
  category: z.string().optional(),          // 'irrigation', 'pruning', 'harvest', etc.
  tags: z.array(z.string()).optional(),

  // Testing
  test_cases: z.array(RuleTestCaseSchema).optional(),

  // Metadata
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  version: z.number().int().min(1).default(1),
});

export type TaskRule = z.infer<typeof TaskRuleSchema>;

// =============================================================================
// Rule Set - Collection of rules for operational planner
// =============================================================================

/**
 * RuleSet - Complete set of rules for task generation
 */
export const RuleSetSchema = z.object({
  ruleset_id: z.string(),
  name: z.string(),
  description: z.string().optional(),

  // All rules in this set
  rules: z.array(TaskRuleSchema),

  // Metadata
  version: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type RuleSet = z.infer<typeof RuleSetSchema>;

// =============================================================================
// Default Rules - Starter set of common rules
// =============================================================================

export const DEFAULT_RULES: TaskRule[] = [
  {
    rule_id: 'water_when_dry',
    version: 1,
    name: 'Water when soil is dry',
    description: 'Trigger watering when soil moisture drops below 40% field capacity',
    condition: 'conditions.soil_moisture_pct_fc < 40',
    task_type: 'water',
    priority: 8,
    target_type: 'zone',
    labor_type: 'either',
    estimated_duration_minutes: 30,
    cooldown_days: 1,
    enabled: true,
    category: 'irrigation',
    test_cases: [
      {
        name: 'Triggers when dry',
        input: { environment: { soil_moisture_pct_fc: 35 } },
        expected_output: { should_trigger: true, task_type: 'water', priority: 8 },
      },
      {
        name: 'Does not trigger when moist',
        input: { environment: { soil_moisture_pct_fc: 60 } },
        expected_output: { should_trigger: false },
      },
    ],
  },
  {
    rule_id: 'harvest_ready',
    version: 1,
    name: 'Harvest ready plants',
    description: 'Trigger harvest task when plant biomass hits harvestable threshold. Disabled: lifecycle recurrence handles harvest scheduling with proper batching.',
    condition: 'plant.is_harvestable == true',
    task_type: 'harvest',
    priority: 9,
    target_type: 'plant',
    labor_type: 'either',
    estimated_duration_minutes: 15,
    cooldown_days: 3,
    enabled: false,
    category: 'harvest',
    test_cases: [
      {
        name: 'Triggers when harvestable',
        input: { plant: { is_harvestable: true } },
        expected_output: { should_trigger: true, task_type: 'harvest', priority: 9 },
      },
      {
        name: 'Does not trigger when not ready',
        input: { plant: { is_harvestable: false } },
        expected_output: { should_trigger: false },
      },
    ],
  },
  {
    rule_id: 'inspect_stressed',
    version: 1,
    name: 'Inspect stressed plants',
    description: 'Generate inspection task for plants under stress. Disabled: inspection has no feedback loop — does not resolve stress. Re-enable when Observation system is built.',
    condition: "plant.lifecycle == 'stressed'",
    task_type: 'inspect',
    priority: 7,
    target_type: 'plant',
    labor_type: 'either',
    estimated_duration_minutes: 5,
    cooldown_days: 3,
    enabled: false,
    category: 'health',
    test_cases: [
      {
        name: 'Triggers when stressed',
        input: { plant: { lifecycle: 'stressed' } },
        expected_output: { should_trigger: true, task_type: 'inspect', priority: 7 },
      },
      {
        name: 'Does not trigger when growing',
        input: { plant: { lifecycle: 'growing' } },
        expected_output: { should_trigger: false },
      },
    ],
  },
  {
    rule_id: 'drought_stress_water',
    version: 1,
    name: 'Emergency water drought-stressed plants',
    description: 'Urgent watering when plants accumulate drought stress days. Disabled: water_when_dry handles zone-level watering which resets drought via moisture overlay. Per-plant watering is physically wrong — you water the garden.',
    condition: 'plant.stress.drought_days > 3',
    task_type: 'water',
    priority: 9,
    target_type: 'plant',
    labor_type: 'either',
    estimated_duration_minutes: 10,
    cooldown_days: 1,
    enabled: false,
    category: 'irrigation',
    test_cases: [
      {
        name: 'Triggers after 4 drought days',
        input: { plant: { stress: { drought_days: 4 } } },
        expected_output: { should_trigger: true, task_type: 'water', priority: 9 },
      },
      {
        name: 'Does not trigger at 2 drought days',
        input: { plant: { stress: { drought_days: 2 } } },
        expected_output: { should_trigger: false },
      },
    ],
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new Rule ID
 */
export function createRuleId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Get enabled rules from a set
 */
export function getEnabledRules(rules: TaskRule[]): TaskRule[] {
  return rules.filter(r => r.enabled);
}

/**
 * Get rules by category
 */
export function getRulesByCategory(rules: TaskRule[], category: string): TaskRule[] {
  return rules.filter(r => r.category === category);
}

/**
 * Get rules for a specific target type
 */
export function getRulesForTargetType(
  rules: TaskRule[],
  targetType: 'plant' | 'subcell' | 'zone'
): TaskRule[] {
  return rules.filter(r => r.target_type === targetType);
}

/**
 * Validate rule condition syntax (basic check)
 */
export function isValidCondition(condition: string): boolean {
  // Basic validation - check for balanced parentheses and valid characters
  const validChars = /^[a-zA-Z0-9_\s\.\+\-\*\/\>\<\=\!\&\|\(\)\'\"]+$/;
  if (!validChars.test(condition)) return false;

  let parenCount = 0;
  for (const char of condition) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) return false;
  }

  return parenCount === 0;
}

/**
 * Create a default rule set
 */
export function createDefaultRuleSet(): RuleSet {
  const now = new Date().toISOString();
  return {
    ruleset_id: `ruleset_default_${Date.now()}`,
    name: 'Default Rules',
    description: 'Standard operational rules for garden task generation',
    rules: DEFAULT_RULES,
    version: '1.0.0',
    created_at: now,
    updated_at: now,
  };
}
