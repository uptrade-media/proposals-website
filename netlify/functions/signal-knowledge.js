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


// netlify/functions/signal-knowledge.js
// Signal Module: Knowledge Base CRUD - RAG chunks with embeddings
// Integrates with SEO pages for website content, manual entries for internal training

import { createSupabaseAdmin, getAuthenticatedUser } from './utils/supabase.js'
import OpenAI from 'openai'
import crypto from 'crypto'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Organization-Id, X-Project-Id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
}

// Content types that require manual entry (not crawled from website)
const MANUAL_CONTENT_TYPES = ['internal_note', 'pricing', 'policy', 'custom', 'faq']

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  const { contact, error: authError } = await getAuthenticatedUser(event)
  
  if (authError || !contact) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not authenticated' })
    }
  }

  const supabase = createSupabaseAdmin()
  const projectId = event.queryStringParameters?.projectId || 
                   JSON.parse(event.body || '{}').projectId
  const knowledgeId = event.path.split('/').pop()

  if (!projectId && event.httpMethod !== 'DELETE') {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Project ID is required' })
    }
  }

  try {
    // GET - List knowledge chunks with filtering
    if (event.httpMethod === 'GET') {
      const { contentType, service, city, search, page = 1, limit = 50 } = event.queryStringParameters || {}
      
      let query = supabase
        .from('signal_knowledge')
        .select('id, content, content_type, source_url, source_title, services, cities, tags, token_count, indexed_at, is_active, seo_page_id', { count: 'exact' })
        .eq('project_id', projectId)
        .order('indexed_at', { ascending: false })

      if (contentType) {
        query = query.eq('content_type', contentType)
      }
      if (service) {
        query = query.contains('services', [service])
      }
      if (city) {
        query = query.contains('cities', [city])
      }
      if (search) {
        query = query.ilike('content', `%${search}%`)
      }

      const offset = (parseInt(page) - 1) * parseInt(limit)
      query = query.range(offset, offset + parseInt(limit) - 1)

      const { data: chunks, error, count } = await query

      if (error) throw error

      // Get summary stats
      const { data: stats } = await supabase
        .from('signal_knowledge')
        .select('content_type')
        .eq('project_id', projectId)
        .eq('is_active', true)

      const typeCounts = stats?.reduce((acc, chunk) => {
        acc[chunk.content_type] = (acc[chunk.content_type] || 0) + 1
        return acc
      }, {}) || {}

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          chunks,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / parseInt(limit))
          },
          stats: {
            total: count,
            byType: typeCounts
          }
        })
      }
    }

    // POST - Add manual knowledge entry
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { content, contentType, sourceTitle, services = [], cities = [], tags = [] } = body

      if (!content) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Content is required' })
        }
      }

      if (!MANUAL_CONTENT_TYPES.includes(contentType)) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ 
            error: `Invalid content type. Must be one of: ${MANUAL_CONTENT_TYPES.join(', ')}` 
          })
        }
      }

      // Get project org_id
      const { data: project } = await supabase
        .from('projects')
        .select('org_id')
        .eq('id', projectId)
        .single()

      if (!project) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Project not found' })
        }
      }

      // Generate content hash for deduplication
      const contentHash = crypto.createHash('md5').update(content).digest('hex')

      // Check for duplicate
      const { data: existing } = await supabase
        .from('signal_knowledge')
        .select('id')
        .eq('project_id', projectId)
        .eq('content_hash', contentHash)
        .single()

      if (existing) {
        return {
          statusCode: 409,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Duplicate content already exists', existingId: existing.id })
        }
      }

      // Generate embedding
      let embedding = null
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: content
        })
        embedding = embeddingResponse.data[0].embedding
      } catch (embeddingError) {
        console.error('Embedding generation failed:', embeddingError)
        // Continue without embedding - can be retried later
      }

      // Estimate token count (~4 chars per token)
      const tokenCount = Math.ceil(content.length / 4)

      const { data: newChunk, error } = await supabase
        .from('signal_knowledge')
        .insert({
          project_id: projectId,
          org_id: project.org_id,
          content,
          content_hash: contentHash,
          content_type: contentType,
          source_title: sourceTitle || `Manual ${contentType}`,
          services,
          cities,
          tags,
          token_count: tokenCount,
          embedding,
          indexed_at: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      // Update signal_config chunk count
      await supabase.rpc('increment_knowledge_count', { p_project_id: projectId })

      // Audit log
      await supabase
        .from('signal_widget_audit')
        .insert({
          project_id: projectId,
          org_id: project.org_id,
          action: 'knowledge_added',
          action_data: {
            chunk_id: newChunk.id,
            content_type: contentType,
            added_by: contact.id,
            has_embedding: !!embedding
          }
        })

      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({ chunk: newChunk })
      }
    }

    // PUT - Update knowledge entry
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}')
      const { id, content, sourceTitle, services, cities, tags, isActive } = body

      if (!id) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Knowledge chunk ID is required' })
        }
      }

      // Verify ownership
      const { data: existing } = await supabase
        .from('signal_knowledge')
        .select('id, project_id, content')
        .eq('id', id)
        .single()

      if (!existing || existing.project_id !== projectId) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Knowledge chunk not found' })
        }
      }

      const updates = { updated_at: new Date().toISOString() }
      
      if (sourceTitle !== undefined) updates.source_title = sourceTitle
      if (services !== undefined) updates.services = services
      if (cities !== undefined) updates.cities = cities
      if (tags !== undefined) updates.tags = tags
      if (isActive !== undefined) updates.is_active = isActive

      // If content changed, regenerate embedding
      if (content && content !== existing.content) {
        updates.content = content
        updates.content_hash = crypto.createHash('md5').update(content).digest('hex')
        updates.token_count = Math.ceil(content.length / 4)
        updates.indexed_at = new Date().toISOString()

        try {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: content
          })
          updates.embedding = embeddingResponse.data[0].embedding
        } catch (embeddingError) {
          console.error('Embedding regeneration failed:', embeddingError)
        }
      }

      const { data: updated, error } = await supabase
        .from('signal_knowledge')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ chunk: updated })
      }
    }

    // DELETE - Remove knowledge entry
    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id || knowledgeId

      if (!id || id === 'signal-knowledge') {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Knowledge chunk ID is required' })
        }
      }

      // Get chunk to verify ownership and get project_id
      const { data: existing } = await supabase
        .from('signal_knowledge')
        .select('id, project_id, org_id')
        .eq('id', id)
        .single()

      if (!existing) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Knowledge chunk not found' })
        }
      }

      const { error } = await supabase
        .from('signal_knowledge')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Audit log
      await supabase
        .from('signal_widget_audit')
        .insert({
          project_id: existing.project_id,
          org_id: existing.org_id,
          action: 'knowledge_deleted',
          action_data: {
            chunk_id: id,
            deleted_by: contact.id
          }
        })

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true })
      }
    }

    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Signal knowledge error:', error)
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    }
  }
}
