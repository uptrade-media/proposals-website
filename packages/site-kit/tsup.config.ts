import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    // Main entry
    'index': 'src/index.ts',
    
    // SEO module
    'seo/index': 'src/seo/index.ts',
    'seo/server': 'src/seo/server.ts',
    
    // Analytics module
    'analytics/index': 'src/analytics/index.ts',
    
    // Engage module
    'engage/index': 'src/engage/index.ts',
    
    // Forms module
    'forms/index': 'src/forms/index.ts',
    
    // Blog module
    'blog/index': 'src/blog/index.ts',
    'blog/server': 'src/blog/server.ts',
    
    // Commerce module
    'commerce/index': 'src/commerce/index.ts',
    'commerce/server': 'src/commerce/server.ts',
    
    // Setup wizard - split client/server
    'setup/index': 'src/setup/index.ts',
    'setup/client': 'src/setup/client.ts',
    'setup/server': 'src/setup/server.ts',
    
    // Sitemap generator
    'sitemap/index': 'src/sitemap/index.ts',
    
    // Redirects middleware
    'redirects/index': 'src/redirects/index.ts',
    
    // Images module
    'images/index': 'src/images/index.ts',
    
    // Reputation module
    'reputation/index': 'src/reputation/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'next',
    '@supabase/supabase-js'
  ],
  treeshake: true,
  minify: false,
  target: 'es2020',
})
