// netlify/functions/seo-competitor-scheduled.js
// ═══════════════════════════════════════════════════════════════════════════════
// SEO Competitor Scheduled Monitoring
// ═══════════════════════════════════════════════════════════════════════════════
// Runs weekly to check all tracked competitors for changes
// Triggers background analysis for each competitor

import { createSupabaseAdmin } from './utils/supabase.js'

const headers = { 'Content-Type': 'application/json' }

export async function handler(event) {
  const startTime = Date.now()
  const supabase = createSupabaseAdmin()
  
  console.log('[Competitor Scheduled] Starting weekly competitor monitoring')
  
  try {
    // Get all sites with competitor tracking enabled
    const { data: sites, error: sitesError } = await supabase
      .from('seo_sites')
      .select(`
        id,
        domain,
        org:organizations(features)
      `)
      .eq('is_active', true)
    
    if (sitesError) throw sitesError
    
    const results = {
      sites_checked: 0,
      competitors_analyzed: 0,
      errors: []
    }
    
    for (const site of sites || []) {
      // Check if competitor tracking is enabled
      const features = site.org?.features || {}
      if (!features.seo_competitor_tracking) continue
      
      results.sites_checked++
      
      try {
        // Get tracked competitors for this site
        const { data: competitors } = await supabase
          .from('seo_competitor_analysis')
          .select('id, competitor_domain, is_primary')
          .eq('site_id', site.id)
          .eq('is_active', true)
        
        if (!competitors?.length) continue
        
        for (const competitor of competitors) {
          try {
            // Trigger background analysis
            const analyzeUrl = `${process.env.URL}/.netlify/functions/seo-competitor-analyze-background`
            
            await fetch(analyzeUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                siteId: site.id,
                competitorDomain: competitor.competitor_domain,
                analysisType: 'scheduled'
              })
            })
            
            results.competitors_analyzed++
            console.log(`[Competitor Scheduled] Triggered analysis for ${competitor.competitor_domain}`)
            
            // Small delay to prevent overwhelming the background functions
            await new Promise(resolve => setTimeout(resolve, 500))
            
          } catch (err) {
            console.error(`[Competitor Scheduled] Error analyzing ${competitor.competitor_domain}:`, err)
            results.errors.push({ competitor: competitor.competitor_domain, error: err.message })
          }
        }
        
      } catch (err) {
        console.error(`[Competitor Scheduled] Error processing site ${site.domain}:`, err)
        results.errors.push({ site: site.domain, error: err.message })
      }
    }
    
    const duration = Date.now() - startTime
    console.log(`[Competitor Scheduled] Complete. Sites: ${results.sites_checked}, Competitors: ${results.competitors_analyzed}, Errors: ${results.errors.length}. Duration: ${duration}ms`)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, results, duration })
    }
    
  } catch (err) {
    console.error('[Competitor Scheduled] Fatal error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
