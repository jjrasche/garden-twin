/**
 * VLM test scenarios for UI quality evaluation
 */

import type { ScenarioContext } from '../vlm/prompts';

export interface TestScenario {
  name: string;
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  context: ScenarioContext;
  /**
   * Optional setup actions to perform before screenshot
   * (e.g., clicking buttons, loading data)
   */
  setupActions?: Array<{
    type: 'click' | 'type' | 'wait' | 'eval';
    selector?: string;
    value?: string;
    script?: string;
  }>;
}

/**
 * Standard viewport sizes
 */
export const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1366, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
} as const;

/**
 * Test scenarios for VLM evaluation
 */
export const TEST_SCENARIOS: TestScenario[] = [
  // Empty State - Desktop
  {
    name: 'Empty Garden - Desktop',
    url: 'http://localhost:3000',
    viewport: VIEWPORTS.desktop,
    context: {
      name: 'Empty Garden (Desktop)',
      description: 'Initial application state with no garden loaded',
      expectedFeatures: [
        'ConfigBar visible at top with chat interface',
        'Empty state message or placeholder in main area',
        'Zoom controls visible',
        'Stats panel at bottom',
        'Clean, organized layout',
      ],
    },
  },

  // Empty State - Mobile
  {
    name: 'Empty Garden - Mobile',
    url: 'http://localhost:3000',
    viewport: VIEWPORTS.mobile,
    context: {
      name: 'Empty Garden (Mobile)',
      description: 'Initial application state on mobile device',
      expectedFeatures: [
        'ConfigBar responsive on mobile',
        'Touch-friendly controls',
        'No horizontal scrolling',
        'Readable text at mobile size',
        'Adequate touch target sizes',
      ],
    },
  },

  // Small Garden - Zone View (Desktop)
  {
    name: 'Small Garden - Zone View',
    url: 'http://localhost:3000',
    viewport: VIEWPORTS.desktop,
    context: {
      name: 'Small Garden - Zone View',
      description: '4×10 zone grid showing high-level garden overview',
      expectedFeatures: [
        'Zone grid visible (4 zones wide × 10 zones tall)',
        'Zone colors indicate plant types or density',
        'Zoom controls show current level (zone)',
        'Stats panel shows total yields and labor hours',
        'Labor timeline shows weekly schedule',
        'Harvest timeline shows seasonal distribution',
      ],
    },
    setupActions: [
      {
        type: 'eval',
        script: `
          // Load sample garden with corn and tomatoes
          const garden = {
            id: 'test-garden-1',
            name: 'Small Test Garden',
            dimensions_ft: { length: 100, width: 40 },
            subcells: Array.from({ length: 400 }, (_, i) => ({
              id: \`sub_\${i}\`,
              position: { x_in: (i % 20) * 36, y_in: Math.floor(i / 20) * 36 },
              computed: {
                cell_x_ft: Math.floor((i % 20) * 3),
                cell_y_ft: Math.floor(Math.floor(i / 20) * 3),
                zone_x: Math.floor((i % 20) / 5),
                zone_y: Math.floor(Math.floor(i / 20) / 5),
              },
              conditions: {
                sun_hours: 8,
                soil: { N_ppm: 20, P_ppm: 30, K_ppm: 150, pH: 6.5, compaction: 0.8 },
                type: 'planting',
              },
              plant: i % 3 === 0 ? {
                species_id: 'corn_golden_bantam',
                planted_week: 12,
                expected_harvest_week: 24,
              } : (i % 3 === 1 ? {
                species_id: 'tomato_beefsteak',
                planted_week: 10,
                expected_harvest_week: 22,
              } : undefined),
            })),
          };

          // Manually set garden in store (testing only)
          window.__TEST_GARDEN__ = garden;
        `,
      },
      { type: 'wait', value: '500' },
    ],
  },

  // Zone Count View (Desktop)
  {
    name: 'Zone Count View - Desktop',
    url: 'http://localhost:3000',
    viewport: VIEWPORTS.desktop,
    context: {
      name: 'Zone Count View',
      description: 'Zone grid with plant counts overlay (e.g., 🌽×48)',
      expectedFeatures: [
        'Zone grid with emoji indicators and counts',
        'Counts are readable and well-positioned',
        'Different plant species clearly distinguished',
        'Zoom level indicator shows "zone+counts"',
        'Layout remains organized with text overlays',
      ],
    },
    setupActions: [
      {
        type: 'eval',
        script: `window.__TEST_GARDEN__ = { /* same as above */ };`,
      },
      { type: 'click', selector: '[data-testid="zoom-in-button"]' },
      { type: 'wait', value: '300' },
    ],
  },

  // Cell View (Desktop)
  {
    name: 'Cell View - Desktop',
    url: 'http://localhost:3000',
    viewport: VIEWPORTS.desktop,
    context: {
      name: 'Cell View (1×1 ft resolution)',
      description: '40×100 cell grid showing individual planting cells',
      expectedFeatures: [
        'Cell grid visible (40 cells wide × 100 cells tall)',
        'Individual cells colored by plant type',
        'No overlapping cells',
        'Grid lines or borders clearly visible',
        'Zoom controls functional',
      ],
    },
    setupActions: [
      {
        type: 'eval',
        script: `window.__TEST_GARDEN__ = { /* same as above */ };`,
      },
      { type: 'click', selector: '[data-testid="zoom-in-button"]' },
      { type: 'wait', value: '200' },
      { type: 'click', selector: '[data-testid="zoom-in-button"]' },
      { type: 'wait', value: '300' },
    ],
  },

  // Subcell View (Desktop) - Most Complex
  {
    name: 'Subcell View - Desktop',
    url: 'http://localhost:3000',
    viewport: VIEWPORTS.desktop,
    context: {
      name: 'Subcell View (3×3 inch resolution)',
      description: 'Maximum zoom showing individual 3×3 inch subcells with viewport culling',
      expectedFeatures: [
        'Subcell grid rendered without lag',
        'Only visible subcells rendered (culling indicator shows count)',
        'Smooth pan and zoom interactions',
        'Individual plant instances visible',
        'Performance remains responsive',
      ],
    },
    setupActions: [
      {
        type: 'eval',
        script: `window.__TEST_GARDEN__ = { /* same as above */ };`,
      },
      { type: 'click', selector: '[data-testid="zoom-in-button"]' },
      { type: 'wait', value: '200' },
      { type: 'click', selector: '[data-testid="zoom-in-button"]' },
      { type: 'wait', value: '200' },
      { type: 'click', selector: '[data-testid="zoom-in-button"]' },
      { type: 'wait', value: '500' },
    ],
  },

  // Mobile - Touch Controls
  {
    name: 'Mobile - Touch Controls',
    url: 'http://localhost:3000',
    viewport: VIEWPORTS.mobile,
    context: {
      name: 'Mobile Touch Interactions',
      description: 'Test touch gestures and mobile-optimized controls',
      expectedFeatures: [
        'Touch-friendly zoom controls (large tap targets)',
        'Pan gesture works smoothly',
        'No unintended scrolling or refresh gestures',
        'UI elements sized appropriately for touch',
        'All critical features accessible on mobile',
      ],
    },
    setupActions: [
      {
        type: 'eval',
        script: `window.__TEST_GARDEN__ = { /* same as above */ };`,
      },
      { type: 'wait', value: '500' },
    ],
  },

  // AI Config Chat Interface
  {
    name: 'AI Config Chat - Desktop',
    url: 'http://localhost:3000',
    viewport: VIEWPORTS.desktop,
    context: {
      name: 'AI Configuration Chat Interface',
      description: 'Test chat interface for AI-powered garden configuration',
      expectedFeatures: [
        'Chat input field clearly visible',
        'Send button accessible',
        'Chat messages display in readable format',
        'Loading states shown during AI processing',
        'Clean separation between user and AI messages',
      ],
    },
    setupActions: [
      { type: 'click', selector: '[data-testid="chat-input"]' },
      { type: 'type', selector: '[data-testid="chat-input"]', value: 'Create a small garden with corn and tomatoes' },
      { type: 'wait', value: '300' },
    ],
  },

  // Large Garden - Performance Test
  {
    name: 'Large Garden - Performance',
    url: 'http://localhost:3000',
    viewport: VIEWPORTS.desktop,
    context: {
      name: 'Large Garden (Full 64k Subcells)',
      description: 'Full-size garden to test rendering performance and viewport culling',
      expectedFeatures: [
        'UI remains responsive despite large dataset',
        'Viewport culling indicator shows significant reduction (e.g., 500/64000)',
        'Zoom and pan operations complete quickly (<500ms)',
        'No visible lag or frame drops',
        'Stats panel accurately reflects full garden',
      ],
    },
    setupActions: [
      {
        type: 'eval',
        script: `
          // Generate full 64k subcell garden
          const fullGarden = {
            id: 'large-garden',
            name: 'Full Garden (64k Subcells)',
            dimensions_ft: { length: 100, width: 40 },
            subcells: Array.from({ length: 64000 }, (_, i) => ({
              id: \`sub_\${i}\`,
              position: { x_in: (i % 1600) * 3, y_in: Math.floor(i / 1600) * 3 },
              computed: {
                cell_x_ft: Math.floor((i % 1600) / 4),
                cell_y_ft: Math.floor(Math.floor(i / 1600) / 4),
                zone_x: Math.floor((i % 1600) / 400),
                zone_y: Math.floor(Math.floor(i / 1600) / 400),
              },
              conditions: {
                sun_hours: 6 + (i % 5),
                soil: { N_ppm: 20, P_ppm: 30, K_ppm: 150, pH: 6.5, compaction: 0.8 },
                type: 'planting',
              },
              plant: i % 4 !== 0 ? {
                species_id: ['corn_golden_bantam', 'tomato_beefsteak', 'potato_russet'][i % 3],
                planted_week: 10 + (i % 5),
                expected_harvest_week: 20 + (i % 8),
              } : undefined,
            })),
          };
          window.__TEST_GARDEN__ = fullGarden;
        `,
      },
      { type: 'wait', value: '1000' }, // Allow time for rendering
    ],
  },

  // Tablet - Hybrid Experience
  {
    name: 'Tablet - Hybrid Layout',
    url: 'http://localhost:3000',
    viewport: VIEWPORTS.tablet,
    context: {
      name: 'Tablet Layout (Portrait)',
      description: 'Test responsive layout at tablet size',
      expectedFeatures: [
        'Layout adapts to tablet viewport',
        'Components reflow appropriately',
        'Touch targets sized for tablet use',
        'Text remains readable',
        'No horizontal scrolling',
      ],
    },
    setupActions: [
      {
        type: 'eval',
        script: `window.__TEST_GARDEN__ = { /* small garden */ };`,
      },
      { type: 'wait', value: '500' },
    ],
  },
];

/**
 * Get scenarios by tag or filter
 */
export function getScenariosByTag(tag: 'desktop' | 'mobile' | 'performance'): TestScenario[] {
  if (tag === 'desktop') {
    return TEST_SCENARIOS.filter((s) => s.viewport.width >= 1366);
  }
  if (tag === 'mobile') {
    return TEST_SCENARIOS.filter((s) => s.viewport.width < 768);
  }
  if (tag === 'performance') {
    return TEST_SCENARIOS.filter((s) => s.name.includes('Performance') || s.name.includes('Subcell'));
  }
  return TEST_SCENARIOS;
}

/**
 * Get scenario names for reporting
 */
export function getScenarioNames(): string[] {
  return TEST_SCENARIOS.map((s) => s.name);
}
