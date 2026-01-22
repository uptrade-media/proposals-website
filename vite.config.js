// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    // If you deploy under a sub-path, set it here (e.g. '/app/'); keep '/' for Netlify root.
    base: '/',

    plugins: [
      react(),
      tailwindcss(),
      svgr(), // import icons as React: import Logo from './logo.svg?react'
    ],

    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.mdx'],
    },

    assetsInclude: ['**/*.mdx'],

    server: {
      port: 5173,
      // Don't auto-open browser (causes issues with netlify dev)
      open: false,
      // Proxy functions to separate server (workaround for netlify dev bug)
      proxy: {
        '/.netlify/functions': {
          target: process.env.FUNCTIONS_PORT ? `http://localhost:${process.env.FUNCTIONS_PORT}` : 'http://localhost:9999',
          changeOrigin: true,
        },
      },
    },

    preview: {
      port: 4173,
      open: true,
    },

    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProd,
      // Increase chunk size warning limit (we'll optimize below)
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        // Suppress "use client" directive warnings from Tremor/React Server Components
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('"use client"')) {
            return
          }
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('"use"')) {
            return
          }
          // Suppress circular dependency warnings for recharts
          if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('recharts')) {
            return
          }
          warn(warning)
        },
        output: {
          // Better file naming for caching
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          // Manual chunks to avoid circular dependencies
          manualChunks: (id) => {
            // Put recharts in its own chunk to avoid circular dependency issues
            if (id.includes('node_modules/recharts')) {
              return 'recharts'
            }
            // Put large commonly used stores in their own chunks
            if (id.includes('auth-store')) {
              return 'auth-store'
            }
            // Group all other node_modules into vendor chunk
            if (id.includes('node_modules')) {
              return 'vendor'
            }
          },
        },
      },
      // Enable minification with esbuild (faster than terser, no extra dep)
      minify: 'esbuild',
      // Suppress esbuild warnings about directives
      esbuild: {
        logOverride: {
          'this-is-undefined-in-esm': 'silent',
        },
      },
    },

    // Some libs reference process.env in the browser; this avoids undefined errors.
    // Also expose environment variables to the client
    define: {
      'process.env': {},
      'import.meta.env.SQUARE_APPLICATION_ID': JSON.stringify(process.env.SQUARE_APPLICATION_ID),
      'import.meta.env.SQUARE_LOCATION_ID': JSON.stringify(process.env.SQUARE_LOCATION_ID),
      'import.meta.env.SQUARE_ENVIRONMENT': JSON.stringify(process.env.SQUARE_ENVIRONMENT),
      'import.meta.env.GOOGLE_CLOUD_API_KEY': JSON.stringify(process.env.GOOGLE_CLOUD_API_KEY),
    },
  }
})
