import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { debugBridgePlugin } from 'file:///c:/Users/rasche_j/.claude/debug-tools/vite-plugin-debug.js';

export default defineConfig({
  plugins: [
    react(),
    debugBridgePlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@ui': path.resolve(__dirname, './src/ui'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'chart-vendor': ['recharts'],
          'store-vendor': ['zustand'],
        },
      },
    },
  },
});
