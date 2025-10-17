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
        output: {
          // Manual chunks to split vendor code more granularly
          manualChunks: (id) => {
            // React core libs in one chunk
            if (id.includes('node_modules/react') || 
                id.includes('node_modules/react-dom') || 
                id.includes('node_modules/react-router')) {
              return 'react-vendor'
            }
            
            // UI library (shadcn/radix) in separate chunk
            if (id.includes('node_modules/@radix-ui') || 
                id.includes('node_modules/class-variance-authority') ||
                id.includes('node_modules/clsx')) {
              return 'ui-vendor'
            }
            
            // Icons in separate chunk (lucide-react is large)
            if (id.includes('node_modules/lucide-react')) {
              return 'icons-vendor'
            }
            
            // Zustand state management
            if (id.includes('node_modules/zustand')) {
              return 'state-vendor'
            }
            
            // Other large dependencies
            if (id.includes('node_modules')) {
              return 'vendor'
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
