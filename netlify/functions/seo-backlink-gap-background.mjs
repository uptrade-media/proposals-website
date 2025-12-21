/**
 * SEO Backlink Gap Background Function
 * 
 * Analyzes backlink gaps between site and competitors using AI.
 * Background functions can run up to 15 minutes.
 * 
 * Triggered by POST from seo-backlink-gap.js
 */

import { createClient } from '@supabase/supabase-js'
import { SEOSkill } from './skills/seo-skill.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req) {
  console.log('[seo-backlink-gap-background] Starting...')

  try {
    const { siteId, competitorDomains, manualBacklinks, jobId } = await req.json()

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'siteId required' }), { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get site info and org_id for SEOSkill
    const { data: site } = await supabase
      .from('seo_sites')
      .select('domain, org_id, org:organizations(name)')
      .eq('id', siteId)
      .single()

    if (!site) {
      throw new Error('Site not found')
    }

    // Initialize SEOSkill
    const seoSkill = new SEOSkill(supabase, site.org_id, siteId, {})

    // Update job status if jobId provided
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    console.log(`[seo-backlink-gap-background] Analyzing backlinks for ${site.domain}`)

    // Get competitors
    let competitors = []
    
    if (competitorDomains?.length > 0) {
      competitors = competitorDomains
    } else {
      const { data: compData } = await supabase
        .from('seo_competitor_analysis')
        .select('competitor_domain')
        .eq('site_id', siteId)
        .eq('is_active', true)

      competitors = compData?.map(c => c.competitor_domain) || []
    }

    if (competitors.length === 0) {
      throw new Error('No competitors to analyze. Add competitors first.')
    }

    // Get site knowledge for context
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('industry, business_type, primary_services')
      .eq('site_id', siteId)
      .single()

    // If manual backlinks provided, analyze those
    let backlinksToAnalyze = []

    if (manualBacklinks?.length > 0) {
      backlinksToAnalyze = manualBacklinks
    } else {
      // Use AI to suggest potential backlink sources based on industry
      console.log('[seo-backlink-gap-background] Getting AI backlink suggestions...')
      backlinksToAnalyze = await suggestBacklinkSources(seoSkill, site, competitors, knowledge)
    }

    console.log(`[seo-backlink-gap-background] Analyzing ${backlinksToAnalyze.length} sources...`)

    // Analyze each potential backlink source
    const opportunities = []

    for (const source of backlinksToAnalyze) {
      const analysis = await analyzeBacklinkSource(seoSkill, source, site.domain, competitors, knowledge)
      
      if (analysis.isOpportunity) {
        opportunities.push({
          site_id: siteId,
          source_url: analysis.url,
          source_domain: analysis.domain,
          opportunity_type: 'competitor_backlink',
          anchor_text: analysis.suggestedAnchor,
          domain_authority: analysis.domainAuthority,
          relevance_score: analysis.relevanceScore,
          contact_email: analysis.contactEmail,
          status: 'open',
          outreach_notes: analysis.outreachStrategy,
          ai_analysis: {
            linksToCompetitors: analysis.linksToCompetitors,
            pageType: analysis.pageType,
            reasoning: analysis.reasoning
          }
        })
      }
    }

    console.log(`[seo-backlink-gap-background] Found ${opportunities.length} opportunities`)

    // Save opportunities
    for (const opp of opportunities) {
      await supabase
        .from('seo_backlink_opportunities')
        .upsert(opp, {
          onConflict: 'site_id,source_domain,opportunity_type',
          ignoreDuplicates: true
        })
    }

    const result = {
      success: true,
      analyzed: backlinksToAnalyze.length,
      opportunitiesFound: opportunities.length,
      highPriority: opportunities.filter(o => o.relevance_score >= 70).length,
      topOpportunities: opportunities
        .sort((a, b) => (b.domain_authority || 0) - (a.domain_authority || 0))
        .slice(0, 10)
        .map(o => ({
          domain: o.source_domain,
          authority: o.domain_authority,
          relevance: o.relevance_score,
          outreach: o.outreach_notes
        }))
    }

    console.log('[seo-backlink-gap-background] Complete')

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result
        })
        .eq('id', jobId)
    }

    return new Response(JSON.stringify(result), { status: 200 })

  } catch (error) {
    console.error('[seo-backlink-gap-background] Error:', error)

    try {
      const { jobId } = await req.json().catch(() => ({}))
      if (jobId) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase
          .from('seo_background_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error: error.message
          })
          .eq('id', jobId)
      }
    } catch (e) {
      // Ignore
    }

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

async function suggestBacklinkSources(seoSkill, site, competitors, knowledge) {
  try {
    const systemPrompt = `You are a link building expert. Suggest potential backlink sources based on the industry and competitors.

Think about:
1. Industry directories and listings
2. Resource pages that link to similar companies
3. Guest posting opportunities
4. Industry publications and blogs
5. Local business directories
6. Professional associations
7. Tool/resource aggregators`

    const userPrompt = `Suggest backlink sources for:

Domain: ${site.domain}
Industry: ${knowledge?.industry || 'general business'}
Business Type: ${knowledge?.business_type || 'service business'}
Services: ${JSON.stringify(knowledge?.primary_services || [])}

Competitors: ${competitors.join(', ')}

Respond with JSON array of potential sources:
{
  "sources": [
    {
      "type": "directory|resource_page|blog|publication|association",
      "domain": "example.com",
      "url": "https://example.com/resources",
      "why": "Why this is relevant",
      "approach": "How to get a link"
    }
  ]
}`

    const result = await seoSkill.signal.invoke('seo', 'backlink_sources', {
      systemPrompt,
      userPrompt
    }, {
      additionalContext: {
        tool_prompt: userPrompt,
        response_format: { type: 'json_object' },
        temperature: 0.5
      }
    })

    return result.sources || []
  } catch (error) {
    console.error('[seo-backlink-gap-background] AI suggestion error:', error)
    return []
  }
}

async function analyzeBacklinkSource(seoSkill, source, ourDomain, competitors, knowledge) {
  try {
    const systemPrompt = `You are analyzing a potential backlink source. Assess if it's a good opportunity for outreach.`

    const userPrompt = `Analyze this backlink source:

Source: ${JSON.stringify(source)}
Our Domain: ${ourDomain}
Competitors: ${competitors.join(', ')}
Industry: ${knowledge?.industry || 'unknown'}

Assess:
1. Is this likely to be a good backlink opportunity?
2. Estimated domain authority (0-100)
3. Relevance to our business (0-100)
4. What anchor text should we suggest?
5. Best outreach strategy

Respond with JSON:
{
  "isOpportunity": true,
  "url": "full url",
  "domain": "domain only",
  "domainAuthority": 45,
  "relevanceScore": 75,
  "pageType": "resource_page|directory|blog|etc",
  "linksToCompetitors": ["competitor1.com"],
  "suggestedAnchor": "anchor text",
  "contactEmail": null,
  "outreachStrategy": "How to approach them",
  "reasoning": "Why this is a good opportunity"
}`

    const result = await seoSkill.signal.invoke('seo', 'analyze_backlink', {
      systemPrompt,
      userPrompt
    }, {
      additionalContext: {
        tool_prompt: userPrompt,
        response_format: { type: 'json_object' },
        temperature: 0.3
      }
    })

    return result
  } catch (error) {
    console.error('[seo-backlink-gap-background] AI analysis error:', error)
    return { isOpportunity: false }
  }
}
