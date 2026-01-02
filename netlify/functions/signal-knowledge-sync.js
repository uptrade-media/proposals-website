// ============================================================================
// DEPRECATED: This function is now redundant - use Signal API directly
// ============================================================================
// Portal now calls Signal API (NestJS) instead of internal Signal implementation.
// This function remains for backward compatibility but should not be used in new code.
//
// Migration:
//   Old: /.netlify/functions/signal-xxx
//   New: Signal API endpoints (see SIGNAL-API-MIGRATION.md)
//
// Signal API Base URL: $SIGNAL_API_URL (http://localhost:3001 or https://signal-api.uptrademedia.com)
// ============================================================================


// netlify/functions/signal-knowledge-sync.js
// Signal Module: Sync page content to knowledge base with RAG embeddings
// Chunks content and generates embeddings for semantic search
// Now includes AI classification for better context retrieval

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'
import crypto from 'crypto'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

// Chunk size for content splitting (in characters, ~500 tokens)
const CHUNK_SIZE = 2000
const CHUNK_OVERLAP = 200

// Valid content types for classification
const CONTENT_TYPES = [
  'service_detail',
  'pricing',
  'testimonial',
  'process',
  'faq',
  'location',
  'about',
  'contact',
  'product',
  'team',
  'general'
]

function chunkContent(text, url, title) {
  if (!text || text.length < CHUNK_SIZE) {
    return [{ content: text, url, title, startIndex: 0 }]
  }

  const chunks = []
  let startIndex = 0

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + CHUNK_SIZE, text.length)
    
    // Try to break at sentence boundary
    if (endIndex < text.length) {
      const lastPeriod = text.lastIndexOf('.', endIndex)
      if (lastPeriod > startIndex + CHUNK_SIZE / 2) {
        endIndex = lastPeriod + 1
      }
    }

    chunks.push({
      content: text.slice(startIndex, endIndex).trim(),
      url,
      title,
      startIndex
    })

    startIndex = endIndex - CHUNK_OVERLAP
    if (startIndex < 0) startIndex = 0
    if (endIndex >= text.length) break
  }

  return chunks
}

/**
 * Classify a batch of content chunks using AI
 */
