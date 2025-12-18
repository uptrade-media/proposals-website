// netlify/functions/seo-title-ab-test-background.mjs
// Background function for Title A/B Test variant generation (up to 15 min timeout)
// Generates AI-powered title variants for multiple pages at once
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const SEO_AI_MODEL = process.env.SEO_AI_MODEL || 'gpt-4o'

function createSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const supabase = createSupabaseAdmin()

  try {
    const body = JSON.parse(event.body || '{}')
    const { siteId, orgId, userId, pageIds = [], generateForTop = 20, jobId: existingJobId } = body

    if (!siteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
    }

    // Create job record to track progress
    let jobId = existingJobId
    if (!jobId) {
      const { data: job, error: jobError } = await supabase
        .from('seo_background_jobs')
        .insert({
          site_id: siteId,
          org_id: orgId,
          job_type: 'title_variant_generation',
          status: 'running',
          progress: 0,
          started_by: userId,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (jobError) {
        console.error('[Title AB Background] Failed to create job:', jobError)
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create job' }) }
      }
      jobId = job.id
    } else {
      await supabase
        .from('seo_background_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId)
    }

    // Return 202 Accepted immediately
    const response = {
      statusCode: 202,
      headers,
      body: JSON.stringify({
        success: true,
        jobId,
        message: 'Title variant generation started in background',
        pollUrl: `/.netlify/functions/seo-background-jobs?jobId=${jobId}`
      })
    }

    // Start background processing
    processVariantGeneration(supabase, siteId, jobId, pageIds, generateForTop).catch(err => {
      console.error('[Title AB Background] Processing error:', err)
      supabase
        .from('seo_background_jobs')
        .update({
          status: 'failed',
          error_message: err.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    })

    return response

  } catch (error) {
    console.error('[Title AB Background] Error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}

async function processVariantGeneration(supabase, siteId, jobId, pageIds, generateForTop) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    await updateJobProgress(supabase, jobId, 5, 'Fetching pages...')

    // Get pages to generate variants for
    let pages = []
    if (pageIds.length > 0) {
      const { data } = await supabase
        .from('seo_pages')
        .select('id, url, title, managed_title, meta_description, clicks_28d, impressions_28d, avg_position_28d, top_queries')
        .in('id', pageIds)
      pages = data || []
    } else {
      // Get top pages by impressions that don't have active tests
      const { data } = await supabase
        .from('seo_pages')
        .select('id, url, title, managed_title, meta_description, clicks_28d, impressions_28d, avg_position_28d, top_queries')
        .eq('site_id', siteId)
        .is('active_title_test_id', null)
        .gt('impressions_28d', 100)
        .order('impressions_28d', { ascending: false })
        .limit(generateForTop)
      pages = data || []
    }

    if (pages.length === 0) {
      await supabase
        .from('seo_background_jobs')
        .update({
          status: 'completed',
          progress: 100,
          result: {
            success: true,
            message: 'No eligible pages found for title testing',
            testsCreated: 0
          },
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
      return
    }

    await updateJobProgress(supabase, jobId, 10, `Generating variants for ${pages.length} pages...`)

    // Get site knowledge for context
    const { data: knowledge } = await supabase
      .from('seo_knowledge_base')
      .select('*')
      .eq('site_id', siteId)
      .single()

    const testsCreated = []
    const errors = []
    const totalPages = pages.length

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const progress = Math.round(10 + (i / totalPages) * 80)
      await updateJobProgress(supabase, jobId, progress, `Generating variants for page ${i + 1}/${totalPages}...`)

      try {
        const currentTitle = page.managed_title || page.title
        const targetKeyword = page.top_queries?.[0]?.query || ''
        const currentCtr = page.impressions_28d > 0 
          ? ((page.clicks_28d / page.impressions_28d) * 100).toFixed(2) 
          : 'unknown'

        // Generate variants using AI
        const variants = await generateTitleVariants(openai, {
          currentTitle,
          targetKeyword,
          url: page.url,
          currentCtr,
          avgPosition: page.avg_position_28d,
          knowledge
        })

        if (variants.length === 0) {
          errors.push({ pageId: page.id, url: page.url, error: 'No variants generated' })
          continue
        }

        // Create test record
        const allVariants = [
          {
            variant_id: 0,
            title: currentTitle,
            hypothesis: 'Control - original title',
            is_control: true
          },
          ...variants.map((v, idx) => ({
            variant_id: idx + 1,
            title: v.title,
            hypothesis: v.hypothesis || `Variant ${idx + 1}`,
            trigger: v.trigger,
            is_control: false
          }))
        ]

        const baselineImpressions = page.impressions_28d || 0
        const baselineClicks = page.clicks_28d || 0
        const baselineCtr = baselineImpressions > 0 ? baselineClicks / baselineImpressions : 0

        const { data: test, error: testError } = await supabase
          .from('seo_title_tests')
          .insert({
            site_id: siteId,
            page_id: page.id,
            url: page.url,
            original_title: currentTitle,
            variants: allVariants,
            current_variant_index: 0,
            status: 'draft',
            baseline_impressions: baselineImpressions,
            baseline_clicks: baselineClicks,
            baseline_ctr: baselineCtr,
            baseline_position: page.avg_position_28d,
            ai_generated: true,
            variant_results: allVariants.map(v => ({
              variant_index: v.variant_id,
              impressions: 0,
              clicks: 0,
              ctr: 0,
              position: null,
              confidence: 0
            }))
          })
          .select()
          .single()

        if (testError) {
          errors.push({ pageId: page.id, url: page.url, error: testError.message })
        } else {
          testsCreated.push({
            testId: test.id,
            pageId: page.id,
            url: page.url,
            variantsGenerated: variants.length
          })
        }

        // Small delay between pages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (pageError) {
        console.error(`[Title AB Background] Error for page ${page.id}:`, pageError)
        errors.push({ pageId: page.id, url: page.url, error: pageError.message })
      }
    }

    await updateJobProgress(supabase, jobId, 95, 'Finalizing...')

    // Complete the job
    await supabase
      .from('seo_background_jobs')
      .update({
        status: 'completed',
        progress: 100,
        result: {
          success: true,
          testsCreated: testsCreated.length,
          tests: testsCreated,
          errors: errors.length > 0 ? errors : undefined,
          message: `Created ${testsCreated.length} title tests with AI-generated variants`
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[Title AB Background] Completed job ${jobId} - ${testsCreated.length} tests created`)

  } catch (error) {
    console.error('[Title AB Background] Processing error:', error)
    await supabase
      .from('seo_background_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)
    throw error
  }
}

async function generateTitleVariants(openai, context) {
  const { currentTitle, targetKeyword, url, currentCtr, avgPosition, knowledge } = context

  try {
    const response = await openai.chat.completions.create({
      model: SEO_AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an SEO expert creating title tag variants for A/B testing.

Create 3-4 variants that:
1. Stay under 60 characters
2. Include the target keyword (ideally near the beginning)
3. Test different psychological triggers (urgency, curiosity, benefit-focused, numbers, etc.)
4. Maintain brand consistency
5. Are compelling and click-worthy

Each variant should have a clear hypothesis about why it might perform better.`
        },
        {
          role: 'user',
          content: `Create title variants for A/B testing:

Current Title: "${currentTitle}"
Target Keyword: "${targetKeyword}"
URL: ${url}
Current CTR: ${currentCtr}%
Average Position: ${avgPosition || 'unknown'}
Business: ${knowledge?.business_name || 'Unknown'}
Industry: ${knowledge?.industry || 'Unknown'}

Respond with JSON:
{
  "variants": [
    {
      "title": "New Title Here (under 60 chars)",
      "hypothesis": "Why this might perform better - specific reasoning",
      "trigger": "urgency|curiosity|benefit|social_proof|specificity|numbers|question|how_to"
    }
  ],
  "analysis": {
    "currentTitleStrengths": ["strength 1"],
    "currentTitleWeaknesses": ["weakness 1"],
    "keyOptimizationOpportunity": "Main opportunity identified"
  }
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.variants || []
  } catch (error) {
    console.error('[Title AB Background] Variant generation error:', error)
    return []
  }
}

async function updateJobProgress(supabase, jobId, progress, message) {
  await supabase
    .from('seo_background_jobs')
    .update({
      progress,
      progress_message: message,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
}
