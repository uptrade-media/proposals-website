/**
 * Blog Admin Utilities
 * 
 * AI-powered blog post creation using OpenAI GPT-4 Turbo
 */

import OpenAI from 'openai'

// Initialize OpenAI client (will use environment variable)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
})

/**
 * System prompt for Uptrade Media blog writing style
 */
const UPTRADE_WRITING_STYLE = `You are a professional content writer for Uptrade Media, a digital marketing agency specializing in web design, SEO, and digital marketing services.

BRAND VOICE:
- Professional yet approachable and conversational
- Educational and helpful, never pushy or sales-heavy
- Data-driven with concrete examples
- Optimistic and solutions-focused
- Clear, concise, and actionable

WRITING STYLE:
- Use active voice and strong action verbs
- Short paragraphs (2-4 sentences max)
- Subheadings every 2-3 paragraphs for scannability
- Bullet points and numbered lists for key takeaways
- Include real-world examples and case studies when relevant
- End with a clear call-to-action

TONE:
- Confident but humble
- Expert without being condescending
- Friendly and personable
- Encourage questions and engagement

SEO BEST PRACTICES:
- Natural keyword integration (never forced)
- Descriptive subheadings with H2 and H3 tags
- Internal linking opportunities noted in [brackets]
- Meta-optimized introduction
- FAQ section when appropriate

TARGET AUDIENCE:
- Small to medium business owners
- Marketing managers
- Entrepreneurs
- People seeking to improve their digital presence

CONTENT STRUCTURE:
1. Hook (compelling opening that identifies pain point)
2. Problem explanation (why this matters)
3. Solution overview (what can be done)
4. Detailed breakdown (how-to steps, strategies, examples)
5. Benefits and results (what success looks like)
6. Call-to-action (next steps)

OUTPUT FORMAT:
- Use proper markdown formatting
- Include ## for main headings, ### for subheadings
- Bold **important concepts**
- Use > blockquotes for key insights
- Code blocks for technical content when relevant
- Always include a "Key Takeaways" section near the end`

/**
 * Generate AI-powered blog post content from form data
 * 
 * @param {Object} formData - Form input from the admin portal
 * @returns {Promise<Object>} Generated content with title, markdown, SEO data
 */
export async function generateBlogContent(formData) {
  const prompt = `
Create a comprehensive blog post for Uptrade Media with the following details:

**Topic:** ${formData.topic}
**Category:** ${formData.category}
**Target Keywords:** ${formData.keywords || 'Not specified'}
**Key Points to Cover:** ${formData.keyPoints || 'Expand on the topic comprehensively'}
**Target Audience:** ${formData.targetAudience || 'Small business owners and marketing professionals'}
**Desired Length:** ${formData.wordCount || '1200-1500'} words
**Tone:** ${formData.tone || 'Professional yet conversational'}

${formData.includeStats ? '**Include:** Recent statistics and data points to support claims' : ''}
${formData.includeExamples ? '**Include:** Real-world examples or case studies' : ''}
${formData.includeFAQ ? '**Include:** FAQ section at the end' : ''}

Generate a complete blog post in JSON format with the following structure:

{
  "title": "SEO-optimized blog title (60 chars max)",
  "subtitle": "Engaging subtitle or tagline (optional)",
  "excerpt": "Compelling 150-160 character summary for meta description",
  "content": "Full markdown blog post content following Uptrade's style guide",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "readingTime": 7,
  "category": "${formData.category}",
  "metaTitle": "SEO title (60 chars)",
  "metaDescription": "Meta description (150-160 chars)",
  "featuredImageAlt": "Descriptive alt text for the featured image",
  "internalLinks": ["Suggested internal link 1", "Suggested internal link 2"],
  "callToAction": "Clear call-to-action at the end"
}

The content should be engaging, informative, and optimized for search engines while maintaining a natural, helpful tone.
Return ONLY valid JSON. Do not include markdown code fences or explanations.
`

  try {
    console.log('[Blog AI] Generating content for topic:', formData.topic)
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: UPTRADE_WRITING_STYLE },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_completion_tokens: 5000,
      response_format: { type: 'json_object' }
    })

    const generatedContent = JSON.parse(response.choices[0].message.content)
    
    console.log('[Blog AI] Content generated successfully')
    console.log('[Blog AI] Title:', generatedContent.title)
    console.log('[Blog AI] Reading time:', generatedContent.readingTime, 'minutes')
    
    return {
      success: true,
      data: generatedContent
    }
  } catch (error) {
    console.error('[Blog AI] Generation failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Generate a URL-friendly slug from title
 */
export function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
}

/**
 * Convert markdown to HTML (basic implementation)
 * For production, consider using a proper markdown library
 */
export function markdownToHtml(markdown) {
  return markdown
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
}

/**
 * Estimate reading time from content
 */
export function estimateReadingTime(content) {
  const wordsPerMinute = 200
  const wordCount = content.trim().split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}
