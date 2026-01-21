/**
 * Quality scorer - aggregates VLM evaluation results
 */

import type { EvaluationResult } from './prompts';

export interface AggregatedScores {
  overall_average: number;
  criterion_averages: {
    clarity: number;
    layout: number;
    responsiveness: number;
    performance: number;
    usability: number;
  };
  pass_threshold: number;
  passed: boolean;
  scenarios_evaluated: number;
  scenarios_passed: number;
  scenarios_failed: number;
}

export interface ScoringOptions {
  passThreshold?: number;        // Default: 85
  scenarioPassThreshold?: number; // Default: 70
}

const DEFAULT_OPTIONS: Required<ScoringOptions> = {
  passThreshold: 85,
  scenarioPassThreshold: 70,
};

/**
 * Aggregate evaluation results from multiple scenarios
 *
 * @param results - Array of evaluation results
 * @param options - Scoring options
 * @returns Aggregated scores and pass/fail status
 */
export function aggregateScores(
  results: EvaluationResult[],
  options: ScoringOptions = {}
): AggregatedScores {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (results.length === 0) {
    throw new Error('Cannot aggregate scores from empty results array');
  }

  // Calculate averages for each criterion
  const criterionTotals = {
    clarity: 0,
    layout: 0,
    responsiveness: 0,
    performance: 0,
    usability: 0,
  };

  let overallTotal = 0;
  let scenariosPassed = 0;

  for (const result of results) {
    criterionTotals.clarity += result.scores.clarity;
    criterionTotals.layout += result.scores.layout;
    criterionTotals.responsiveness += result.scores.responsiveness;
    criterionTotals.performance += result.scores.performance;
    criterionTotals.usability += result.scores.usability;

    overallTotal += result.overall_score;

    if (result.overall_score >= opts.scenarioPassThreshold) {
      scenariosPassed++;
    }
  }

  const count = results.length;

  const criterion_averages = {
    clarity: criterionTotals.clarity / count,
    layout: criterionTotals.layout / count,
    responsiveness: criterionTotals.responsiveness / count,
    performance: criterionTotals.performance / count,
    usability: criterionTotals.usability / count,
  };

  const overall_average = overallTotal / count;
  const passed = overall_average >= opts.passThreshold;

  return {
    overall_average,
    criterion_averages,
    pass_threshold: opts.passThreshold,
    passed,
    scenarios_evaluated: count,
    scenarios_passed: scenariosPassed,
    scenarios_failed: count - scenariosPassed,
  };
}

/**
 * Generate markdown report from evaluation results
 */
export function generateMarkdownReport(
  results: EvaluationResult[],
  aggregated: AggregatedScores,
  scenarios: string[]
): string {
  const lines: string[] = [];

  lines.push('# VLM UI Quality Evaluation Report\n');
  lines.push(`**Date**: ${new Date().toISOString()}\n`);
  lines.push(`**Scenarios Evaluated**: ${aggregated.scenarios_evaluated}\n`);
  lines.push('---\n');

  // Overall Results
  lines.push('## Overall Results\n');
  lines.push(`**Average Score**: ${aggregated.overall_average.toFixed(1)}/100`);
  lines.push(`**Pass Threshold**: ${aggregated.pass_threshold}`);
  lines.push(`**Status**: ${aggregated.passed ? '✅ PASS' : '❌ FAIL'}\n`);

  lines.push(`**Scenarios Passed**: ${aggregated.scenarios_passed}/${aggregated.scenarios_evaluated}`);
  lines.push(`**Scenarios Failed**: ${aggregated.scenarios_failed}/${aggregated.scenarios_evaluated}\n`);

  // Criterion Breakdown
  lines.push('## Criterion Averages\n');
  lines.push('| Criterion | Average Score | Max |');
  lines.push('|-----------|--------------|-----|');
  Object.entries(aggregated.criterion_averages).forEach(([criterion, score]) => {
    const percentage = ((score / 20) * 100).toFixed(0);
    lines.push(`| ${capitalize(criterion)} | ${score.toFixed(1)} | 20 (${percentage}%) |`);
  });
  lines.push('');

  // Individual Scenario Results
  lines.push('## Individual Scenario Results\n');

  results.forEach((result, index) => {
    const scenarioName = scenarios[index] || `Scenario ${index + 1}`;
    const status = result.overall_score >= 70 ? '✅' : '❌';

    lines.push(`### ${status} ${scenarioName}\n`);
    lines.push(`**Overall Score**: ${result.overall_score}/100\n`);
    lines.push(`**Summary**: ${result.summary}\n`);

    lines.push('**Scores**:');
    Object.entries(result.scores).forEach(([criterion, score]) => {
      lines.push(`- **${capitalize(criterion)}**: ${score}/20 - ${result.reasons[criterion as keyof typeof result.reasons]}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
