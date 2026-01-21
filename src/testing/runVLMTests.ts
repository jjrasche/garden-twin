/**
 * VLM test runner - orchestrates screenshot capture and evaluation
 */

import fs from 'fs';
import path from 'path';
import { captureScreenshots, clearScreenshots } from './screenshots/captureScreenshots';
import { TEST_SCENARIOS, getScenarioNames } from './screenshots/scenarios';
import { evaluateMultiple, type EvaluationInput } from './vlm/evaluator';
import { aggregateScores, generateMarkdownReport } from './vlm/scorer';
import type { EvaluationResult } from './vlm/prompts';

export interface VLMTestOptions {
  /**
   * Scenarios to run (default: all)
   */
  scenarios?: string[];

  /**
   * Output directory for screenshots
   */
  screenshotDir?: string;

  /**
   * Output directory for reports
   */
  reportDir?: string;

  /**
   * Headless browser mode
   */
  headless?: boolean;

  /**
   * Pass threshold (0-100)
   */
  passThreshold?: number;

  /**
   * Clear screenshots before running
   */
  clearPrevious?: boolean;

  /**
   * Skip screenshot capture (use existing)
   */
  skipCapture?: boolean;
}

const DEFAULT_OPTIONS: Required<VLMTestOptions> = {
  scenarios: [],
  screenshotDir: 'tests/vlm-screenshots',
  reportDir: 'tests/vlm-reports',
  headless: true,
  passThreshold: 85,
  clearPrevious: true,
  skipCapture: false,
};

/**
 * Run VLM tests
 *
 * @param options - Test options
 * @returns Exit code (0 = pass, 1 = fail)
 */
export async function runVLMTests(options: VLMTestOptions = {}): Promise<number> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  console.log('='.repeat(60));
  console.log('Garden Twin - VLM UI Quality Evaluation');
  console.log('='.repeat(60));

  // Validate GROQ API key
  if (!process.env.GROQ_API_KEY) {
    console.error('\n❌ ERROR: GROQ_API_KEY environment variable not set');
    console.error('   Set it in .env file or export GROQ_API_KEY=your-key\n');
    return 1;
  }

  // Select scenarios
  const scenariosToRun =
    opts.scenarios.length > 0
      ? TEST_SCENARIOS.filter((s) => opts.scenarios.includes(s.name))
      : TEST_SCENARIOS;

  if (scenariosToRun.length === 0) {
    console.error('\n❌ ERROR: No scenarios found matching filters\n');
    return 1;
  }

  console.log(`\nRunning ${scenariosToRun.length} scenario(s):`);
  scenariosToRun.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (${s.viewport.width}×${s.viewport.height})`);
  });

  // Ensure output directories exist
  if (!fs.existsSync(opts.screenshotDir)) {
    fs.mkdirSync(opts.screenshotDir, { recursive: true });
  }
  if (!fs.existsSync(opts.reportDir)) {
    fs.mkdirSync(opts.reportDir, { recursive: true });
  }

  try {
    // Step 1: Capture screenshots
    let screenshotResults;
    if (opts.skipCapture) {
      console.log('\n⏭️  Skipping screenshot capture (using existing)');
      screenshotResults = scenariosToRun.map((s) => ({
        scenarioName: s.name,
        screenshotPath: getScreenshotPath(s.name, opts.screenshotDir),
        success: true,
        error: undefined,
      }));
    } else {
      if (opts.clearPrevious) {
        console.log(`\n🗑️  Clearing previous screenshots...`);
        clearScreenshots(opts.screenshotDir);
      }

      console.log('\n📸 Step 1: Capturing screenshots...');
      screenshotResults = await captureScreenshots(scenariosToRun, {
        outputDir: opts.screenshotDir,
        headless: opts.headless,
      });
    }

    const failedCaptures = screenshotResults.filter((r) => !r.success);
    if (failedCaptures.length > 0) {
      console.error(`\n❌ ${failedCaptures.length} screenshot(s) failed to capture`);
      failedCaptures.forEach((r) => {
        console.error(`   - ${r.scenarioName}: ${r.error}`);
      });
      return 1;
    }

    // Step 2: Evaluate with VLM
    console.log('\n🤖 Step 2: Evaluating screenshots with VLM...');
    const evaluationInputs: EvaluationInput[] = screenshotResults.map((result, i) => {
      const scenario = scenariosToRun[i];
      if (!scenario) {
        throw new Error(`No scenario found for index ${i}`);
      }
      return {
        screenshotPath: result.screenshotPath,
        context: scenario.context,
      };
    });

    const evaluationResults: EvaluationResult[] = await evaluateMultiple(evaluationInputs);

    // Step 3: Aggregate scores
    console.log('\n📊 Step 3: Aggregating results...');
    const aggregated = aggregateScores(evaluationResults, {
      passThreshold: opts.passThreshold,
    });

    // Step 4: Generate report
    console.log('\n📝 Step 4: Generating report...');
    const scenarioNames = getScenarioNames().filter((name) =>
      scenariosToRun.some((s) => s.name === name)
    );
    const report = generateMarkdownReport(evaluationResults, aggregated, scenarioNames);

    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportPath = path.join(opts.reportDir, `vlm-report-${timestamp}.md`);
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`  ✓ Report saved to: ${reportPath}`);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Score:     ${aggregated.overall_average.toFixed(1)}/100`);
    console.log(`Pass Threshold:    ${aggregated.pass_threshold}`);
    console.log(`Status:            ${aggregated.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Scenarios Passed:  ${aggregated.scenarios_passed}/${aggregated.scenarios_evaluated}`);
    console.log(`Scenarios Failed:  ${aggregated.scenarios_failed}/${aggregated.scenarios_evaluated}`);
    console.log('\nCriterion Averages:');
    Object.entries(aggregated.criterion_averages).forEach(([criterion, score]) => {
      const percentage = ((score / 20) * 100).toFixed(0);
      console.log(`  ${criterion.padEnd(15)} ${score.toFixed(1)}/20 (${percentage}%)`);
    });
    console.log('='.repeat(60));

    // Exit code
    return aggregated.passed ? 0 : 1;
  } catch (error) {
    console.error('\n❌ ERROR: VLM test run failed');
    console.error(error);
    return 1;
  }
}

/**
 * Get screenshot path from scenario name
 */
function getScreenshotPath(scenarioName: string, outputDir: string): string {
  const filename = scenarioName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return path.join(outputDir, `${filename}.png`);
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  const options: VLMTestOptions = {
    headless: !args.includes('--headed'),
    clearPrevious: !args.includes('--no-clear'),
    skipCapture: args.includes('--skip-capture'),
  };

  // Parse --threshold flag
  const thresholdIndex = args.indexOf('--threshold');
  if (thresholdIndex !== -1) {
    const thresholdValue = args[thresholdIndex + 1];
    if (thresholdValue !== undefined) {
      options.passThreshold = parseInt(thresholdValue, 10);
    }
  }

  // Parse --scenarios flag
  const scenariosIndex = args.indexOf('--scenarios');
  if (scenariosIndex !== -1) {
    const scenariosValue = args[scenariosIndex + 1];
    if (scenariosValue !== undefined) {
      options.scenarios = scenariosValue.split(',');
    }
  }

  const exitCode = await runVLMTests(options);
  process.exit(exitCode);
}

// Run if called directly
main();
