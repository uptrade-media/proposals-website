/**
 * SEO Config - Public endpoint for fetching SEO configuration
 * Used by tenant sites to get page-level SEO settings
 */

import { createSupabaseAdmin } from './utils/supabase.js'

export async function handler(event) {
  // CORS headers - allow all origins for public API
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-ID',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    
    const url = new URL(event.rawUrl || `http://localhost${event.rawPath}`)
    const pageType = url.searchParams.get('pageType') || 'home'
    const slug = url.searchParams.get('slug')
    const tenantId = event.headers['x-tenant-id']

    // Default SEO config
    const defaultConfig = {
      title: 'Uptrade Media',
      description: 'Digital marketing and web development agency',
      canonical: null,
      ogImage: null,
      noIndex: false,
      schema: []
    }

    // If no tenant, return defaults
    if (!tenantId) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultConfig)
      }
    }

    // Get tenant's SEO settings
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, domain, seo_settings, org_id')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultConfig)
      }
    }

    // Get global SEO settings from seo_settings JSONB column
    const globalSeo = tenant.seo_settings || {}
    
    // Build base config from tenant
    let seoConfig = {
      title: globalSeo.defaultTitle || tenant.name,
      description: globalSeo.defaultDescription || defaultConfig.description,
      canonical: null,
      ogImage: globalSeo.defaultOgImage || null,
      noIndex: false,
      schema: []
    }

    // Handle page-specific SEO
    switch (pageType) {
      case 'home':
        seoConfig.schema = [
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: tenant.name,
            url: `https://${tenant.domain}`
          },
          ...(globalSeo.organizationSchema ? [{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            ...globalSeo.organizationSchema
          }] : [])
        ]
        break

      case 'product':
        // For product pages, slug would be the product handle
        if (slug) {
          seoConfig.canonical = `https://${tenant.domain}/products/${slug}`
        }
        break

      case 'collection':
        if (slug) {
          seoConfig.canonical = `https://${tenant.domain}/collections/${slug}`
        }
        break

      case 'article':
        // Fetch article SEO if slug provided
        if (slug) {
          const { data: article } = await supabase
            .from('blog_posts')
            .select('title, seo_title, seo_description, og_image, slug, published_at, author')
            .eq('slug', slug)
            .eq('status', 'published')
            .single()

          if (article) {
            seoConfig = {
              title: article.seo_title || article.title,
              description: article.seo_description || seoConfig.description,
              canonical: `https://${tenant.domain}/blog/${article.slug}`,
              ogImage: article.og_image || seoConfig.ogImage,
              noIndex: false,
              schema: [{
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: article.title,
                datePublished: article.published_at,
                author: {
                  '@type': 'Person',
                  name: article.author || tenant.name
                }
              }]
            }
          }
        }
        break

      case 'page':
        // Look up custom page SEO from seo_pages table if it exists
        if (slug) {
          const { data: pageSeo } = await supabase
            .from('seo_pages')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('page_path', slug)
            .single()

          if (pageSeo) {
            seoConfig = {
              title: pageSeo.title || seoConfig.title,
              description: pageSeo.description || seoConfig.description,
              canonical: pageSeo.canonical || null,
              ogImage: pageSeo.og_image || seoConfig.ogImage,
              noIndex: pageSeo.no_index || false,
              schema: pageSeo.schema || []
            }
          }
        }
        break
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(seoConfig)
    }
  } catch (error) {
    console.error('SEO config error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch SEO config',
        details: error.message
      })
    }
  }
}
