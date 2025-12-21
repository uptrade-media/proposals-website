/**
 * SEO Competitor Analyze Background Function
 * 
 * Thin orchestrator using SEOSkill for competitor analysis.
 * Background functions can run up to 15 minutes.
 * 
 * @see skills/seo-skill.js - analyzeCompetitorFull()
 */

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { SEOSkill } from './skills/seo-skill.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req) {
  console.log('[seo-competitor-analyze-background] Starting...')

  let jobId = null
  let supabase = null

  try {
    const { siteId, competitorDomain, jobId: jId } = await req.json()
    jobId = jId

    if (!siteId || !competitorDomain) {
      return new Response(JSON.stringify({ error: 'siteId and competitorDomain required' }), { status: 400 })
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
      .select('*, org:organizations(id, domain)')
      .eq('id', siteId)
      .single()

    if (!site) {
      throw new Error('Site not found')
    }

    // Fetch our keywords from GSC
    let ourKeywords = []
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
      })
      const searchConsole = google.searchconsole({ version: 'v1', auth })
      const domain = site.org?.domain || site.domain
      const siteUrl = `sc-domain:${domain.replace(/^(https?:\/\/)?(www\.)?/, '')}`

      const today = new Date()
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() - 3)
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 28)

      console.log('[seo-competitor-analyze-background] Fetching GSC keywords...')
      const response = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 100
        }
      })
      ourKeywords = (response.data.rows || []).map(r => ({
        keyword: r.keys[0],
        position: r.position,
        clicks: r.clicks,
        impressions: r.impressions
      }))
      console.log(`[seo-competitor-analyze-background] Got ${ourKeywords.length} keywords`)
    } catch (e) {
      console.error('[seo-competitor-analyze-background] GSC error:', e.message)
    }

    // Use SEOSkill for AI analysis
    const seoSkill = new SEOSkill(supabase, site.org?.id || site.org_id, siteId)
    
    const result = await seoSkill.analyzeCompetitorFull(competitorDomain, {
      ourKeywords,
      onProgress: (progress) => {
        console.log(`[seo-competitor-analyze-background] ${progress.step}: ${progress.message}`)
      }
    })

    console.log('[seo-competitor-analyze-background] Complete')

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
    console.error('[seo-competitor-analyze-background] Error:', error)

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
