/**
 * CRM Website Analysis Function
 * 
 * Quick website analysis for CRM intelligence:
 * - PageSpeed scores (mobile/desktop)
 * - Basic tech detection
 * - AI-generated summary
 * - Rebuild score calculation
 * 
 * This is NOT a full audit - use audits-request.js for that.
 * This populates the quick intel shown in the prospect detail modal.
 */

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const PAGESPEED_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY

/**
 * Get PageSpeed Insights scores for a URL
 */
async function getPageSpeedScores(url) {
  const strategies = ['mobile', 'desktop']
  const results = {}
  
  for (const strategy of strategies) {
    try {
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES&key=${PAGESPEED_API_KEY}`
      
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      if (data.error) {
        console.error(`PageSpeed ${strategy} error:`, data.error.message)
        continue
      }
      
      const categories = data.lighthouseResult?.categories || {}
      const audits = data.lighthouseResult?.audits || {}
      
      results[strategy] = {
        performance: Math.round((categories.performance?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100),
        accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
        // Core Web Vitals
        lcp: audits['largest-contentful-paint']?.numericValue,
        fid: audits['max-potential-fid']?.numericValue,
        cls: audits['cumulative-layout-shift']?.numericValue,
        fcp: audits['first-contentful-paint']?.numericValue,
        tti: audits['interactive']?.numericValue,
        // Total blocking time
        tbt: audits['total-blocking-time']?.numericValue,
        // Speed index
        speedIndex: audits['speed-index']?.numericValue
      }
    } catch (error) {
      console.error(`PageSpeed ${strategy} fetch error:`, error.message)
    }
  }
  
  return results
}

/**
 * Basic tech detection from HTML
 */
async function detectTechnology(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UptradeAudit/1.0)'
      },
      redirect: 'follow',
      timeout: 10000
    })
    
    const html = await response.text()
    const headers = Object.fromEntries(response.headers.entries())
    
    const tech = {
      platform: null,
      theme: null,
      plugins: [],
      frameworks: [],
      analytics: [],
      hosting: null
    }
    
    // CMS Detection
    if (html.includes('wp-content') || html.includes('wp-includes')) {
      tech.platform = 'WordPress'
      
      // Theme detection
      const themeMatch = html.match(/\/wp-content\/themes\/([^\/'"]+)/i)
      if (themeMatch) tech.theme = themeMatch[1]
      
      // Plugin detection (common ones)
      const wpPlugins = [
        'elementor', 'divi', 'wpbakery', 'beaver-builder',
        'yoast', 'rank-math', 'all-in-one-seo',
        'woocommerce', 'contact-form-7', 'gravity-forms',
        'wordfence', 'sucuri', 'wp-rocket', 'w3-total-cache',
        'jetpack', 'akismet'
      ]
      for (const plugin of wpPlugins) {
        if (html.includes(`/wp-content/plugins/${plugin}`)) {
          tech.plugins.push(plugin)
        }
      }
    } else if (html.includes('Shopify.theme')) {
      tech.platform = 'Shopify'
    } else if (html.includes('squarespace.com') || html.includes('static1.squarespace.com')) {
      tech.platform = 'Squarespace'
    } else if (html.includes('wix.com') || html.includes('wixstatic.com')) {
      tech.platform = 'Wix'
    } else if (html.includes('webflow.com')) {
      tech.platform = 'Webflow'
    } else if (html.includes('_next/static') || html.includes('__NEXT_DATA__')) {
      tech.platform = 'Next.js'
    } else if (html.includes('gatsby')) {
      tech.platform = 'Gatsby'
    }
    
    // Framework detection
    if (html.includes('react') || html.includes('React')) tech.frameworks.push('React')
    if (html.includes('vue') || html.includes('Vue')) tech.frameworks.push('Vue')
    if (html.includes('angular') || html.includes('ng-')) tech.frameworks.push('Angular')
    if (html.includes('jquery') || html.includes('jQuery')) tech.frameworks.push('jQuery')
    if (html.includes('bootstrap')) tech.frameworks.push('Bootstrap')
    if (html.includes('tailwind')) tech.frameworks.push('Tailwind')
    
    // Analytics detection
    if (html.includes('google-analytics') || html.includes('gtag')) tech.analytics.push('Google Analytics')
    if (html.includes('googletagmanager')) tech.analytics.push('Google Tag Manager')
    if (html.includes('facebook.net/en_US/fbevents')) tech.analytics.push('Facebook Pixel')
    if (html.includes('hotjar')) tech.analytics.push('Hotjar')
    if (html.includes('clarity.ms')) tech.analytics.push('Microsoft Clarity')
    
    // Hosting detection from headers
    const server = headers['server'] || headers['x-powered-by'] || ''
    if (server.includes('cloudflare')) tech.hosting = 'Cloudflare'
    else if (server.includes('nginx')) tech.hosting = 'Nginx'
    else if (server.includes('apache')) tech.hosting = 'Apache'
    else if (headers['x-vercel-id']) tech.hosting = 'Vercel'
    else if (headers['x-amz-cf-id']) tech.hosting = 'AWS CloudFront'
    else if (headers['x-github-request-id']) tech.hosting = 'GitHub Pages'
    
    return tech
  } catch (error) {
    console.error('Tech detection error:', error.message)
    return null
  }
}

/**
 * Calculate rebuild score based on analysis data
 * Higher score = more likely to benefit from a modern rebuild
 */
function calculateRebuildScore(healthMetrics, techStack) {
  let score = 0
  
  // Performance scoring (up to 40 points)
  const mobilePerf = healthMetrics?.mobile?.performance || 50
  if (mobilePerf < 30) score += 40
  else if (mobilePerf < 50) score += 30
  else if (mobilePerf < 70) score += 20
  else if (mobilePerf < 90) score += 10
  
  // Platform scoring (up to 30 points)
  const platform = techStack?.platform
  if (platform === 'WordPress') score += 25 // WordPress = opportunity
  else if (platform === 'Wix' || platform === 'Squarespace') score += 20
  else if (platform === 'Shopify') score += 10
  else if (platform === 'Next.js' || platform === 'Gatsby') score += 0 // Already modern
  
  // SEO scoring (up to 15 points)
  const seoScore = healthMetrics?.mobile?.seo || 50
  if (seoScore < 50) score += 15
  else if (seoScore < 70) score += 10
  else if (seoScore < 90) score += 5
  
  // Core Web Vitals (up to 15 points)
  const lcp = healthMetrics?.mobile?.lcp || 2500
  if (lcp > 4000) score += 10
  else if (lcp > 2500) score += 5
  
  const cls = healthMetrics?.mobile?.cls || 0.1
  if (cls > 0.25) score += 5
  else if (cls > 0.1) score += 2
  
  return Math.min(100, score)
}

/**
 * Generate AI summary of website analysis
 */
async function generateAISummary(url, healthMetrics, techStack) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const prompt = `Analyze this website data and provide a brief 2-3 sentence summary for a sales representative about to pitch web services. Focus on pain points and opportunities.

URL: ${url}

Performance Metrics:
- Mobile Performance: ${healthMetrics?.mobile?.performance || 'N/A'}/100
- Desktop Performance: ${healthMetrics?.desktop?.performance || 'N/A'}/100
- SEO Score: ${healthMetrics?.mobile?.seo || 'N/A'}/100
- LCP: ${healthMetrics?.mobile?.lcp ? Math.round(healthMetrics.mobile.lcp) + 'ms' : 'N/A'}
- CLS: ${healthMetrics?.mobile?.cls || 'N/A'}

Technology:
- Platform: ${techStack?.platform || 'Unknown'}
- Theme: ${techStack?.theme || 'Unknown'}
- Plugins: ${techStack?.plugins?.join(', ') || 'None detected'}

Write a brief summary like: "This WordPress site has poor mobile performance (32/100) and slow load times. Built with Divi theme and multiple heavy plugins. Strong candidate for a Next.js rebuild to improve Core Web Vitals and SEO."

Keep it under 50 words, focus on the most impactful issues.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150
    })
    
    return completion.choices[0].message.content.trim()
  } catch (error) {
    console.error('AI summary error:', error.message)
    return null
  }
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Verify authentication
    const { contact, error: authError } = await getAuthenticatedUser(event)
    
    if (authError || !contact) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Not authenticated' })
      }
    }

    // Only admins can analyze websites
    if (contact.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const { contactId, url } = JSON.parse(event.body || '{}')

    if (!contactId || !url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId and url are required' })
      }
    }

    // Normalize URL
    let targetUrl
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      targetUrl = urlObj.origin // Just the domain
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid URL format' })
      }
    }

    const supabase = createSupabaseAdmin()

    // Verify contact exists
    const { data: existingContact, error: contactError } = await supabase
      .from('contacts')
      .select('id, website')
      .eq('id', contactId)
      .single()

    if (contactError || !existingContact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      }
    }

    console.log(`[crm-analyze-website] Analyzing ${targetUrl} for contact ${contactId}`)

    // Run analysis in parallel
    const [pageSpeedScores, techStack] = await Promise.all([
      getPageSpeedScores(targetUrl),
      detectTechnology(targetUrl)
    ])

    // Format health metrics
    const healthMetrics = {
      mobile: pageSpeedScores.mobile || null,
      desktop: pageSpeedScores.desktop || null,
      analyzedAt: new Date().toISOString()
    }

    // Calculate rebuild score
    const rebuildScore = calculateRebuildScore(healthMetrics, techStack)

    // Generate AI summary
    const aiSummary = await generateAISummary(targetUrl, healthMetrics, techStack)

    // Update contact with intelligence
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        website: targetUrl,
        health_metrics: healthMetrics,
        tech_stack: techStack,
        rebuild_score: rebuildScore,
        ai_summary: aiSummary,
        website_analyzed_at: new Date().toISOString()
      })
      .eq('id', contactId)

    if (updateError) {
      console.error('[crm-analyze-website] Update error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update contact' })
      }
    }

    console.log(`[crm-analyze-website] Updated contact ${contactId} with rebuild score ${rebuildScore}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          website: targetUrl,
          healthMetrics,
          techStack,
          rebuildScore,
          aiSummary
        }
      })
    }

  } catch (error) {
    console.error('[crm-analyze-website] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
