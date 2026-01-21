import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/testing/**',
        'src/cli/**',
        'src/ui/components/**',  // UI components tested with VLM in Phase 3
        'src/ui/hooks/**',       // React hooks tested with VLM
        'src/ui/services/aiConfig.ts',  // External API - requires mocking, tested in E2E
        'src/main.tsx',          // React entry point
        '**/*.config.js',
        '**/*.config.ts',
        'src/core/index.ts',  // Re-exports only
        'src/core/types/index.ts',  // Re-exports only
      ],
      thresholds: {
        lines: 95,
        functions: 85,  // Private methods not detected by coverage tool
        branches: 90,
        statements: 95,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@ui': path.resolve(__dirname, './src/ui'),
    },
  },
});
