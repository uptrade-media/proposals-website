// netlify/functions/seo-title-ab-test.js
// AI-Powered Title A/B Testing - Generate variants, track CTR, auto-select winners
import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) }
  }

  const supabase = createSupabaseAdmin()

  switch (event.httpMethod) {
    case 'GET':
      return await getTests(event, supabase, headers)
    case 'POST':
      return await createTest(event, supabase, headers)
    case 'PUT':
      return await updateTest(event, supabase, headers)
    case 'DELETE':
      return await deleteTest(event, supabase, headers)
    default:
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
}

async function getTests(event, supabase, headers) {
  const { siteId, testId, status, pageId } = event.queryStringParameters || {}

  if (!siteId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId required' }) }
  }

  // Get single test
  if (testId) {
    const { data: test, error } = await supabase
      .from('seo_title_tests')
      .select('*, page:seo_pages(id, url, title, managed_title)')
      .eq('id', testId)
      .single()

    if (error) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Test not found' }) }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ test })
    }
  }

  // List tests
  let query = supabase
    .from('seo_title_tests')
    .select('*, page:seo_pages(id, url, title)')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)
  if (pageId) query = query.eq('page_id', pageId)

  const { data: tests, error } = await query

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  const summary = {
    total: tests?.length || 0,
    running: tests?.filter(t => t.status === 'running').length || 0,
    completed: tests?.filter(t => t.status === 'completed').length || 0,
    avgImprovement: calculateAvgImprovement(tests?.filter(t => t.status === 'completed'))
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ tests, summary })
  }
}

async function createTest(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { siteId, pageId, variants, generateVariants = false, targetKeyword } = body

  if (!siteId || !pageId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'siteId and pageId required' }) }
  }

  // Get page data
  const { data: page, error: pageError } = await supabase
    .from('seo_pages')
    .select('id, url, title, managed_title, meta_description, clicks_28d, impressions_28d, avg_position_28d, top_queries')
    .eq('id', pageId)
    .single()

  if (pageError || !page) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Page not found' }) }
  }

  // Check if already has active test
  if (page.active_title_test_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Page already has an active test' }) }
  }

  const currentTitle = page.managed_title || page.title
  let testVariants = variants || []

  // Generate AI variants if requested
  if (generateVariants || testVariants.length === 0) {
    const keyword = targetKeyword || page.top_queries?.[0]?.query || ''
    testVariants = await generateTitleVariants(currentTitle, page, keyword)
  }

  // Add original as control (variant 0)
  const allVariants = [
    {
      variant_id: 0,
      title: currentTitle,
      hypothesis: 'Control - original title',
      is_control: true
    },
    ...testVariants.map((v, i) => ({
      variant_id: i + 1,
      title: v.title,
      hypothesis: v.hypothesis || `Variant ${i + 1}`,
      is_control: false
    }))
  ]

  // Calculate baseline metrics (last 28 days)
  const baselineImpressions = page.impressions_28d || 0
  const baselineClicks = page.clicks_28d || 0
  const baselineCtr = baselineImpressions > 0 ? baselineClicks / baselineImpressions : 0
  const baselinePosition = page.avg_position_28d

  // Create test
  const { data: test, error } = await supabase
    .from('seo_title_tests')
    .insert({
      site_id: siteId,
      page_id: pageId,
      url: page.url,
      original_title: currentTitle,
      variants: allVariants,
      current_variant_index: 0,
      status: 'draft',
      baseline_impressions: baselineImpressions,
      baseline_clicks: baselineClicks,
      baseline_ctr: baselineCtr,
      baseline_position: baselinePosition,
      ai_generated: generateVariants,
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

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      success: true,
      test,
      message: 'Test created. Start the test to begin A/B testing.'
    })
  }
}

