# VLM UI Quality Testing

Automated UI quality evaluation using GROQ Llama Vision.

## Overview

The VLM testing pipeline:
1. Captures screenshots of the app in various scenarios using Puppeteer
2. Evaluates each screenshot with GROQ Llama Vision model
3. Scores UI quality on 5 criteria (clarity, layout, responsiveness, performance, usability)
4. Aggregates results and generates a markdown report

## Prerequisites

1. **GROQ API Key**: Get from https://console.groq.com/keys
2. **Set environment variable**:
   ```bash
   export GROQ_API_KEY=your_key_here
   # or add to .env file:
   echo "GROQ_API_KEY=your_key_here" > .env
   ```

3. **Start dev server** (for screenshot capture):
   ```bash
   npm run dev
   # Runs on http://localhost:5173
   ```

## Quick Start

Run all VLM tests:

```bash
npm run test:vlm
```

This will:
- Capture screenshots for all 10 test scenarios
- Evaluate each with GROQ Llama Vision
- Generate a markdown report in `tests/vlm-reports/`
- Exit with code 0 (pass) or 1 (fail)

## Test Scenarios

The VLM tests cover:

1. **Empty Garden** - Desktop & Mobile
2. **Small Garden** - Zone view, Zone+counts, Cell view, Subcell view
3. **Large Garden** - Full 64k subcells (performance test)
4. **AI Config Chat** - Chat interface
5. **Mobile Touch** - Touch controls and gestures
6. **Tablet** - Hybrid layout

See `src/testing/screenshots/scenarios.ts` for details.

## CLI Options

```bash
# Run with visible browser (see what's happening)
npm run test:vlm -- --headed

# Skip screenshot capture (use existing)
npm run test:vlm -- --skip-capture

# Custom pass threshold (default: 85/100)
npm run test:vlm -- --threshold 90

# Run specific scenarios only
npm run test:vlm -- --scenarios "Empty Garden - Desktop,Small Garden - Zone View"

# Don't clear previous screenshots
npm run test:vlm -- --no-clear
```

## Evaluation Criteria

Each screenshot is scored on 5 criteria (0-20 points each, max 100):

| Criterion | Description |
|-----------|-------------|
| **Clarity** | Text readable, elements distinguishable, visual hierarchy clear |
| **Layout** | Components organized, spacing consistent, no overlapping |
| **Responsiveness** | Adapts to viewport, no horizontal scroll, adequate touch targets |
| **Performance** | UI feels responsive, no lag indicators, smooth transitions |
| **Usability** | Controls intuitive, navigation clear, tasks accomplishable |

**Pass Threshold**: 85/100 overall average

## Output

### Screenshots

Saved to `tests/vlm-screenshots/`:
```
empty-garden-desktop.png
small-garden-zone-view.png
...
```

### Reports

Saved to `tests/vlm-reports/`:
```
vlm-report-2025-01-17T14-30-00.md
```

Example report:
```markdown
# VLM UI Quality Evaluation Report

**Date**: 2025-01-17T14:30:00.000Z
**Scenarios Evaluated**: 10

## Overall Results

**Average Score**: 87.5/100
**Pass Threshold**: 85
**Status**: ✅ PASS

**Scenarios Passed**: 9/10
**Scenarios Failed**: 1/10

## Criterion Averages

| Criterion | Average Score | Max |
|-----------|--------------|-----|
| Clarity | 18.2 | 20 (91%) |
| Layout | 17.8 | 20 (89%) |
| Responsiveness | 16.5 | 20 (83%) |
| Performance | 17.0 | 20 (85%) |
| Usability | 18.0 | 20 (90%) |

## Individual Scenario Results

### ✅ Empty Garden - Desktop

**Overall Score**: 90/100

**Summary**: Clean initial state with clear layout and intuitive controls.

**Scores**:
- **Clarity**: 18/20 - Text is readable, UI hierarchy is clear
- **Layout**: 19/20 - Well-organized components, consistent spacing
- ...
```

## Architecture

### Components

- **`retryWithBackoff.ts`** - Exponential backoff utility (handles API errors)
- **`prompts.ts`** - VLM evaluation prompts and criteria
- **`evaluator.ts`** - GROQ Vision API integration
- **`scorer.ts`** - Score aggregation and report generation
- **`scenarios.ts`** - Test scenario definitions
- **`captureScreenshots.ts`** - Puppeteer screenshot capture
- **`runVLMTests.ts`** - Main test runner (orchestrates all components)

### Retry Logic

VLM API calls use exponential backoff:
- **Max retries**: 5
- **Delays**: 1s → 2s → 4s → 8s → 16s → 30s (max)
- **Retryable errors**: Network errors, rate limits, 5xx errors

### Double Validation

1. **GROQ enforces structure**: `response_format: { type: 'json_object' }`
2. **Zod validates correctness**: `validateEvaluationResult(parsed)`

## Troubleshooting

### GROQ API Key Missing
```
❌ ERROR: GROQ_API_KEY environment variable not set
```
**Fix**: Export the key or add to `.env` file

### Dev Server Not Running
```
❌ ERROR: net::ERR_CONNECTION_REFUSED at http://localhost:5173
```
**Fix**: Run `npm run dev` in another terminal

### Rate Limit Exceeded
```
VLM API call failed (attempt 1), retrying in 1000ms: Rate limit exceeded
```
**Fix**: Wait for retry to complete (automatic with exponential backoff)

### Puppeteer Errors
```
❌ ERROR: Browser failed to launch
```
**Fix**: Install browser dependencies:
```bash
npx puppeteer browsers install chrome
```

## Development

### Adding New Scenarios

Edit `src/testing/screenshots/scenarios.ts`:

```typescript
export const TEST_SCENARIOS: TestScenario[] = [
  // ... existing scenarios
  {
    name: 'My New Scenario',
    url: 'http://localhost:5173',
    viewport: VIEWPORTS.desktop,
    context: {
      name: 'My New Scenario',
      description: 'What this scenario tests',
      expectedFeatures: [
        'Feature 1',
        'Feature 2',
        'Feature 3',
      ],
    },
    setupActions: [
      // Optional: click, type, wait, eval
    ],
  },
];
```

### Adjusting Evaluation Criteria

Edit `src/testing/vlm/prompts.ts`:

```typescript
export const EVALUATION_CRITERIA: UIEvaluationCriteria = {
  clarity: 'Your custom clarity criteria',
  layout: 'Your custom layout criteria',
  // ...
};
```

### Changing Pass Threshold

Pass threshold can be set via CLI or code:

```bash
# Via CLI
npm run test:vlm -- --threshold 90
```

```typescript
// Via code (src/testing/runVLMTests.ts)
const DEFAULT_OPTIONS: Required<VLMTestOptions> = {
  passThreshold: 90, // Change here
  // ...
};
```

## CI/CD Integration

### GitHub Actions

```yaml
name: VLM Tests
on: [push, pull_request]

jobs:
  vlm-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - run: npm run dev &
      - run: sleep 5
      - run: npm run test:vlm
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: vlm-reports
          path: tests/vlm-reports/
```

### GitLab CI

```yaml
vlm-tests:
  stage: test
  script:
    - npm install
    - npm run build
    - npm run dev &
    - sleep 5
    - npm run test:vlm
  variables:
    GROQ_API_KEY: $GROQ_API_KEY
  artifacts:
    paths:
      - tests/vlm-reports/
    when: always
```

## Phase 3 Success Criteria

- ✅ VLM evaluation runs without errors
- ✅ Retry logic handles API failures
- ✅ Final UI scores 85+/100
- ✅ Markdown report generated
