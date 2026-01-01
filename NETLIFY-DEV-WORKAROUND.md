# Netlify Dev Server Issue & Workaround

## Problem
`netlify dev` hangs after Vite starts, never fully initializing the proxy server on port 8888.

**Terminal Output:**
```
✔ Vite dev server ready on port 5173
[hangs here indefinitely]
```

## Root Cause
- Netlify CLI v23.13.0 has a bug with Vite 7.2.7 detection
- After detecting Vite is ready, it never proceeds to start the proxy server

## Temporary Workaround

### Option 1: Run Servers Separately (Recommended)

**Terminal 1 - Frontend:**
```bash
pnpm dev:fe
# Runs on http://localhost:5173
```

**Terminal 2 - Functions:**
```bash
netlify functions:serve --port 9999
# Functions available at http://localhost:9999/.netlify/functions/*
```

**Update Vite proxy in vite.config.js:**
```javascript
proxy: {
  '/.netlify/functions': {
    target: 'http://localhost:9999',  // Point to functions server
    changeOrigin: true,
  },
}
```

### Option 2: Use `concurrently` (After Installation)

```bash
pnpm add -D concurrently
pnpm dev:manual
```

This runs both servers simultaneously.

## Permanent Fix

**When available:**
1. Update Netlify CLI: `npm update -g netlify-cli`
2. Or wait for Netlify CLI team to fix the Vite detection bug

## Notes

- The SEO Redirects API function is fixed (database migration complete)
- Functions work fine in production
- This only affects local development

## Tested Configurations That DON'T Work

```toml
# netlify.toml attempts that all hung:
[dev]
  framework = "#auto"      # Hangs
  framework = "#custom"    # Hangs  
  framework = "vite"       # Hangs
  command = "vite --host"  # Hangs
```

All configurations hang at the same point after "✔ Vite dev server ready".