async function updateTest(event, supabase, headers) {
  const body = JSON.parse(event.body || '{}')
  const { testId, action, winnerIndex } = body

  if (!testId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'testId required' }) }
  }

  // Get current test
  const { data: test, error: testError } = await supabase
    .from('seo_title_tests')
    .select('*')
    .eq('id', testId)
    .single()

  if (testError || !test) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Test not found' }) }
  }

  let updates = { updated_at: new Date().toISOString() }

  switch (action) {
    case 'start':
      // Start the test - apply first variant (control)
      updates.status = 'running'
      updates.started_at = new Date().toISOString()
      updates.current_variant_index = 0
      break

    case 'next_variant':
      // Move to next variant
      const nextIndex = (test.current_variant_index + 1) % test.variants.length
      updates.current_variant_index = nextIndex
      
      // Apply the new variant title
      const nextVariant = test.variants[nextIndex]
      await supabase
        .from('seo_pages')
        .update({ managed_title: nextVariant.title })
        .eq('id', test.page_id)
      break

    case 'pause':
      updates.status = 'paused'
      break

    case 'resume':
      updates.status = 'running'
      break

    case 'complete':
      // Complete test with winner
      updates.status = 'completed'
      updates.completed_at = new Date().toISOString()
      
      if (winnerIndex !== undefined) {
        updates.winning_variant_index = winnerIndex
        updates.winning_title = test.variants[winnerIndex]?.title
        
        // Calculate improvement
        const controlResults = test.variant_results?.find(v => v.variant_index === 0)
        const winnerResults = test.variant_results?.find(v => v.variant_index === winnerIndex)
        
        if (controlResults && winnerResults) {
          updates.best_ctr = winnerResults.ctr
          updates.ctr_improvement = winnerResults.ctr - controlResults.ctr
        }
        
        // Apply winning title permanently
        await supabase
          .from('seo_pages')
          .update({ 
            managed_title: test.variants[winnerIndex]?.title,
            active_title_test_id: null
          })
          .eq('id', test.page_id)
      }
      break

    case 'cancel':
      updates.status = 'cancelled'
      
      // Restore original title
      await supabase
        .from('seo_pages')
        .update({ 
          managed_title: test.original_title,
          active_title_test_id: null
        })
        .eq('id', test.page_id)
      break

    case 'update_results':
      // Update variant results from GSC data
      const { variantResults } = body
      if (variantResults) {
        updates.variant_results = variantResults
        
        // Check for statistical significance
        const significance = calculateSignificance(variantResults)
        updates.statistical_significance = significance.value
        
        // Auto-complete if we have a clear winner
        if (significance.hasWinner && significance.value >= test.confidence_threshold) {
          updates.status = 'completed'
          updates.completed_at = new Date().toISOString()
          updates.winning_variant_index = significance.winnerIndex
          updates.winning_title = test.variants[significance.winnerIndex]?.title
          updates.best_ctr = variantResults[significance.winnerIndex]?.ctr
          updates.ctr_improvement = variantResults[significance.winnerIndex]?.ctr - variantResults[0]?.ctr
        }
      }
      break

    default:
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) }
  }

  // Update test
  const { data: updated, error } = await supabase
    .from('seo_title_tests')
    .update(updates)
    .eq('id', testId)
    .select()
    .single()

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  // Update page with active test reference if starting
  if (action === 'start') {
    await supabase
      .from('seo_pages')
      .update({ active_title_test_id: testId })
      .eq('id', test.page_id)
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, test: updated })
  }
}

async function deleteTest(event, supabase, headers) {
  const { testId } = event.queryStringParameters || {}

  if (!testId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'testId required' }) }
  }

  // Get test first to restore original title if needed
  const { data: test } = await supabase
    .from('seo_title_tests')
    .select('page_id, original_title, status')
    .eq('id', testId)
    .single()

  if (test && test.status === 'running') {
    // Restore original title
    await supabase
      .from('seo_pages')
      .update({ 
        managed_title: test.original_title,
        active_title_test_id: null
      })
      .eq('id', test.page_id)
  }

  const { error } = await supabase
    .from('seo_title_tests')
    .delete()
    .eq('id', testId)

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  }
}

async function generateTitleVariants(currentTitle, page, targetKeyword) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an SEO expert creating title tag variants for A/B testing. 
          
Create 3-4 variants that:
1. Stay under 60 characters
2. Include the target keyword
3. Test different psychological triggers (urgency, curiosity, benefit-focused, etc.)
4. Maintain brand consistency

Each variant should have a clear hypothesis about why it might perform better.`
        },
        {
          role: 'user',
          content: `Create title variants for A/B testing:

Current Title: "${currentTitle}"
Target Keyword: "${targetKeyword}"
URL: ${page.url}
Current CTR: ${page.impressions_28d > 0 ? ((page.clicks_28d / page.impressions_28d) * 100).toFixed(2) : 'unknown'}%
Average Position: ${page.avg_position_28d || 'unknown'}

Respond with JSON:
{
  "variants": [
    {
      "title": "New Title Here",
      "hypothesis": "Why this might perform better",
      "trigger": "urgency|curiosity|benefit|social_proof|specificity"
    }
  ]
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.variants || []
  } catch (error) {
    console.error('[Title A/B] Generation error:', error)
    return []
  }
}

function calculateSignificance(variantResults) {
  if (!variantResults || variantResults.length < 2) {
    return { value: 0, hasWinner: false }
  }

  const control = variantResults.find(v => v.variant_index === 0)
  if (!control || control.impressions < 100) {
    return { value: 0, hasWinner: false }
  }

  let bestVariant = control
  let highestSignificance = 0

  for (const variant of variantResults) {
    if (variant.variant_index === 0) continue
    if (variant.impressions < 100) continue

    // Simplified significance calculation
    // In production, use proper chi-squared or z-test
    const controlCtr = control.ctr || 0
    const variantCtr = variant.ctr || 0
    const diff = Math.abs(variantCtr - controlCtr)
    
    // Rough significance based on sample size and effect size
    const pooledN = control.impressions + variant.impressions
    const significance = Math.min(0.99, diff * Math.sqrt(pooledN) / 10)

    if (variantCtr > controlCtr && significance > highestSignificance) {
      bestVariant = variant
      highestSignificance = significance
    }
  }

  return {
    value: highestSignificance,
    hasWinner: highestSignificance >= 0.95 && bestVariant.variant_index !== 0,
    winnerIndex: bestVariant.variant_index
  }
}

function calculateAvgImprovement(completedTests) {
  if (!completedTests || completedTests.length === 0) return 0
  
  const improvements = completedTests
    .filter(t => t.ctr_improvement != null)
    .map(t => t.ctr_improvement)
  
  if (improvements.length === 0) return 0
  
  return (improvements.reduce((sum, i) => sum + i, 0) / improvements.length) * 100
}
