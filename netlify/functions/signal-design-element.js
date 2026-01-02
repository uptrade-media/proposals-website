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


// netlify/functions/signal-design-element.js
// Background AI-powered element designer - generates on-brand popups, banners, slide-ins

import { createSupabaseAdmin } from './utils/supabase.js'
import OpenAI from 'openai'

/**
 * Design an Engage element using AI with project theme and branding
 */
export async function handler(event) {
  try {
    const {
      projectId,
      orgId,
      userId,
      elementType,
      purpose,
      offer,
      trigger = 'time',
      triggerValue = 10,
      targetAudience = 'all visitors'
    } = JSON.parse(event.body || '{}')

    if (!projectId || !elementType || !purpose) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: projectId, elementType, purpose' })
      }
    }

    const supabase = createSupabaseAdmin()
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Get project and theme information
    const { data: project } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        domain,
        org_id,
        signal_config (
          design_system,
          brand_voice
        )
      `)
      .eq('id', projectId)
      .eq('org_id', orgId)
      .single()

    if (!project) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Project not found' })
      }
    }

    // Extract design system from signal_config
    const designSystem = project.signal_config?.[0]?.design_system || {
      primaryColor: '#4bbf39',
      secondaryColor: '#238b95',
      fontFamily: 'Inter, sans-serif',
      brandVoice: 'Professional, friendly, action-oriented'
    }

    const brandVoice = project.signal_config?.[0]?.brand_voice || designSystem.brandVoice || 'Professional and friendly'

    // Generate copy and design via GPT-4
    const designPrompt = `You are designing an on-brand ${elementType} for ${project.title} (${project.domain}).

**Brand Identity:**
- Primary Color: ${designSystem.primaryColor}
- Brand Voice: ${brandVoice}
- Font: ${designSystem.fontFamily}

**Element Requirements:**
- Type: ${elementType}
- Purpose: ${purpose}
${offer ? `- Offer: ${offer}` : ''}
- Target Audience: ${targetAudience}
- Trigger: ${trigger} ${trigger === 'time' ? `after ${triggerValue}s` : trigger === 'scroll' ? `at ${triggerValue}%` : 'on exit intent'}

**Your Task:**
Generate compelling, on-brand content for this element. Respond in JSON format only:

{
  "name": "Short descriptive name for the element",
  "headline": "Attention-grabbing headline (max 60 chars)",
  "body": "Supporting text (max 120 chars)",
  "cta_text": "Action button text (max 25 chars)",
  "cta_url": "Default URL or action",
  "design_notes": "Brief explanation of design choices",
  "variants": [
    {
      "name": "Variant A",
      "headline": "Alternative headline",
      "body": "Alternative body text",
      "cta_text": "Alternative CTA"
    }
  ]
}

Keep copy concise, benefit-focused, and aligned with the brand voice. Include 2-3 A/B test variants.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert conversion copywriter and designer.' },
        { role: 'user', content: designPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const design = JSON.parse(completion.choices[0].message.content)

    // Create element in database as draft
    const { data: element, error: elementError } = await supabase
      .from('engage_elements')
      .insert({
        org_id: orgId,
        project_id: projectId,
        name: design.name,
        element_type: elementType,
        trigger_type: trigger,
        trigger_value: triggerValue,
        content: {
          headline: design.headline,
          body: design.body,
          cta_text: design.cta_text,
          cta_url: design.cta_url || '#',
          cta_action: 'link',
          primary_color: designSystem.primaryColor,
          text_color: '#ffffff',
          font_family: designSystem.fontFamily
        },
        targeting: {
          audience: targetAudience,
          devices: ['desktop', 'mobile', 'tablet'],
          pages: ['*']
        },
        is_active: false, // Draft mode
        is_ab_test: design.variants?.length > 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (elementError) throw elementError

    // Create A/B test variants if provided
    if (design.variants?.length > 0 && element) {
      // Control variant (original)
      await supabase
        .from('engage_element_variants')
        .insert({
          element_id: element.id,
          name: 'Control',
          content: element.content,
          is_control: true,
          traffic_allocation: 50,
          created_at: new Date().toISOString()
        })

      // Test variants
      const variantAllocation = Math.floor(50 / design.variants.length)
      for (const variant of design.variants) {
        await supabase
          .from('engage_element_variants')
          .insert({
            element_id: element.id,
            name: variant.name,
            content: {
              ...element.content,
              headline: variant.headline,
              body: variant.body,
              cta_text: variant.cta_text
            },
            is_control: false,
            traffic_allocation: variantAllocation,
            created_at: new Date().toISOString()
          })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        elementId: element.id,
        name: design.name,
        preview: {
          headline: design.headline,
          body: design.body,
          cta: design.cta_text
        },
        variants: design.variants?.length || 0,
        designNotes: design.design_notes,
        status: 'draft'
      })
    }

  } catch (error) {
    console.error('Element design error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to design element',
        details: error.message
      })
    }
  }
}
