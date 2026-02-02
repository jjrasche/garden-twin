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
    description: 'Trigger watering when soil moisture drops below 40%',
    condition: 'subcell.soil.moisture_pct < 40',
    task_type: 'water',
    priority: 8,
    target_type: 'subcell',
    labor_type: 'either',
    estimated_duration_minutes: 5,
    cooldown_days: 1,
    enabled: true,
    category: 'irrigation',
    test_cases: [
      {
        name: 'Triggers when dry',
        input: { subcell: { soil: { moisture_pct: 35 } } },
        expected_output: { should_trigger: true, task_type: 'water', priority: 8 },
      },
      {
        name: 'Does not trigger when moist',
        input: { subcell: { soil: { moisture_pct: 60 } } },
        expected_output: { should_trigger: false },
      },
    ],
  },
  {
    rule_id: 'prune_overgrown',
    version: 1,
    name: 'Prune overgrown plants',
    description: 'Trigger pruning when plant exceeds expected height by 20%',
    condition: 'plant.height_cm > expected.height_cm * 1.2',
    task_type: 'prune',
    priority: 6,
    target_type: 'plant',
    required_capabilities: ['cut'],
    labor_type: 'either',
    estimated_duration_minutes: 10,
    cooldown_days: 7,
    enabled: true,
    category: 'pruning',
    test_cases: [
      {
        name: 'Triggers when overgrown',
        input: { plant: { height_cm: 60 }, expected: { height_cm: 45 } },
        expected_output: { should_trigger: true, task_type: 'prune', priority: 6 },
      },
      {
        name: 'Does not trigger when normal',
        input: { plant: { height_cm: 50 }, expected: { height_cm: 45 } },
        expected_output: { should_trigger: false },
      },
    ],
  },
  {
    rule_id: 'harvest_ripe',
    version: 1,
    name: 'Harvest ripe produce',
    description: 'Trigger harvest when plant reaches fruiting stage with fruit',
    condition: "plant.current_stage == 'fruiting' and plant.fruit_count > 0",
    task_type: 'harvest',
    priority: 9,
    target_type: 'plant',
    required_capabilities: ['grip'],
    labor_type: 'either',
    estimated_duration_minutes: 15,
    cooldown_days: 3,
    enabled: true,
    category: 'harvest',
    test_cases: [
      {
        name: 'Triggers when fruiting with fruit',
        input: { plant: { current_stage: 'fruiting', fruit_count: 5 } },
        expected_output: { should_trigger: true, task_type: 'harvest', priority: 9 },
      },
      {
        name: 'Does not trigger when no fruit',
        input: { plant: { current_stage: 'fruiting', fruit_count: 0 } },
        expected_output: { should_trigger: false },
      },
    ],
  },
  {
    rule_id: 'inspect_daily',
    version: 1,
    name: 'Daily inspection',
    description: 'Generate inspection task for zones that have not been inspected today',
    condition: 'true',  // Always triggers, deduplication handles frequency
    task_type: 'inspect',
    priority: 3,
    target_type: 'zone',
    required_capabilities: ['photograph'],
    labor_type: 'robot',
    estimated_duration_minutes: 5,
    cooldown_days: 1,
    enabled: true,
    category: 'inspection',
  },
  {
    rule_id: 'weed_detected',
    version: 1,
    name: 'Remove detected weeds',
    description: 'Trigger weeding when weeds are detected in subcell',
    condition: 'subcell.weed_detected == true',
    task_type: 'weed',
    priority: 5,
    target_type: 'subcell',
    required_capabilities: ['grip'],
    labor_type: 'either',
    estimated_duration_minutes: 10,
    cooldown_days: 3,
    enabled: true,
    category: 'maintenance',
  },
  {
    rule_id: 'plant_unhealthy',
    version: 1,
    name: 'Inspect unhealthy plants',
    description: 'Generate inspection task for plants with low health score',
    condition: 'plant.health_score < 0.5',
    task_type: 'inspect',
    priority: 7,
    target_type: 'plant',
    required_capabilities: ['photograph'],
    labor_type: 'either',
    estimated_duration_minutes: 5,
    cooldown_days: 1,
    enabled: true,
    category: 'health',
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
