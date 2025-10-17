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
          // Simpler manual chunks to avoid dependency ordering issues
          manualChunks: {
            // Keep React and UI libs together to prevent forwardRef errors
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // Large icon library in separate chunk
            'icons-vendor': ['lucide-react'],
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
