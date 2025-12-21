/**
 * SEO Content Brief Background Function
 * 
 * Thin orchestrator using SEOSkill for content brief generation.
 * Background functions can run up to 15 minutes.
 * 
 * @see skills/seo-skill.js - generateContentBriefFull()
 */

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { SEOSkill } from './skills/seo-skill.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req) {
  console.log('[seo-content-brief-background] Starting...')

  let jobId = null
  let supabase = null

  try {
    const { 
      siteId, 
      targetKeyword,
      contentType = 'blog',
      additionalContext = '',
      jobId: jId 
    } = await req.json()
    jobId = jId

    if (!siteId || !targetKeyword) {
      return new Response(JSON.stringify({ error: 'siteId and targetKeyword required' }), { status: 400 })
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update job status
    if (jobId) {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Fetch site for org context
    const { data: site } = await supabase
      .from('seo_sites')
      .select('*, org:organizations(id, domain, name)')
      .eq('id', siteId)
      .single()

    if (!site) {
      throw new Error('Site not found')
    }

    const domain = site.org?.domain || site.domain

    // Fetch GSC data for related keywords and existing ranking
    let relatedKeywords = []
    let existingRankingData = null

    try {
      console.log('[seo-content-brief-background] Fetching GSC data...')
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
      })
      const searchConsole = google.searchconsole({ version: 'v1', auth })
      const siteUrl = `sc-domain:${domain.replace(/^(https?:\/\/)?(www\.)?/, '')}`

      const today = new Date()
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 3)
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 28)

      // Find related keywords
      const response = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 50,
          dimensionFilterGroups: [{
            filters: [{
              dimension: 'query',
              operator: 'contains',
              expression: targetKeyword.split(' ')[0]
            }]
          }]
        }
      })
      relatedKeywords = (response.data.rows || []).map(r => ({
        keyword: r.keys[0],
        position: r.position,
        impressions: r.impressions
      }))
      console.log(`[seo-content-brief-background] Found ${relatedKeywords.length} related keywords`)

      // Check if we already rank for the target keyword
      const targetResponse = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query', 'page'],
          dimensionFilterGroups: [{
            filters: [{
              dimension: 'query',
              operator: 'equals',
              expression: targetKeyword
            }]
          }]
        }
      })

      if (targetResponse.data.rows?.length > 0) {
        const row = targetResponse.data.rows[0]
        existingRankingData = {
          url: row.keys[1],
          position: row.position,
          clicks: row.clicks,
          impressions: row.impressions
        }
        console.log(`[seo-content-brief-background] Already ranking at position ${existingRankingData.position}`)
      }
    } catch (e) {
      console.error('[seo-content-brief-background] GSC error:', e.message)
    }

    // Use SEOSkill for brief generation
    const seoSkill = new SEOSkill(supabase, site.org?.id || site.org_id, siteId)

    const result = await seoSkill.generateContentBriefFull(targetKeyword, {
      contentType,
      additionalContext,
      relatedKeywords,
      existingRankingData,
      onProgress: (progress) => {
        console.log(`[seo-content-brief-background] ${progress.step}: ${progress.message}`)
      }
    })

    console.log('[seo-content-brief-background] Complete')

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
    console.error('[seo-content-brief-background] Error:', error)

    // Update job with error
    if (jobId && supabase) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: error.message
        })
        .eq('id', jobId)
    }

    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
