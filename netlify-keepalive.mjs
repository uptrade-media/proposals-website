#!/usr/bin/env node
// Keep-alive script for Netlify Dev with external Vite server

// Output format that Netlify CLI expects to detect server readiness
console.log('Server listening on http://localhost:5173');

// Keep the process alive
setInterval(() => {
  // Do nothing, just keep alive
}, 1000 * 60 * 60); // Check every hour
