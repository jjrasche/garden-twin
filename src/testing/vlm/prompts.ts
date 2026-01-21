/**
 * VLM evaluation prompts for UI quality assessment
 */

export interface UIEvaluationCriteria {
  clarity: string;
  layout: string;
  responsiveness: string;
  performance: string;
  usability: string;
}

export const EVALUATION_CRITERIA: UIEvaluationCriteria = {
  clarity: 'Text is readable, UI elements are distinguishable, visual hierarchy is clear',
  layout: 'Components are well-organized, spacing is consistent, no overlapping elements',
  responsiveness: 'UI adapts to viewport size, no horizontal scrolling, touch targets are adequate',
  performance: 'UI feels responsive, no lag indicators, smooth transitions',
  usability: 'Controls are intuitive, navigation is clear, user can accomplish tasks',
};

export function getSystemPrompt(): string {
  return `You are a UI quality evaluator. You will be shown screenshots of a web application called "Garden Twin" - a hierarchical garden planning tool.

Your task is to evaluate the UI quality based on these criteria:

1. **Clarity** (0-20 points): ${EVALUATION_CRITERIA.clarity}
2. **Layout** (0-20 points): ${EVALUATION_CRITERIA.layout}
3. **Responsiveness** (0-20 points): ${EVALUATION_CRITERIA.responsiveness}
4. **Performance** (0-20 points): ${EVALUATION_CRITERIA.performance}
5. **Usability** (0-20 points): ${EVALUATION_CRITERIA.usability}

For each criterion, assign a score from 0-20 and provide a brief reason.

IMPORTANT: Output your evaluation as valid JSON with this exact structure:
{
  "scores": {
    "clarity": <number 0-20>,
    "layout": <number 0-20>,
    "responsiveness": <number 0-20>,
    "performance": <number 0-20>,
    "usability": <number 0-20>
  },
  "reasons": {
    "clarity": "<brief explanation>",
    "layout": "<brief explanation>",
    "responsiveness": "<brief explanation>",
    "performance": "<brief explanation>",
    "usability": "<brief explanation>"
  },
  "overall_score": <sum of all scores, 0-100>,
  "summary": "<2-3 sentence overall assessment>"
}

Be objective and specific in your evaluation. Focus on what you can observe in the screenshot.`;
}

export interface ScenarioContext {
  name: string;
  description: string;
  expectedFeatures: string[];
}

export function getUserPrompt(context: ScenarioContext): string {
  const features = context.expectedFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n');

  return `Evaluate this screenshot of the Garden Twin application.

**Scenario**: ${context.name}
**Description**: ${context.description}

**Expected Features**:
${features}

Please evaluate the UI quality based on the criteria provided and output valid JSON.`;
}

export interface EvaluationResult {
  scores: {
    clarity: number;
    layout: number;
    responsiveness: number;
    performance: number;
    usability: number;
  };
  reasons: {
    clarity: string;
    layout: string;
    responsiveness: string;
    performance: string;
    usability: string;
  };
  overall_score: number;
  summary: string;
}

/**
 * Validate evaluation result structure
 */
export function validateEvaluationResult(result: unknown): result is EvaluationResult {
  if (typeof result !== 'object' || result === null) {
    return false;
  }

  const r = result as Record<string, unknown>;

  // Check scores
  if (typeof r.scores !== 'object' || r.scores === null) return false;
  const scores = r.scores as Record<string, unknown>;
  const scoreKeys = ['clarity', 'layout', 'responsiveness', 'performance', 'usability'];
  for (const key of scoreKeys) {
    if (typeof scores[key] !== 'number') return false;
    if (scores[key] < 0 || scores[key] > 20) return false;
  }

  // Check reasons
  if (typeof r.reasons !== 'object' || r.reasons === null) return false;
  const reasons = r.reasons as Record<string, unknown>;
  for (const key of scoreKeys) {
    if (typeof reasons[key] !== 'string') return false;
  }

  // Check overall_score
  if (typeof r.overall_score !== 'number') return false;
  if (r.overall_score < 0 || r.overall_score > 100) return false;

  // Check summary
  if (typeof r.summary !== 'string') return false;

  return true;
}
