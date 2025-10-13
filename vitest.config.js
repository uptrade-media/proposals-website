import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for fast DOM simulation
    environment: 'happy-dom',
    
    // Setup files to run before tests
    setupFiles: ['./tests/setup.js'],
    
    // Global test APIs (describe, it, expect, etc.)
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.config.js',
        '**/setup.js',
        'src/main.jsx'
      ]
    },
    
    // Test patterns
    include: ['tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    
    // Timeout for tests
    testTimeout: 10000,
    
    // Watch mode
    watch: false,
    
    // Show test output
    silent: false,
    
    // Retry failed tests
    retry: 1
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
