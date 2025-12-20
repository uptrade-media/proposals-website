/**
 * Netlify Background Function for Internal Portal Audits
 * 
 * COPIED FROM: uptrade-media-nextjs/netlify/functions/audit-background.js
 * 
 * Background functions have a 15-minute timeout (vs 10/26 seconds for regular functions)
 * They're triggered via POST to /.netlify/functions/audits-internal-background
 * 
 * This function:
 * 1. Runs PageSpeed Insights analysis (mobile only for speed)
 * 2. Runs SEO checks
 * 3. Extracts resource breakdown (images, scripts, fonts)
 * 4. Analyzes third-party impact
 * 5. Generates AI-powered insights via OpenAI
 * 6. Calculates business impact estimates
 * 7. Saves results to Supabase
 * 
 * NOTE: Email is NOT sent automatically. Use audits-send-email.js after reviewing.
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client (portal uses SUPABASE_URL, main site uses NEXT_PUBLIC_SUPABASE_URL)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Industry benchmarks for comparison
const INDUSTRY_BENCHMARKS = {
  ecommerce: { performance: 45, seo: 78, accessibility: 82, bestPractices: 80 },
  saas: { performance: 55, seo: 82, accessibility: 85, bestPractices: 85 },
  healthcare: { performance: 40, seo: 75, accessibility: 90, bestPractices: 78 },
  finance: { performance: 42, seo: 80, accessibility: 88, bestPractices: 82 },
  restaurant: { performance: 35, seo: 65, accessibility: 70, bestPractices: 72 },
  realestate: { performance: 38, seo: 70, accessibility: 75, bestPractices: 75 },
  default: { performance: 50, seo: 75, accessibility: 80, bestPractices: 80 }
}

// Core Web Vitals impact research (based on Google studies)
const CWV_IMPACT = {
  lcp: { goodThreshold: 2500, poorThreshold: 4000, bounceRateIncrease: 0.12, conversionImpact: 0.07 },
  cls: { goodThreshold: 0.1, poorThreshold: 0.25, bounceRateIncrease: 0.15, conversionImpact: 0.10 },
  fid: { goodThreshold: 100, poorThreshold: 300, bounceRateIncrease: 0.08, conversionImpact: 0.05 }
}

// PageSpeed API - request ALL categories (mobile only for speed)
async function runPageSpeed(url) {
  const key = process.env.PAGESPEED_API_KEY
  const base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
  const categories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa']
  const categoryParam = categories.map(c => `category=${c}`).join('&')
  
  const call = async (strategy) => {
    const apiUrl = `${base}?url=${encodeURIComponent(url)}&strategy=${strategy}&${categoryParam}${key ? `&key=${key}` : ''}`
    
    try {
      const res = await fetch(apiUrl)
      if (!res.ok) {
        console.error(`PageSpeed ${strategy} failed:`, res.status)
        return undefined
      }
      return await res.json()
    } catch (error) {
      console.error(`PageSpeed ${strategy} error:`, error)
      return undefined
    }
  }
  
  // Mobile only - desktop adds latency without much value for our use case
  const mobile = await call('mobile')
  return { mobile, desktop: null }
}

// SEO Checks
async function runSeoChecks(targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UptradeAuditBot/1.0)' }
    })
    
    const headers = Object.fromEntries(response.headers.entries())
    const html = await response.text()
    
    const get = (regex) => {
      const match = html.match(regex)
      return match ? match[1]?.trim() : ''
    }
    
    const title = get(/<title[^>]*>([^<]+)<\/title>/i)
    const metaDescription = get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    const hasH1 = /<h1[^>]*>/i.test(html)
    const h1Count = (html.match(/<h1[^>]*>/gi) || []).length
    const h1Text = get(/<h1[^>]*>([^<]+)<\/h1>/i)
    
    // Check canonical
    const canonical = get(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    
    // Check og tags
    const ogTitle = get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    const ogDescription = get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    const ogImage = get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    
    // Check structured data - Enhanced schema analysis
    const jsonLdScripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
    const hasJsonLd = jsonLdScripts.length > 0
    
    // Parse and analyze schema markup
    const schemaMarkup = {
      found: hasJsonLd,
      count: jsonLdScripts.length,
      types: [],
      details: [],
      recommended: []
    }
    
    jsonLdScripts.forEach(script => {
      try {
        const jsonContent = script.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '')
        const parsed = JSON.parse(jsonContent)
        
        // Handle both single schema and @graph arrays
        const schemas = parsed['@graph'] ? parsed['@graph'] : [parsed]
        
        schemas.forEach(schema => {
          const type = schema['@type']
          if (type) {
            const types = Array.isArray(type) ? type : [type]
            types.forEach(t => {
              if (!schemaMarkup.types.includes(t)) {
                schemaMarkup.types.push(t)
              }
            })
            
            // Extract schema details for common types
            const detail = { type: types.join(', ') }
            if (schema.name) detail.name = schema.name
            if (schema.description) detail.hasDescription = true
            if (schema.image) detail.hasImage = true
            if (schema.url) detail.url = schema.url
            if (schema.telephone) detail.telephone = schema.telephone
            if (schema.address) detail.hasAddress = true
            if (schema.aggregateRating) detail.hasRating = true
            if (schema.review) detail.hasReviews = true
            if (schema.priceRange) detail.priceRange = schema.priceRange
            if (schema.openingHours || schema.openingHoursSpecification) detail.hasHours = true
            if (schema.sameAs) detail.hasSocialLinks = true
            if (schema.mainEntity) detail.hasMainEntity = true
            if (schema.hasPart) detail.hasParts = true
            
            schemaMarkup.details.push(detail)
          }
        })
      } catch (e) {
        // Invalid JSON in script tag
        schemaMarkup.hasParseErrors = true
      }
    })
    
    // Check for microdata (itemscope/itemtype)
    const hasMicrodata = /itemscope|itemtype=/i.test(html)
    if (hasMicrodata) {
      schemaMarkup.hasMicrodata = true
      const microdataTypes = html.match(/itemtype=["']https?:\/\/schema\.org\/(\w+)["']/gi) || []
      microdataTypes.forEach(m => {
        const typeMatch = m.match(/schema\.org\/(\w+)/i)
        if (typeMatch && !schemaMarkup.types.includes(typeMatch[1])) {
          schemaMarkup.types.push(typeMatch[1] + ' (microdata)')
        }
      })
    }
    
    // Recommend missing schema types based on page content
    const recommendedSchemas = []
    const lowerHtml = html.toLowerCase()
    
    // Business/Organization
    if (!schemaMarkup.types.some(t => /organization|localbusiness|company/i.test(t))) {
      recommendedSchemas.push({ type: 'Organization or LocalBusiness', reason: 'Essential for business identity and local SEO' })
    }
    
    // Website
    if (!schemaMarkup.types.some(t => /website/i.test(t))) {
      recommendedSchemas.push({ type: 'WebSite', reason: 'Enables sitelinks search box in Google' })
    }
    
    // WebPage
    if (!schemaMarkup.types.some(t => /webpage|aboutpage|contactpage/i.test(t))) {
      recommendedSchemas.push({ type: 'WebPage', reason: 'Helps define page structure' })
    }
    
    // FAQ detection
    if ((lowerHtml.includes('faq') || lowerHtml.includes('frequently asked') || lowerHtml.includes('questions')) && 
        !schemaMarkup.types.some(t => /faqpage/i.test(t))) {
      recommendedSchemas.push({ type: 'FAQPage', reason: 'Detected FAQ content - enables FAQ rich results' })
    }
    
    // Product detection - Only for actual e-commerce sites, not service businesses with pricing
    // Must have e-commerce indicators (cart, SKU, quantity) AND NOT have Service schema
    const hasEcommerceIndicators = (lowerHtml.includes('add to cart') || lowerHtml.includes('buy now') || 
                                    lowerHtml.includes('sku') || lowerHtml.includes('quantity') ||
                                    lowerHtml.includes('shopping cart') || lowerHtml.includes('checkout'))
    const hasServiceSchema = schemaMarkup.types.some(t => /service|professionalservice|localbusiness/i.test(t))
    
    if (hasEcommerceIndicators && !hasServiceSchema && 
        !schemaMarkup.types.some(t => /product/i.test(t))) {
      recommendedSchemas.push({ type: 'Product', reason: 'Detected e-commerce content - enables product rich results' })
    }
    
    // Service detection - Check this BEFORE product to prioritize service businesses
    if ((lowerHtml.includes('services') || lowerHtml.includes('what we do') || lowerHtml.includes('our services') ||
         lowerHtml.includes('pricing') || lowerHtml.includes('packages') || lowerHtml.includes('get a quote')) && 
        !schemaMarkup.types.some(t => /service|professionalservice/i.test(t))) {
      recommendedSchemas.push({ type: 'Service', reason: 'Detected service content - improves service visibility' })
    }
    
    // Article/Blog detection
    // Avoid false positives from nav/footer links containing words like "blog" or "article".
    // Require either an article-like URL path OR actual article markup signals.
    let pathname = ''
    try {
      pathname = new URL(targetUrl).pathname.toLowerCase()
    } catch {}

    const isLikelyArticleRoute = /^\/(insights|blog|articles)(\/|$)/.test(pathname)
    const hasArticleElement = /<article\b/i.test(html)
    const hasTimeDatetime = /<time[^>]+datetime=["'][^"']+["']/i.test(html)
    const hasArticleMeta = /<meta[^>]+property=["']article:(published_time|modified_time|author|section|tag)["']/i.test(html)
    const hasArticleMicrodata = /itemtype=["']https?:\/\/schema\.org\/(Article|BlogPosting|NewsArticle)["']/i.test(html)

    const hasArticleSignals = hasArticleElement && (hasTimeDatetime || hasArticleMeta || lowerHtml.includes('published'))

    if ((isLikelyArticleRoute || hasArticleSignals || hasArticleMicrodata) &&
        !schemaMarkup.types.some(t => /article|blogposting|newsarticle/i.test(t))) {
      recommendedSchemas.push({ type: 'Article or BlogPosting', reason: 'Detected article content - enables article rich results' })
    }
    
    // BreadcrumbList
    if ((lowerHtml.includes('breadcrumb') || html.includes('›') || html.includes('»')) && 
        !schemaMarkup.types.some(t => /breadcrumblist/i.test(t))) {
      recommendedSchemas.push({ type: 'BreadcrumbList', reason: 'Detected breadcrumbs - enables breadcrumb rich results' })
    }
    
    schemaMarkup.recommended = recommendedSchemas.slice(0, 5)
    
    // Calculate schema score (0-100)
    let schemaScore = 0
    if (schemaMarkup.found) schemaScore += 30
    if (schemaMarkup.types.length >= 3) schemaScore += 20
    else if (schemaMarkup.types.length >= 1) schemaScore += 10
    if (schemaMarkup.types.some(t => /organization|localbusiness/i.test(t))) schemaScore += 15
    if (schemaMarkup.types.some(t => /website/i.test(t))) schemaScore += 10
    if (schemaMarkup.types.some(t => /webpage/i.test(t))) schemaScore += 5
    if (schemaMarkup.types.some(t => /faqpage|product|article|breadcrumblist/i.test(t))) schemaScore += 10
    if (schemaMarkup.details.some(d => d.hasRating)) schemaScore += 5
    if (schemaMarkup.details.some(d => d.hasReviews)) schemaScore += 5
    schemaMarkup.score = Math.min(schemaScore, 100)
    
    // Check viewport
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
    
    // Check for robots.txt and sitemap
    const robotsUrl = new URL('/robots.txt', targetUrl).toString()
    const sitemapUrl = new URL('/sitemap.xml', targetUrl).toString()
    
    let hasRobotsTxt = false
    let hasSitemap = false
    
    try {
      const robotsRes = await fetch(robotsUrl)
      hasRobotsTxt = robotsRes.ok
    } catch {}
    
    try {
      const sitemapRes = await fetch(sitemapUrl)
      hasSitemap = sitemapRes.ok
    } catch {}
    
    // Security headers
    const isHttps = targetUrl.startsWith('https')
    const hasHsts = !!headers['strict-transport-security']
    const hasXfo = !!headers['x-frame-options']
    const hasXcto = !!headers['x-content-type-options']
    const hasCsp = !!headers['content-security-policy']
    const hasReferrerPolicy = !!headers['referrer-policy']
    
    const securityScore = (isHttps ? 30 : 0) + (hasHsts ? 15 : 0) + (hasXfo ? 15 : 0) + 
                          (hasXcto ? 15 : 0) + (hasCsp ? 15 : 0) + (hasReferrerPolicy ? 10 : 0)
    
    return {
      title, titleLength: title.length, metaDescription, metaDescriptionLength: metaDescription.length,
      hasH1, h1Count, h1Text, canonical, ogTitle, ogDescription, ogImage, hasJsonLd, hasViewport,
      hasRobotsTxt, hasSitemap, securityScore, isHttps, hasHsts, hasXfo, hasXcto, hasCsp, hasReferrerPolicy,
      schemaMarkup
    }
  } catch (error) {
    console.error('SEO check error:', error)
    return { securityScore: 0, isHttps: false, schemaMarkup: { found: false, types: [], score: 0 } }
  }
}

// PWA Checks - Custom implementation since Google deprecated PWA category
async function runPwaChecks(targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UptradeAuditBot/1.0)' }
    })
    const html = await response.text()
    
    const checks = {
      isHttps: targetUrl.startsWith('https'),
      hasManifestLink: false,
      manifestUrl: null,
      hasServiceWorker: false,
      hasAppleTouchIcon: false,
      hasThemeColor: false,
      hasViewport: false,
      manifest: null
    }
    
    // Check for manifest link
    const manifestMatch = html.match(/<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']+)["']/i)
    if (manifestMatch) {
      checks.hasManifestLink = true
      checks.manifestUrl = new URL(manifestMatch[1], targetUrl).toString()
    }
    
    // Check for service worker registration in scripts or inline
    checks.hasServiceWorker = /navigator\.serviceWorker\.register|workbox|sw\.js/i.test(html)
    
    // Also check if /sw.js actually exists on the server (for bundled registrations)
    if (!checks.hasServiceWorker) {
      try {
        const swUrl = new URL('/sw.js', targetUrl).toString()
        const swRes = await fetch(swUrl, { method: 'HEAD' })
        if (swRes.ok && swRes.headers.get('content-type')?.includes('javascript')) {
          checks.hasServiceWorker = true
        }
      } catch (e) {
        // sw.js doesn't exist or isn't accessible
      }
    }
    
    // Check for apple-touch-icon
    checks.hasAppleTouchIcon = /<link[^>]+rel=["']apple-touch-icon["']/i.test(html)
    
    // Check for theme-color
    checks.hasThemeColor = /<meta[^>]+name=["']theme-color["']/i.test(html)
    
    // Check for viewport
    checks.hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
    
    // Fetch and validate manifest if found
    if (checks.manifestUrl) {
      try {
        const manifestRes = await fetch(checks.manifestUrl)
        if (manifestRes.ok) {
          const manifest = await manifestRes.json()
          checks.manifest = {
            hasName: !!(manifest.name || manifest.short_name),
            hasIcons: Array.isArray(manifest.icons) && manifest.icons.length > 0,
            hasStartUrl: !!manifest.start_url,
            hasDisplay: !!manifest.display,
            hasThemeColor: !!manifest.theme_color,
            hasBackgroundColor: !!manifest.background_color,
            icons: manifest.icons?.map(i => ({ src: i.src, sizes: i.sizes })).slice(0, 5) || []
          }
        }
      } catch (e) {
        console.error('Manifest fetch error:', e.message)
      }
    }
    
    // Calculate PWA score (0-100)
    let score = 0
    if (checks.isHttps) score += 25  // HTTPS is required
    if (checks.hasManifestLink) score += 15
    if (checks.manifest?.hasName) score += 10
    if (checks.manifest?.hasIcons) score += 10
    if (checks.manifest?.hasStartUrl) score += 10
    if (checks.manifest?.hasDisplay) score += 5
    if (checks.hasServiceWorker) score += 15
    if (checks.hasAppleTouchIcon) score += 5
    if (checks.hasThemeColor) score += 5
    
    return { score, checks }
  } catch (error) {
    console.error('PWA check error:', error)
    return { score: 0, checks: {} }
  }
}

// Generate specific PWA issues from check results
function generatePwaIssues(pwaResult) {
  const issues = []
  const checks = pwaResult?.checks || {}
  
  if (!checks.isHttps) {
    issues.push({
      title: 'Site Not Using HTTPS',
      severity: 'critical',
      description: 'HTTPS is required for PWA features and service workers',
      recommendation: 'Install an SSL certificate and redirect HTTP to HTTPS',
      points: 25
    })
  }
  
  if (!checks.hasManifestLink) {
    issues.push({
      title: 'Missing Web App Manifest',
      severity: 'warning',
      description: 'No manifest.json linked in the HTML',
      recommendation: 'Add a manifest.json file and link it with <link rel="manifest" href="/manifest.json">',
      points: 15
    })
  } else if (checks.manifest) {
    if (!checks.manifest.hasName) {
      issues.push({
        title: 'Manifest Missing Name',
        severity: 'warning',
        description: 'The manifest.json is missing a name or short_name',
        recommendation: 'Add "name" and "short_name" to your manifest.json',
        points: 10
      })
    }
    if (!checks.manifest.hasIcons) {
      issues.push({
        title: 'Manifest Missing Icons',
        severity: 'warning',
        description: 'The manifest.json has no icons array',
        recommendation: 'Add icons in multiple sizes (192x192 and 512x512 minimum) to your manifest',
        points: 10
      })
    }
    if (!checks.manifest.hasStartUrl) {
      issues.push({
        title: 'Manifest Missing Start URL',
        severity: 'info',
        description: 'The manifest.json is missing start_url',
        recommendation: 'Add "start_url": "/" to your manifest.json',
        points: 10
      })
    }
    if (!checks.manifest.hasDisplay) {
      issues.push({
        title: 'Manifest Missing Display Mode',
        severity: 'info',
        description: 'The manifest.json is missing display mode',
        recommendation: 'Add "display": "standalone" or "fullscreen" to your manifest',
        points: 5
      })
    }
  }
  
  if (!checks.hasServiceWorker) {
    issues.push({
      title: 'No Service Worker Detected',
      severity: 'warning',
      description: 'No service worker registration found - required for offline support and PWA installability',
      recommendation: 'Register a service worker to enable offline caching and push notifications',
      points: 15
    })
  }
  
  if (!checks.hasAppleTouchIcon) {
    issues.push({
      title: 'Missing Apple Touch Icon',
      severity: 'info',
      description: 'No apple-touch-icon found for iOS devices',
      recommendation: 'Add <link rel="apple-touch-icon" href="/apple-touch-icon.png"> with a 180x180 icon',
      points: 5
    })
  }
  
  if (!checks.hasThemeColor) {
    issues.push({
      title: 'Missing Theme Color',
      severity: 'info',
      description: 'No theme-color meta tag found',
      recommendation: 'Add <meta name="theme-color" content="#yourcolor"> to match your brand',
      points: 5
    })
  }
  
  return issues
}

// Extract resource breakdown from PSI data
function extractResourceBreakdown(psi) {
  const lighthouse = psi?.mobile?.lighthouseResult || psi?.desktop?.lighthouseResult || {}
  const audits = lighthouse.audits || {}
  const networkRequests = audits['network-requests']?.details?.items || []
  
  const images= [], scripts= [], fonts= [], stylesheets= [], thirdParty= []
  
  const targetOrigin = psi?.mobile?.lighthouseResult?.finalUrl 
    ? new URL(psi.mobile.lighthouseResult.finalUrl).origin : ''
  
  networkRequests.forEach((req) => {
    const url = req.url || ''
    const size = req.transferSize || 0
    const sizeKb = Math.round(size / 1024)
    
    let isThirdParty = false
    try {
      const reqOrigin = new URL(url).origin
      isThirdParty = !!targetOrigin && reqOrigin !== targetOrigin
    } catch {}
    
    const resource = { url: url.substring(0, 100), sizeKb, sizeFormatted: sizeKb > 1024 ? `${(sizeKb/1024).toFixed(1)} MB` : `${sizeKb} KB`, isThirdParty }
    
    if (isThirdParty && sizeKb > 5) thirdParty.push(resource)
    if (/\.(jpg|jpeg|png|gif|webp|svg|avif)/i.test(url)) images.push(resource)
    else if (/\.js(\?|$)/i.test(url)) scripts.push(resource)
    else if (/\.(woff2?|ttf|otf|eot)/i.test(url)) fonts.push(resource)
    else if (/\.css(\?|$)/i.test(url)) stylesheets.push(resource)
  })
  
  const sortBySize = (a, b) => b.sizeKb - a.sizeKb
  
  return {
    images: images.sort(sortBySize).slice(0, 5),
    scripts: scripts.sort(sortBySize).slice(0, 5),
    fonts: fonts.sort(sortBySize).slice(0, 5),
    stylesheets: stylesheets.sort(sortBySize).slice(0, 3),
    thirdParty: thirdParty.sort(sortBySize).slice(0, 8),
    totals: {
      images: images.reduce((sum, r) => sum + r.sizeKb, 0),
      scripts: scripts.reduce((sum, r) => sum + r.sizeKb, 0),
      fonts: fonts.reduce((sum, r) => sum + r.sizeKb, 0),
      stylesheets: stylesheets.reduce((sum, r) => sum + r.sizeKb, 0),
      thirdParty: thirdParty.reduce((sum, r) => sum + r.sizeKb, 0),
      total: networkRequests.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024
    }
  }
}

// Extract performance opportunities from PSI
function extractOpportunities(psi) {
  const lighthouse = psi?.mobile?.lighthouseResult || {}
  const audits = lighthouse.audits || {}
  
  return Object.values(audits)
    .filter((a) => a.details?.type === 'opportunity' && a.score !== null && a.score < 1)
    .map((a) => ({
      title: a.title,
      description: a.description?.substring(0, 200),
      savings: a.displayValue || '',
      score: Math.round((a.score || 0) * 100),
      impact: a.details?.overallSavingsMs ? `${Math.round(a.details.overallSavingsMs)}ms` : ''
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 10)
}

// Extract accessibility issues from PSI
function extractAccessibilityIssues(psi) {
  const lighthouse = psi?.mobile?.lighthouseResult || {}
  const audits = lighthouse.audits || {}
  const categories = lighthouse.categories?.accessibility?.auditRefs || []
  
  return categories
    .map((ref) => audits[ref.id])
    .filter((a) => a && a.score !== null && a.score < 1)
    .map((a) => ({
      title: a.title,
      description: a.description?.substring(0, 150),
      severity: a.score === 0 ? 'critical' : a.score < 0.5 ? 'warning' : 'info',
      impact: a.details?.items?.length ? `Affects ${a.details.items.length} element(s)` : ''
    }))
    .slice(0, 10)
}

// Calculate business impact based on Core Web Vitals
function calculateBusinessImpact(metrics) {
  const impact = { summary: '', details: [], estimatedBounceIncrease: 0, estimatedConversionLoss: 0, recommendations: [] }
  
  if (metrics.lcpMs) {
    const lcpSeconds = metrics.lcpMs / 1000
    if (lcpSeconds > CWV_IMPACT.lcp.goodThreshold / 1000) {
      const excessSeconds = lcpSeconds - (CWV_IMPACT.lcp.goodThreshold / 1000)
      const bounceIncrease = Math.round(excessSeconds * CWV_IMPACT.lcp.bounceRateIncrease * 100)
      const conversionLoss = Math.round(excessSeconds * CWV_IMPACT.lcp.conversionImpact * 100)
      impact.estimatedBounceIncrease += bounceIncrease
      impact.estimatedConversionLoss += conversionLoss
      impact.details.push({
        metric: 'LCP (Largest Contentful Paint)', value: `${lcpSeconds.toFixed(1)}s`, target: '<2.5s',
        impact: `May increase bounce rate by ~${bounceIncrease}% and reduce conversions by ~${conversionLoss}%`,
        severity: lcpSeconds > 4 ? 'critical' : 'warning'
      })
    }
  }
  
  if (metrics.clsScore && metrics.clsScore > CWV_IMPACT.cls.goodThreshold) {
    const severity = metrics.clsScore > CWV_IMPACT.cls.poorThreshold ? 'critical' : 'warning'
    const bounceIncrease = severity === 'critical' ? 15 : 8
    impact.estimatedBounceIncrease += bounceIncrease
    impact.estimatedConversionLoss += Math.round(bounceIncrease * 0.7)
    impact.details.push({
      metric: 'CLS (Cumulative Layout Shift)', value: metrics.clsScore.toFixed(3), target: '<0.1',
      impact: `Layout instability may frustrate users, increasing bounce rate by ~${bounceIncrease}%`, severity
    })
  }
  
  if (metrics.tbtMs && metrics.tbtMs > 200) {
    const severity = metrics.tbtMs > 600 ? 'critical' : 'warning'
    const bounceIncrease = severity === 'critical' ? 10 : 5
    impact.estimatedBounceIncrease += bounceIncrease
    impact.details.push({
      metric: 'TBT (Total Blocking Time)', value: `${Math.round(metrics.tbtMs)}ms`, target: '<200ms',
      impact: `Page feels unresponsive, potentially losing ~${bounceIncrease}% of visitors`, severity
    })
  }
  
  impact.summary = impact.estimatedBounceIncrease > 0
    ? `Based on your Core Web Vitals, your site may be losing approximately ${impact.estimatedBounceIncrease}% of visitors due to slow loading and ${impact.estimatedConversionLoss}% of potential conversions. Improving these metrics could significantly increase engagement and revenue.`
    : `Your Core Web Vitals are within acceptable ranges! This means your site provides a good user experience and shouldn't be losing visitors due to performance issues.`
  
  return impact
}

// Compare against industry benchmarks
function compareToIndustry(metrics, industry = 'default') {
  const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.default
  
  const comparisons = [
    { metric: 'Performance', score: metrics.performance, benchmark: benchmarks.performance, diff: metrics.performance - benchmarks.performance, percentile: metrics.performance >= benchmarks.performance ? 'above average' : 'below average' },
    { metric: 'SEO', score: metrics.seo, benchmark: benchmarks.seo, diff: metrics.seo - benchmarks.seo, percentile: metrics.seo >= benchmarks.seo ? 'above average' : 'below average' },
    { metric: 'Accessibility', score: metrics.accessibility, benchmark: benchmarks.accessibility, diff: metrics.accessibility - benchmarks.accessibility, percentile: metrics.accessibility >= benchmarks.accessibility ? 'above average' : 'below average' },
    { metric: 'Best Practices', score: metrics.bestPractices, benchmark: benchmarks.bestPractices, diff: metrics.bestPractices - benchmarks.bestPractices, percentile: metrics.bestPractices >= benchmarks.bestPractices ? 'above average' : 'below average' }
  ]
  
  const overallPerformance = comparisons.filter(c => c.diff >= 0).length
  const summary = overallPerformance >= 3 
    ? `Your website outperforms ${Math.round((overallPerformance/4) * 100)}% of industry averages!`
    : `Your website is below industry average in ${4 - overallPerformance} key areas. There's room for improvement.`
  
  return { comparisons, summary, industry: industry === 'default' ? 'all industries' : industry }
}

// Generate code snippets for common fixes
function generateCodeSnippets(metrics, seo, resources) {
  const snippets= []
  
  if (resources.images.length > 0) {
    snippets.push({
      title: 'Add Lazy Loading to Images',
      description: 'Defer loading of off-screen images to improve initial page load',
      language: 'html',
      code: `<!-- Add loading="lazy" to images below the fold -->
<img src="image.jpg" loading="lazy" alt="Description" width="800" height="600">

<!-- For critical above-fold images, use fetchpriority -->
<img src="hero.jpg" fetchpriority="high" alt="Hero image" width="1200" height="600">`
    })
  }
  
  if (resources.thirdParty.length > 0) {
    const domains = [...new Set(resources.thirdParty.map((r) => {
      try { return new URL(r.url).origin } catch { return null }
    }).filter(Boolean))].slice(0, 3)
    
    if (domains.length > 0) {
      snippets.push({
        title: 'Add Preconnect Hints',
        description: 'Speed up third-party connections by establishing early connections',
        language: 'html',
        code: `<!-- Add to <head> section -->
${domains.map(d => `<link rel="preconnect" href="${d}" crossorigin>`).join('\n')}`
      })
    }
  }
  
  if (!seo.hasCsp || !seo.hasHsts) {
    snippets.push({
      title: 'Add Security Headers',
      description: 'Protect your site with essential security headers',
      language: 'text',
      code: `# Add to your server config or _headers file (Netlify)

/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:;`
    })
  }
  
  if (!seo.metaDescription || seo.metaDescriptionLength < 120) {
    snippets.push({
      title: 'Add/Improve Meta Description',
      description: 'A compelling meta description improves click-through rates from search results',
      language: 'html',
      code: `<!-- Add to <head> section - aim for 120-160 characters -->
<meta name="description" content="Your compelling page description here. Include your main keyword naturally and a call to action. This appears in search results.">`
    })
  }
  
  if (metrics.clsScore && metrics.clsScore > 0.1) {
    snippets.push({
      title: 'Prevent Layout Shift',
      description: 'Set explicit dimensions on images and embeds to prevent layout shift',
      language: 'html',
      code: `<!-- Always specify width and height for images -->
<img src="photo.jpg" width="800" height="600" alt="Description">

<!-- Use aspect-ratio for responsive images -->
<style>
  .responsive-img { width: 100%; height: auto; aspect-ratio: 16 / 9; }
</style>

<!-- Reserve space for ads/embeds -->
<div style="min-height: 250px;"><!-- Ad or embed content --></div>`
    })
  }
  
  return snippets
}

// Generate AI insights using OpenAI
async function generateAIInsights(targetUrl, metrics, seo, resources, opportunities, accessibilityIssues, businessImpact) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.log('[OpenAI] No API key, skipping AI insights')
    return null
  }
  
  const prompt = `You are an expert web performance consultant. Analyze this website audit and provide executive-level insights.

Website: ${targetUrl}

SCORES:
- Performance: ${metrics.performance}/100 (Mobile: ${metrics.performanceMobile}, Desktop: ${metrics.performanceDesktop})
- SEO: ${metrics.seo}/100
- Accessibility: ${metrics.accessibility}/100
- Best Practices: ${metrics.bestPractices}/100
- Security: ${metrics.security}/100
- Overall Grade: ${metrics.grade}

CORE WEB VITALS:
- LCP: ${metrics.lcpMs ? (metrics.lcpMs/1000).toFixed(2) + 's' : 'N/A'} (target: <2.5s)
- CLS: ${metrics.clsScore?.toFixed(3) || 'N/A'} (target: <0.1)
- TBT: ${metrics.tbtMs ? Math.round(metrics.tbtMs) + 'ms' : 'N/A'} (target: <200ms)

SEO FINDINGS:
- Title: "${seo.title}" (${seo.titleLength} chars)
- Meta Description: ${seo.metaDescriptionLength} chars
- Has Sitemap: ${seo.hasSitemap}
- Has Schema/JSON-LD: ${seo.hasJsonLd}

RESOURCE ANALYSIS:
- Total Page Weight: ${Math.round(resources.totals.total)} KB
- Images: ${Math.round(resources.totals.images)} KB
- JavaScript: ${Math.round(resources.totals.scripts)} KB
- Third-party: ${Math.round(resources.totals.thirdParty)} KB

TOP PERFORMANCE OPPORTUNITIES:
${opportunities.slice(0, 5).map((o) => `- ${o.title}: ${o.savings}`).join('\n')}

BUSINESS IMPACT:
${businessImpact.summary}

Provide a JSON response with:
{
  "executiveSummary": "2-3 sentence summary for a business owner, focusing on business impact",
  "topPriorities": ["3-5 most impactful actions, in priority order"],
  "quickWins": ["2-3 things that can be fixed in under an hour"],
  "technicalDebt": "1-2 sentences about any underlying technical issues",
  "competitiveAnalysis": "How does this site likely compare to competitors based on these metrics",
  "estimatedROI": "Rough estimate of potential improvement if top issues are fixed"
}`

  try {
    console.log('[OpenAI] Generating AI insights...')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a senior web performance consultant. Provide actionable, business-focused insights. Always respond with valid JSON only, no markdown code blocks.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    })
    
    if (!response.ok) {
      console.error('[OpenAI] API error:', response.status)
      return null
    }
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()
    const jsonStr = content.replace(/^```json\n?|\n?```$/g, '').trim()
    const insights = JSON.parse(jsonStr)
    console.log('[OpenAI] AI insights generated successfully')
    return insights
  } catch (error) {
    console.error('[OpenAI] Failed:', error.message)
    return null
  }
}

// Summarize scores and extract all useful data
function summarizeScores(psi, seo, customPwaScore = null) {
  const getScore = (obj, path) => path.reduce((acc, key) => acc?.[key], obj)
  const getNumeric = (obj, auditId) => obj?.lighthouseResult?.audits?.[auditId]?.numericValue
  
  // Category scores (0-100)
  const mobilePerf = Math.round((getScore(psi?.mobile, ['lighthouseResult', 'categories', 'performance', 'score']) ?? 0) * 100)
  const desktopPerf = Math.round((getScore(psi?.desktop, ['lighthouseResult', 'categories', 'performance', 'score']) ?? 0) * 100)
  const mobileAccessibility = Math.round((getScore(psi?.mobile, ['lighthouseResult', 'categories', 'accessibility', 'score']) ?? 0) * 100)
  const mobileBestPractices = Math.round((getScore(psi?.mobile, ['lighthouseResult', 'categories', 'best-practices', 'score']) ?? 0) * 100)
  // Use custom PWA score since Google deprecated the category
  const lighthouseSeo = Math.round((getScore(psi?.mobile, ['lighthouseResult', 'categories', 'seo', 'score']) ?? 0) * 100)
  
  const performance = Math.round((mobilePerf + desktopPerf) / 2)
  
  // Core Web Vitals from mobile
  const lcpMs = getNumeric(psi?.mobile, 'largest-contentful-paint')
  const fcpMs = getNumeric(psi?.mobile, 'first-contentful-paint')
  const clsScore = getNumeric(psi?.mobile, 'cumulative-layout-shift')
  const tbtMs = getNumeric(psi?.mobile, 'total-blocking-time')
  const ttiMs = getNumeric(psi?.mobile, 'interactive')
  const speedIndexMs = getNumeric(psi?.mobile, 'speed-index')
  const fidMs = getNumeric(psi?.mobile, 'max-potential-fid')
  
  // Schema markup score (0-100)
  const schema = seo.schemaMarkup || { found: false, types: [], score: 0, recommended: [] }
  const schemaScore = schema.score || 0
  
  // Traditional SEO score (without schema)
  let traditionalSeoScore = lighthouseSeo
  if (!traditionalSeoScore || traditionalSeoScore === 0) {
    let seoPoints = 0
    if (seo.title && seo.titleLength >= 30 && seo.titleLength <= 60) seoPoints += 15
    else if (seo.title) seoPoints += 8
    if (seo.metaDescription && seo.metaDescriptionLength >= 120 && seo.metaDescriptionLength <= 160) seoPoints += 15
    else if (seo.metaDescription) seoPoints += 8
    if (seo.hasH1 && seo.h1Count === 1) seoPoints += 10
    else if (seo.hasH1) seoPoints += 5
    if (seo.hasRobotsTxt) seoPoints += 7
    if (seo.hasSitemap) seoPoints += 8
    if (seo.ogTitle) seoPoints += 5
    traditionalSeoScore = Math.min(seoPoints + 40, 100)
  }
  
  // Final SEO score: 90% traditional SEO + 10% schema markup
  // A site with 100 SEO and 0 schema = 90, with 100 schema = 100
  const seoScore = Math.round((traditionalSeoScore * 0.9) + (schemaScore * 0.1))
  
  const securityScore = seo.securityScore || 0
  const accessibility = mobileAccessibility || 60
  const bestPractices = mobileBestPractices || 0
  const pwa = customPwaScore ?? 0  // Use custom PWA check score
  
  const overallScore = Math.round((performance + seoScore + securityScore + accessibility) / 4)
  const grade = overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F'
  
  // Generate SEO Issues
  const seoIssues= []
  if (!seo.title) seoIssues.push({ title: 'Missing Page Title', severity: 'critical', description: 'No title tag found', recommendation: 'Add a descriptive title tag (30-60 characters)' })
  else if (seo.titleLength > 60) seoIssues.push({ title: 'Title Too Long', severity: 'warning', description: `Title is ${seo.titleLength} characters`, recommendation: 'Shorten to under 60 characters' })
  else if (seo.titleLength < 30) seoIssues.push({ title: 'Title Too Short', severity: 'warning', description: `Title is only ${seo.titleLength} characters`, recommendation: 'Expand to 30-60 characters' })
  
  if (!seo.metaDescription) seoIssues.push({ title: 'Missing Meta Description', severity: 'critical', description: 'No meta description found', recommendation: 'Add a compelling meta description (120-160 characters)' })
  else if (seo.metaDescriptionLength > 160) seoIssues.push({ title: 'Meta Description Too Long', severity: 'warning', description: `Description is ${seo.metaDescriptionLength} characters`, recommendation: 'Shorten to 120-160 characters', details: { currentText: seo.metaDescription, currentLength: seo.metaDescriptionLength, maxLength: 160 } })
  else if (seo.metaDescriptionLength < 120) seoIssues.push({ title: 'Meta Description Too Short', severity: 'info', description: `Description is only ${seo.metaDescriptionLength} characters`, recommendation: 'Expand to 120-160 characters', details: { currentText: seo.metaDescription, currentLength: seo.metaDescriptionLength, minLength: 120 } })
  
  if (!seo.hasH1) seoIssues.push({ title: 'Missing H1 Tag', severity: 'critical', description: 'No H1 heading found', recommendation: 'Add one H1 tag with your primary keyword' })
  else if (seo.h1Count > 1) seoIssues.push({ title: 'Multiple H1 Tags', severity: 'warning', description: `Found ${seo.h1Count} H1 tags`, recommendation: 'Use only one H1 per page' })
  
  if (!seo.hasRobotsTxt) seoIssues.push({ title: 'Missing robots.txt', severity: 'warning', description: 'No robots.txt found', recommendation: 'Create a robots.txt file' })
  if (!seo.hasSitemap) seoIssues.push({ title: 'Missing Sitemap', severity: 'warning', description: 'No sitemap.xml found', recommendation: 'Create and submit an XML sitemap' })
  if (!seo.ogTitle) seoIssues.push({ title: 'Missing Open Graph Tags', severity: 'info', description: 'No Open Graph meta tags', recommendation: 'Add og:title, og:description, og:image' })
  
  // Schema Markup Issues (uses schema variable defined above for scoring)
  if (!schema.found) {
    seoIssues.push({ 
      title: 'No Structured Data (Schema Markup)', 
      severity: 'warning', 
      description: 'No JSON-LD or microdata schema found on this page', 
      recommendation: 'Add structured data to enable rich snippets in search results. Start with Organization/LocalBusiness and WebSite schemas.' 
    })
  } else {
    // Check for essential schema types
    if (!schema.types.some(t => /organization|localbusiness/i.test(t))) {
      seoIssues.push({ 
        title: 'Missing Organization Schema', 
        severity: 'info', 
        description: 'No Organization or LocalBusiness schema found', 
        recommendation: 'Add Organization schema for brand recognition or LocalBusiness for local SEO' 
      })
    }
    if (!schema.types.some(t => /website/i.test(t))) {
      seoIssues.push({ 
        title: 'Missing WebSite Schema', 
        severity: 'info', 
        description: 'No WebSite schema found', 
        recommendation: 'Add WebSite schema to enable sitelinks search box in Google' 
      })
    }
    if (schema.hasParseErrors) {
      seoIssues.push({ 
        title: 'Invalid Schema Markup', 
        severity: 'warning', 
        description: 'Some JSON-LD schema contains syntax errors', 
        recommendation: 'Validate your structured data at https://validator.schema.org/' 
      })
    }
  }
  
  // Add recommended schemas as info-level issues
  if (schema.recommended && schema.recommended.length > 0) {
    schema.recommended.slice(0, 2).forEach(rec => {
      seoIssues.push({
        title: `Consider Adding ${rec.type} Schema`,
        severity: 'info',
        description: rec.reason,
        recommendation: `Add ${rec.type} structured data to improve search visibility`
      })
    })
  }
  
  // Performance Issues
  const performanceIssues= []
  if (lcpMs && lcpMs > 2500) performanceIssues.push({ title: 'Slow LCP', severity: lcpMs > 4000 ? 'critical' : 'warning', description: `LCP is ${(lcpMs/1000).toFixed(1)}s (target: <2.5s)`, recommendation: 'Optimize largest contentful paint element - usually hero image or text block' })
  if (fcpMs && fcpMs > 1800) performanceIssues.push({ title: 'Slow FCP', severity: 'warning', description: `FCP is ${(fcpMs/1000).toFixed(1)}s (target: <1.8s)`, recommendation: 'Reduce server response time and eliminate render-blocking resources' })
  if (clsScore && clsScore > 0.1) performanceIssues.push({ title: 'Layout Shift', severity: clsScore > 0.25 ? 'critical' : 'warning', description: `CLS is ${clsScore.toFixed(3)} (target: <0.1)`, recommendation: 'Set explicit dimensions on images, embeds, and ads' })
  if (tbtMs && tbtMs > 200) performanceIssues.push({ title: 'High Blocking Time', severity: tbtMs > 600 ? 'critical' : 'warning', description: `TBT is ${Math.round(tbtMs)}ms (target: <200ms)`, recommendation: 'Reduce JavaScript execution time and break up long tasks' })
  if (ttiMs && ttiMs > 3800) performanceIssues.push({ title: 'Slow Time to Interactive', severity: ttiMs > 7300 ? 'critical' : 'warning', description: `TTI is ${(ttiMs/1000).toFixed(1)}s (target: <3.8s)`, recommendation: 'Minimize main-thread work and reduce JavaScript payload' })
  
  // Security Issues
  const securityIssues = {
    https: seo.isHttps ?? true, csp: seo.hasCsp ?? false, xFrameOptions: seo.hasXfo ?? false,
    xContentType: seo.hasXcto ?? false, hsts: seo.hasHsts ?? false, referrerPolicy: seo.hasReferrerPolicy ?? false
  }
  
  // Priority Actions
  const priorityActions= []
  if (seoIssues.some(i => i.severity === 'critical')) priorityActions.push('Fix critical SEO issues (missing title/description)')
  if (performanceIssues.some(i => i.severity === 'critical')) priorityActions.push('Address critical performance issues')
  if (accessibility < 70) priorityActions.push('Improve accessibility (currently failing)')
  else if (accessibility < 90) priorityActions.push('Enhance accessibility')
  if (securityScore < 60) priorityActions.push('Add security headers')
  if (bestPractices < 80) priorityActions.push('Follow web best practices')
  if (!schema.found || schema.score < 50) priorityActions.push('Implement structured data for rich snippets')
  
  const issueCount = seoIssues.length + performanceIssues.length
  const insightsSummary = `Your website scored ${overallScore}/100 overall (Grade: ${grade}). ${issueCount > 0 ? `We found ${issueCount} issues across SEO and performance that need attention.` : 'Great job - no major issues found!'} ${performance < 50 ? 'Performance is a critical concern - your site may be losing visitors due to slow load times.' : performance < 70 ? 'Performance could be improved to provide a better user experience.' : ''}`
  
  return {
    performance, performanceMobile: mobilePerf, performanceDesktop: desktopPerf, seo: seoScore, lighthouseSeo,
    accessibility, bestPractices, pwa, security: securityScore, overall: overallScore, grade,
    lcpMs, fcpMs, clsScore, tbtMs, ttiMs, speedIndexMs, fidMs,
    seoIssues, performanceIssues, securityIssues, priorityActions, insightsSummary,
    schemaMarkup: schema
  }
}

exports.handler = async (event) => {
  const body = JSON.parse(event.body || '{}')
  const { auditId, skipEmail = false } = body
  
  if (!auditId) {
    console.error('No audit ID provided')
    return { statusCode: 400, body: JSON.stringify({ error: 'No audit ID' }) }
  }
  
  console.log(`[Background] Starting comprehensive audit: ${auditId}${skipEmail ? ' (skipEmail=true)' : ''}`)
  
  try {
    const { data: audit, error: auditError } = await supabase.from('audits').select('*').eq('id', auditId).single()
    
    if (auditError || !audit) {
      console.error('Audit not found:', auditId, auditError)
      return { statusCode: 404, body: JSON.stringify({ error: 'Audit not found' }) }
    }
    
    await supabase.from('audits').update({ status: 'running' }).eq('id', auditId)
    
    console.log(`[Background] Running analysis for: ${audit.target_url}`)
    
    const [psi, seo, pwaResult] = await Promise.all([
      runPageSpeed(audit.target_url), 
      runSeoChecks(audit.target_url),
      runPwaChecks(audit.target_url)
    ])
    
    const hasMobileData = psi?.mobile?.lighthouseResult?.categories?.performance?.score !== undefined
    const hasDesktopData = psi?.desktop?.lighthouseResult?.categories?.performance?.score !== undefined
    
    if (!hasMobileData && !hasDesktopData) {
      console.error('[Background] PageSpeed returned no valid data')
      await supabase.from('audits').update({ status: 'failed', error_message: 'PageSpeed analysis failed - site may be blocking automated requests' }).eq('id', auditId)
      return { statusCode: 500, body: JSON.stringify({ error: 'PageSpeed failed' }) }
    }
    
    console.log(`[Background] PWA check score: ${pwaResult?.score ?? 'N/A'}`)
    
    const metrics = summarizeScores(psi, seo, pwaResult?.score)
    const resources = extractResourceBreakdown(psi)
    const opportunities = extractOpportunities(psi)
    const accessibilityIssues = extractAccessibilityIssues(psi)
    const businessImpact = calculateBusinessImpact(metrics)
    const industryComparison = compareToIndustry(metrics)
    const codeSnippets = generateCodeSnippets(metrics, seo, resources)
    
    const aiInsights = await generateAIInsights(audit.target_url, metrics, seo, resources, opportunities, accessibilityIssues, businessImpact)
    
    console.log('[Background] All analyses complete')
    
    const summary = {
      seo, grade: metrics.grade,
      metrics: {
        performance: metrics.performance, performanceMobile: metrics.performanceMobile, performanceDesktop: metrics.performanceDesktop,
        seo: metrics.seo, lighthouseSeo: metrics.lighthouseSeo, accessibility: metrics.accessibility,
        bestPractices: metrics.bestPractices, pwa: metrics.pwa, security: metrics.security, overall: metrics.overall,
        lcpMs: metrics.lcpMs, fcpMs: metrics.fcpMs, clsScore: metrics.clsScore, tbtMs: metrics.tbtMs, ttiMs: metrics.ttiMs, speedIndexMs: metrics.speedIndexMs, fidMs: metrics.fidMs
      },
      pwaChecks: pwaResult?.checks || {},  // Include detailed PWA check results
      pwaIssues: generatePwaIssues(pwaResult),  // Add specific PWA issues
      seoIssues: metrics.seoIssues, performanceIssues: metrics.performanceIssues, accessibilityIssues, securityIssues: metrics.securityIssues,
      priorityActions: aiInsights?.topPriorities || metrics.priorityActions,
      quickWins: aiInsights?.quickWins || [],
      insightsSummary: aiInsights?.executiveSummary || metrics.insightsSummary,
      resources: { heaviestImages: resources.images, heaviestScripts: resources.scripts, fonts: resources.fonts, thirdParty: resources.thirdParty, totals: resources.totals },
      opportunities, businessImpact, industryComparison, codeSnippets, aiInsights
    }
    
    await supabase.from('audits').update({
      performance_score: metrics.performance, seo_score: metrics.seo, accessibility_score: metrics.accessibility,
      best_practices_score: metrics.bestPractices, pwa_score: metrics.pwa, score_security: metrics.security, score_overall: metrics.overall,
      lcp_ms: metrics.lcpMs, fcp_ms: metrics.fcpMs, cls_score: metrics.clsScore, tbt_ms: metrics.tbtMs, tti_ms: metrics.ttiMs, speed_index_ms: metrics.speedIndexMs, fid_ms: metrics.fidMs,
      summary, status: 'complete', completed_at: new Date().toISOString()
    }).eq('id', auditId)
    
    // Portal: Email is sent manually after admin review via audits-send-email.js
    console.log('[Background] Audit complete and saved. Email can be sent manually from portal.')
    
    return { statusCode: 200, body: JSON.stringify({ success: true, auditId, grade: metrics.grade, overall: metrics.overall }) }
    
  } catch (error) {
    console.error('[Background] Audit error:', error)
    await supabase.from('audits').update({ status: 'failed', error_message: error.message }).eq('id', auditId)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}

exports.config = { type: "background" }