async function classifyChunks(openai, chunks) {
  if (chunks.length === 0) return []
  
  // Create a batch classification prompt
  const classificationPrompt = chunks.map((chunk, i) => 
    `[${i}] URL: ${chunk.url}\nTitle: ${chunk.title}\nContent (first 300 chars): ${chunk.content.slice(0, 300)}...`
  ).join('\n\n---\n\n')

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Classify each content chunk into one of these types:
- service_detail: Describes specific services offered
- pricing: Contains pricing, costs, rates, or payment info
- testimonial: Customer reviews, quotes, or case studies
- process: How things work, steps, methodology
- faq: Question and answer format
- location: Address, service areas, directions
- about: Company history, mission, values
- contact: Contact info, forms, how to reach
- product: Product descriptions, features
- team: Team members, bios, staff info
- general: Generic content that doesn't fit other categories

Also determine visibility:
- public: Safe for website chat widget (visitor-facing)
- internal: Should only be visible in portal (staff notes, pricing strategies, internal processes)
- private: Admin-only (contracts, legal, confidential info)

Most website content should be "public" unless it contains:
- Internal pricing margins or cost breakdowns → internal
- Staff-only procedures → internal
- Legal documents or contracts → private
- Competitive intelligence → private

For each chunk, provide:
- content_type: one of the types above
- is_high_value: boolean (would this help answer customer questions?)
- visibility: public, internal, or private
- reason: very brief explanation (10 words max)

Return JSON array with objects containing: index, content_type, is_high_value, visibility, reason`
        },
        {
          role: 'user',
          content: `Classify these ${chunks.length} content chunks:\n\n${classificationPrompt}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const result = JSON.parse(completion.choices[0].message.content)
    return result.classifications || result.chunks || []
  } catch (error) {
    console.error('[Knowledge Sync] Classification error:', error)
    // Return default classifications on error
    return chunks.map((_, i) => ({
      index: i,
      content_type: 'general',
      is_high_value: true,
      visibility: 'public',
      reason: 'Classification failed, defaulting to general'
    }))
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: CORS_HEADERS, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    const { projectId, siteId, forceRefresh = false } = JSON.parse(event.body || '{}')

    if (!projectId && !siteId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'projectId or siteId is required' })
      }
    }

    // Get SEO site and project
    let site, project
    if (siteId) {
      const { data } = await supabase
        .from('seo_sites')
        .select('id, domain, project_id, org_id')
        .eq('id', siteId)
        .single()
      site = data
      if (site?.project_id) {
        const { data: proj } = await supabase
          .from('projects')
          .select('id, org_id')
          .eq('id', site.project_id)
          .single()
        project = proj
      }
    } else {
      const { data: proj } = await supabase
        .from('projects')
        .select('id, org_id')
        .eq('id', projectId)
        .single()
      project = proj
      
      const { data } = await supabase
        .from('seo_sites')
        .select('id, domain, project_id, org_id')
        .eq('project_id', projectId)
        .single()
      site = data
    }

    if (!site) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'SEO site not found' })
      }
    }

    const orgId = project?.org_id || site?.org_id

    // Get pages with content
    const { data: pages } = await supabase
      .from('seo_pages')
      .select('id, url, title, content_text')
      .eq('site_id', site.id)
      .not('content_text', 'is', null)
      .order('clicks', { ascending: false })
      .limit(100)

    if (!pages || pages.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          message: 'No page content available for syncing',
          synced: 0 
        })
      }
    }

    // Get existing knowledge chunks for this project (to check for duplicates)
    const { data: existingChunks } = await supabase
      .from('signal_knowledge')
      .select('content_hash, seo_page_id')
      .eq('project_id', site.project_id || projectId)

    const existingHashes = new Set(existingChunks?.map(c => c.content_hash) || [])
    const existingPageIds = new Set(existingChunks?.map(c => c.seo_page_id).filter(Boolean) || [])

    // Prepare chunks
    const allChunks = []
    for (const page of pages) {
      if (!forceRefresh && existingPageIds.has(page.id)) {
        continue // Skip pages already synced
      }

      const pageChunks = chunkContent(page.content_text, page.url, page.title)
      for (const chunk of pageChunks) {
        const contentHash = crypto.createHash('md5').update(chunk.content).digest('hex')
        
        if (!existingHashes.has(contentHash)) {
          allChunks.push({
            ...chunk,
            pageId: page.id,
            contentHash
          })
        }
      }
    }

    if (allChunks.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          message: 'All content already synced',
          synced: 0,
          skipped: pages.length
        })
      }
    }

    // Generate embeddings and classify in batches
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const BATCH_SIZE = 20
    let synced = 0
    let errors = 0
    let classified = 0
    const typeStats = {}

    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE)
      
      try {
        // Generate embeddings for batch
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: batch.map(c => c.content)
        })

        // Classify the batch
        const classifications = await classifyChunks(openai, batch)
        
        // Create a map for quick lookup
        const classificationMap = {}
        for (const c of classifications) {
          classificationMap[c.index] = c
        }

        // Prepare inserts with classification
        const inserts = batch.map((chunk, idx) => {
          const classification = classificationMap[idx] || {
            content_type: 'general',
            is_high_value: true,
            visibility: 'public',
            reason: 'No classification available'
          }
          
          // Track type stats
          const contentType = CONTENT_TYPES.includes(classification.content_type) 
            ? classification.content_type 
            : 'general'
          typeStats[contentType] = (typeStats[contentType] || 0) + 1
          
          if (classification.content_type !== 'general') {
            classified++
          }
          
          // Validate visibility
          const validVisibility = ['public', 'internal', 'private']
          const visibility = validVisibility.includes(classification.visibility) 
            ? classification.visibility 
            : 'public'
          
          return {
            project_id: site.project_id || projectId,
            org_id: orgId,
            seo_page_id: chunk.pageId,
            content: chunk.content,
            content_hash: chunk.contentHash,
            content_type: contentType,
            source_url: chunk.url,
            source_title: chunk.title,
            token_count: Math.ceil(chunk.content.length / 4),
            embedding: embeddingResponse.data[idx].embedding,
            indexed_at: new Date().toISOString(),
            is_active: true,
            auto_classified: true,
            is_high_value: classification.is_high_value !== false,
            classification_reason: classification.reason || null,
            visibility
          }
        })

        const { error: insertError } = await supabase
          .from('signal_knowledge')
          .insert(inserts)

        if (insertError) {
          console.error('[Knowledge Sync] Insert error:', insertError)
          errors += batch.length
        } else {
          synced += batch.length
        }

      } catch (batchError) {
        console.error('[Knowledge Sync] Batch error:', batchError)
        errors += batch.length
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        synced,
        classified,
        errors,
        pagesProcessed: pages.length,
        chunksCreated: synced,
        typeBreakdown: typeStats
      })
    }

  } catch (error) {
    console.error('[Knowledge Sync] Error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}
