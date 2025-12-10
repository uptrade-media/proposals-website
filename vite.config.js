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
      open: true,
      // If you run `vite` directly, this proxies calls to your Netlify functions.
      // If you run `netlify dev`, it already does this (so this is harmless).
      proxy: {
        '/.netlify/functions': {
          target: 'http://localhost:8888',
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
          warn(warning)
        },
        output: {
          // Better code splitting with manual chunks
          manualChunks: (id) => {
            // React core
            if (id.includes('node_modules/react/') || 
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/react-router')) {
              return 'react-vendor'
            }
            // Icons
            if (id.includes('lucide-react')) {
              return 'icons-vendor'
            }
            // UI components (Radix)
            if (id.includes('@radix-ui')) {
              return 'ui-vendor'
            }
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
              return 'form-vendor'
            }
            // Date utilities
            if (id.includes('date-fns') || id.includes('react-day-picker')) {
              return 'date-vendor'
            }
            // Charts and visualization
            if (id.includes('@tremor') || id.includes('d3-')) {
              return 'chart-vendor'
            }
            // Editor/markdown
            if (id.includes('mdx') || id.includes('marked') || id.includes('dompurify')) {
              return 'editor-vendor'
            }
            // Animation
            if (id.includes('framer-motion')) {
              return 'animation-vendor'
            }
            // Google APIs
            if (id.includes('googleapis') || id.includes('google-auth-library')) {
              return 'google-vendor'
            }
          },
          // Better file naming for caching
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      // Enable minification with esbuild (faster than terser, no extra dep)
      minify: 'esbuild',
    },

    // Some libs reference process.env in the browser; this avoids undefined errors.
    define: {
      'process.env': {},
    },
  }
})
