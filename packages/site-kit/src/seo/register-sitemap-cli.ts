#!/usr/bin/env node
/**
 * CLI script to register sitemap entries at build time
 * 
 * Usage:
 *   npx uptrade-register-sitemap
 *   npx uptrade-register-sitemap --auto-discover
 * 
 * Or in package.json:
 * {
 *   "scripts": {
 *     "postbuild": "uptrade-register-sitemap --auto-discover"
 *   }
 * }
 */

import { registerLocalSitemap } from './routing'

async function main() {
  const args = process.argv.slice(2)
  const autoDiscover = args.includes('--auto-discover') || args.includes('-a')
  
  console.log('[Uptrade] Registering sitemap entries...')
  
  try {
    const result = await registerLocalSitemap({
      autoDiscover,
    })
    
    if (result.success) {
      console.log(`[Uptrade] ✓ Sitemap registered successfully`)
      console.log(`[Uptrade]   Created: ${result.created}`)
      console.log(`[Uptrade]   Updated: ${result.updated}`)
      process.exit(0)
    } else {
      console.error('[Uptrade] ✗ Failed to register sitemap')
      process.exit(1)
    }
  } catch (error) {
    console.error('[Uptrade] ✗ Error:', error)
    process.exit(1)
  }
}

main()
