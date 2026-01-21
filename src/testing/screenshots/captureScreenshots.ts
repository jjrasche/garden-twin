/**
 * Puppeteer screenshot capture for VLM testing
 */

import puppeteer, { type Browser, type Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import type { TestScenario } from './scenarios';

export interface ScreenshotResult {
  scenarioName: string;
  screenshotPath: string;
  success: boolean;
  error?: string;
}

export interface CaptureOptions {
  outputDir?: string;
  headless?: boolean;
  timeout?: number;
  waitForNetworkIdle?: boolean;
}

const DEFAULT_OPTIONS: Required<CaptureOptions> = {
  outputDir: 'tests/vlm-screenshots',
  headless: true,
  timeout: 30000,
  waitForNetworkIdle: true,
};

/**
 * Capture screenshots for all test scenarios
 *
 * @param scenarios - Test scenarios to capture
 * @param options - Capture options
 * @returns Array of screenshot results
 */
export async function captureScreenshots(
  scenarios: TestScenario[],
  options: CaptureOptions = {}
): Promise<ScreenshotResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Ensure output directory exists
  if (!fs.existsSync(opts.outputDir)) {
    fs.mkdirSync(opts.outputDir, { recursive: true });
  }

  let browser: Browser | null = null;
  const results: ScreenshotResult[] = [];

  try {
    console.log(`Launching browser (headless: ${opts.headless})...`);
    browser = await puppeteer.launch({
      headless: opts.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      if (!scenario) {
        console.error(`\n[${i + 1}/${scenarios.length}] Error: Scenario is undefined`);
        continue;
      }
      console.log(`\n[${i + 1}/${scenarios.length}] Capturing: ${scenario.name}`);

      try {
        const screenshotPath = await captureSingleScenario(browser, scenario, opts);
        results.push({
          scenarioName: scenario.name,
          screenshotPath,
          success: true,
        });
        console.log(`  ✓ Saved to: ${screenshotPath}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ Failed: ${errorMessage}`);
        results.push({
          scenarioName: scenario.name,
          screenshotPath: '',
          success: false,
          error: errorMessage,
        });
      }
    }
  } finally {
    if (browser) {
      console.log('\nClosing browser...');
      await browser.close();
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`\n✓ Captured ${successCount}/${scenarios.length} screenshots`);

  return results;
}

/**
 * Capture screenshot for a single scenario
 */
async function captureSingleScenario(
  browser: Browser,
  scenario: TestScenario,
  options: Required<CaptureOptions>
): Promise<string> {
  const page = await browser.newPage();

  try {
    // Set viewport
    await page.setViewport({
      width: scenario.viewport.width,
      height: scenario.viewport.height,
      deviceScaleFactor: 1,
    });

    // Navigate to URL
    console.log(`  Navigating to: ${scenario.url}`);
    await page.goto(scenario.url, {
      waitUntil: options.waitForNetworkIdle ? 'networkidle0' : 'load',
      timeout: options.timeout,
    });

    // Execute setup actions
    if (scenario.setupActions && scenario.setupActions.length > 0) {
      console.log(`  Executing ${scenario.setupActions.length} setup action(s)...`);
      await executeSetupActions(page, scenario.setupActions);
    }

    // Wait for any animations to complete
    await page.waitForTimeout(500);

    // Generate filename from scenario name
    const filename = scenario.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const screenshotPath = path.join(options.outputDir, `${filename}.png`);

    // Capture screenshot
    console.log(`  Capturing screenshot...`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: false, // Capture viewport only
      type: 'png',
    });

    return screenshotPath;
  } finally {
    await page.close();
  }
}

/**
 * Execute setup actions on the page
 */
async function executeSetupActions(
  page: Page,
  actions: NonNullable<TestScenario['setupActions']>
): Promise<void> {
  for (const action of actions) {
    switch (action.type) {
      case 'click':
        if (!action.selector) {
          throw new Error('Click action requires selector');
        }
        await page.waitForSelector(action.selector, { timeout: 5000 });
        await page.click(action.selector);
        break;

      case 'type':
        if (!action.selector || !action.value) {
          throw new Error('Type action requires selector and value');
        }
        await page.waitForSelector(action.selector, { timeout: 5000 });
        await page.type(action.selector, action.value);
        break;

      case 'wait':
        if (!action.value) {
          throw new Error('Wait action requires value (milliseconds)');
        }
        await page.waitForTimeout(parseInt(action.value, 10));
        break;

      case 'eval':
        if (!action.script) {
          throw new Error('Eval action requires script');
        }
        await page.evaluate(action.script);
        break;

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }
}

/**
 * Capture screenshot for a single scenario (standalone utility)
 */
export async function captureSingleScreenshot(
  scenario: TestScenario,
  options: CaptureOptions = {}
): Promise<string> {
  const results = await captureScreenshots([scenario], options);
  const result = results[0];

  if (!result) {
    throw new Error('Screenshot capture returned no results');
  }

  if (!result.success) {
    throw new Error(`Screenshot capture failed: ${result.error}`);
  }

  return result.screenshotPath;
}

/**
 * Clear all screenshots from output directory
 */
export function clearScreenshots(outputDir: string = DEFAULT_OPTIONS.outputDir): void {
  if (!fs.existsSync(outputDir)) {
    return;
  }

  const files = fs.readdirSync(outputDir);
  for (const file of files) {
    if (file.endsWith('.png')) {
      fs.unlinkSync(path.join(outputDir, file));
    }
  }

  console.log(`Cleared ${files.length} screenshot(s) from ${outputDir}`);
}
