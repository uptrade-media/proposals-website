/**
 * Content Block Definitions
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Centralized writing style and service definitions for AI blog generation.
 * Used by ContentSkill and blog-ai-worker.js
 * 
 * Multi-tenant support: Uptrade Media and God's Workout Apparel
 */

// ═══════════════════════════════════════════════════════════════════════════════
// UPTRADE SERVICES (for internal linking and callouts)
// ═══════════════════════════════════════════════════════════════════════════════

export const UPTRADE_SERVICES = {
  // Digital Marketing Core
  'seo': {
    url: '/marketing/seo/',
    title: 'SEO Services',
    description: 'Data-driven SEO to increase organic traffic and rankings',
    cta: 'Boost Your Rankings',
    keywords: ['SEO', 'search engine', 'rankings', 'organic traffic', 'keywords', 'Google', 'search visibility']
  },
  'ad-management': {
    url: '/marketing/ad-management/',
    title: 'Ad Management',
    description: 'Strategic paid advertising on Google, Meta, and LinkedIn',
    cta: 'Launch Your Campaigns',
    keywords: ['PPC', 'ads', 'Google Ads', 'Facebook Ads', 'advertising', 'paid media', 'campaigns']
  },
  'content-marketing': {
    url: '/marketing/content-marketing/',
    title: 'Content Marketing',
    description: 'Strategic content that attracts and converts',
    cta: 'Start Creating',
    keywords: ['content', 'blog', 'articles', 'copywriting', 'content strategy']
  },
  'email-social-marketing': {
    url: '/marketing/email-social-marketing/',
    title: 'Email & Social Marketing',
    description: 'Automated email flows and social media management',
    cta: 'Grow Your Audience',
    keywords: ['email', 'social media', 'newsletter', 'Instagram', 'Facebook', 'LinkedIn', 'marketing automation']
  },
  'reputation-management': {
    url: '/marketing/reputation-management/',
    title: 'Reputation Management',
    description: 'Monitor and improve your online reputation',
    cta: 'Protect Your Brand',
    keywords: ['reviews', 'reputation', 'Google reviews', 'online presence', 'brand monitoring']
  },
  'sales-funnels': {
    url: '/marketing/sales-funnels/',
    title: 'Sales Funnels',
    description: 'High-converting funnels that turn visitors into customers',
    cta: 'Build Your Funnel',
    keywords: ['funnel', 'landing page', 'conversion', 'leads', 'sales']
  },
  
  // Design & Development
  'web-design': {
    url: '/design/web-design/',
    title: 'Web Design',
    description: 'Custom websites that convert visitors into customers',
    cta: 'Design Your Website',
    keywords: ['web design', 'website', 'responsive', 'UX', 'UI', 'design']
  },
  'branding': {
    url: '/design/branding/',
    title: 'Branding',
    description: 'Complete brand identity from logo to guidelines',
    cta: 'Build Your Brand',
    keywords: ['branding', 'logo', 'brand identity', 'visual identity', 'brand strategy']
  },
  'ux': {
    url: '/design/ux/',
    title: 'UX Design',
    description: 'User experience design that delights and converts',
    cta: 'Improve Your UX',
    keywords: ['UX', 'user experience', 'usability', 'wireframes', 'prototyping']
  },
  'graphic-design': {
    url: '/design/graphic-design/',
    title: 'Graphic Design',
    description: 'Stunning visuals for print and digital',
    cta: 'Get Creative',
    keywords: ['graphic design', 'graphics', 'print', 'visual design', 'creative']
  },
  'web-development': {
    url: '/design/web-development/',
    title: 'Web Development',
    description: 'Custom web applications and advanced functionality',
    cta: 'Start Development',
    keywords: ['web development', 'coding', 'programming', 'custom development', 'web app']
  },
  'ecommerce-development': {
    url: '/design/ecommerce-development/',
    title: 'E-commerce Development',
    description: 'Online stores that drive sales and growth',
    cta: 'Launch Your Store',
    keywords: ['ecommerce', 'e-commerce', 'online store', 'Shopify', 'WooCommerce', 'shopping cart']
  },
  'landing-pages': {
    url: '/design/landing-pages/',
    title: 'Landing Pages',
    description: 'High-converting landing pages for campaigns',
    cta: 'Create Your Page',
    keywords: ['landing page', 'conversion page', 'squeeze page', 'lead capture']
  },
  
  // Media Production
  'video-production': {
    url: '/media/video-production/',
    title: 'Video Production',
    description: 'Professional video content for brands',
    cta: 'Create Your Video',
    keywords: ['video', 'video production', 'commercial', 'promotional video', 'brand video']
  },
  'photography': {
    url: '/media/photography/',
    title: 'Photography',
    description: 'Professional photography for products and brands',
    cta: 'Book a Shoot',
    keywords: ['photography', 'photos', 'product photography', 'headshots', 'brand photography']
  },
  'video-testimonials': {
    url: '/media/video-testimonials/',
    title: 'Video Testimonials',
    description: 'Authentic customer testimonials that build trust',
    cta: 'Get Testimonials',
    keywords: ['testimonials', 'video testimonials', 'reviews', 'customer stories']
  },
  'aerial-drone': {
    url: '/media/aerial-drone/',
    title: 'Aerial & Drone',
    description: 'Aerial photography and videography for unique perspectives',
    cta: 'Get Aerial Content',
    keywords: ['drone', 'aerial photography', 'drone video', 'aerial footage']
  },
  
  // AI & Automation
  'ai-automation': {
    url: '/ai-automation/',
    title: 'AI & Automation',
    description: 'Custom AI solutions to streamline your business',
    cta: 'Automate Your Business',
    keywords: ['AI', 'automation', 'artificial intelligence', 'chatbot', 'machine learning']
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPTRADE WRITING STYLE
// ═══════════════════════════════════════════════════════════════════════════════

export const UPTRADE_WRITING_STYLE = `You are a master educator writing for intelligent friends who want to learn. Your writing style is warm, conversational, and deeply informative.

## CRITICAL WRITING RULES

### NEVER USE:
- Em dashes (—) - use commas, periods, or parentheses instead
- En dashes (–) except in number ranges (2020-2024)
- Overly formal academic language
- Sales-heavy or pushy language
- Filler phrases like "In today's digital landscape" or "In this article, we'll explore"
- Buzzwords without substance
- Passive voice when active is better

### ALWAYS DO:
1. **Write like you're teaching a smart friend** - Assume intelligence, explain complexity
2. **Cite credible sources** - Reference studies, statistics, expert quotes with attribution
3. **Be conversational but authoritative** - You know your stuff, share it warmly
4. **Use contractions** - "you'll", "we've", "it's" - it's how people talk
5. **Short paragraphs** - 2-3 sentences max for readability
6. **Start with a hook** - Address the reader's problem or curiosity immediately
7. **Provide actionable insights** - Every section should teach something useful
8. **Use examples** - Real scenarios make abstract concepts concrete
9. **Include data points** - Numbers and statistics build credibility

### TONE EXAMPLES:
❌ WRONG: "In today's ever-evolving digital marketing landscape — where competition is fierce — businesses must leverage innovative strategies to achieve success."

✅ RIGHT: "Here's the truth about digital marketing in 2025: the businesses winning aren't doing more. They're doing less, but doing it better. Let me show you exactly how."

❌ WRONG: "It is imperative that organizations implement comprehensive SEO strategies to maximize their online visibility."

✅ RIGHT: "Google processes 8.5 billion searches every day (Search Engine Land, 2024). If your website isn't showing up when people search for what you offer, you're invisible to most of your potential customers."

### CITING SOURCES:
- Name the source directly: "According to HubSpot's 2024 State of Marketing Report..."
- Include specific data: "A Stanford study found that 75% of users judge credibility based on design..."
- Link when online: "Research from Moz shows..." (we'll add the link)

### CONTENT STRUCTURE:
1. **Hook** - Grab attention with an insight, question, or surprising fact
2. **Promise** - Tell them what they'll learn and why it matters
3. **Teach** - Deliver value in scannable, practical chunks
4. **Prove** - Back claims with data, examples, case studies
5. **Connect** - Relate to Uptrade services where natural (not forced)
6. **Close** - Actionable next steps, not generic CTAs

## BRAND CONTEXT: UPTRADE MEDIA
A digital marketing agency specializing in web design, SEO, and digital marketing.
Voice: Professional yet approachable, expert without being condescending
Tone: Confident, helpful, solutions-focused

## AVAILABLE COMPONENTS

1. **Service Callouts** - Contextual CTAs to related services
   Format: <!-- SERVICE_CALLOUT: service-key -->
   Place after sections where a service naturally relates

2. **FAQ Sections** - Will render as accordions
   Use H2 "Frequently Asked Questions" with Q&A format

3. **Key Takeaways** - Summarize main points
   Use bullet points under H2 "Key Takeaways"`

// ═══════════════════════════════════════════════════════════════════════════════
// GWA WRITING STYLE
// ═══════════════════════════════════════════════════════════════════════════════

export const GWA_WRITING_STYLE = `You are writing for God's Workout Apparel, a faith-driven fitness brand. Your audience is Christian athletes and fitness enthusiasts who see physical discipline as spiritual discipline.

## CRITICAL WRITING RULES

### NEVER USE:
- Em dashes (—) - use commas, periods, or parentheses instead
- En dashes (–) except in number ranges
- Generic fitness clichés without spiritual depth
- Preachy or judgmental language
- Filler phrases like "In today's world" or "In this article"

### ALWAYS DO:
1. **Weave faith and fitness together naturally** - The body is a temple, training is worship
2. **Ground content in Scripture** - Reference verses that support the message
3. **Be encouraging, not preachy** - Inspire through example, not lecture
4. **Use contractions** - Write conversationally (you'll, we've, it's)
5. **Short paragraphs** - 2-3 sentences max for readability
6. **Start with a hook** - Address the reader's struggle or aspiration
7. **Provide actionable insights** - Every section should teach something useful
8. **Include workout tips** - Practical training advice alongside spiritual truth
9. **Reference the GWA lifestyle** - Discipline, dedication, devotion

### TONE EXAMPLES:
❌ WRONG: "In today's fitness-obsessed culture, Christians must navigate the balance between physical health and spiritual growth."

✅ RIGHT: "Your body is a temple. Not because some pastor told you so, but because God crafted it with His own hands. When you train, you're not just building muscle. You're honoring the craftsmanship of the Creator."

❌ WRONG: "It is important for believers to maintain physical fitness as part of their spiritual journey."

✅ RIGHT: "David didn't defeat Goliath sitting on a couch. The shepherd king trained his body in the wilderness, slinging stones until his aim was true. Your training matters. God uses prepared people."

### SCRIPTURE INTEGRATION:
- Weave verses naturally, don't just drop them in
- Explain how they apply to training
- Use NIV, ESV, or NKJV translations
- Key verses: 1 Corinthians 6:19-20, Philippians 4:13, 1 Timothy 4:8, Hebrews 12:1-2

### CONTENT STRUCTURE:
1. **Hook** - Grab attention with relatable struggle or bold truth
2. **Biblical Foundation** - Connect to Scripture
3. **Practical Training** - Actionable fitness/discipline advice
4. **Spiritual Application** - How this transforms daily life
5. **Call to Action** - Inspire the next step

## BRAND CONTEXT: GOD'S WORKOUT APPAREL
A faith-driven fitness apparel brand for Christian athletes.
Voice: Warrior-poet meets humble servant
Tone: Bold, encouraging, biblically grounded, never preachy
Tagline: "Train Like Your Body is a Temple"`

// ═══════════════════════════════════════════════════════════════════════════════
// BLOG CONTENT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const BLOG_OUTPUT_SCHEMA = {
  title: 'Blog post title (60 chars max for SEO)',
  subtitle: 'Optional subtitle or tagline',
  excerpt: 'Meta description (150-160 chars)',
  content: 'Full markdown content with H2/H3 headers',
  keywords: ['keyword1', 'keyword2', 'keyword3'],
  category: 'blog category slug',
  serviceCallouts: ['service-key-1', 'service-key-2'],
  faq: [
    { question: 'Question text', answer: 'Answer text' }
  ],
  keyTakeaways: ['Takeaway 1', 'Takeaway 2', 'Takeaway 3']
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get tenant-specific writing configuration
 */
export function getTenantWritingStyle(org) {
  if (!org) return { writingStyle: UPTRADE_WRITING_STYLE, services: UPTRADE_SERVICES, isGWA: false }
  
  const slug = org.slug?.toLowerCase() || ''
  const name = org.name?.toLowerCase() || ''
  
  if (slug.includes('gods-workout') || slug.includes('gwa') || name.includes("god's workout")) {
    return { writingStyle: GWA_WRITING_STYLE, services: null, isGWA: true }
  }
  
  return { writingStyle: UPTRADE_WRITING_STYLE, services: UPTRADE_SERVICES, isGWA: false }
}

/**
 * Find related services based on topic keywords
 */
export function findRelatedServices(topic, category, keywords) {
  const searchText = `${topic} ${category} ${keywords || ''}`.toLowerCase()
  const matches = []
  
  for (const [key, service] of Object.entries(UPTRADE_SERVICES)) {
    const matchScore = service.keywords.filter(kw => 
      searchText.includes(kw.toLowerCase())
    ).length
    
    if (matchScore > 0) {
      matches.push({ key, ...service, score: matchScore })
    }
  }
  
  // Sort by match score and return top 3
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

/**
 * Build services context for AI prompts
 */
export function buildServicesContext() {
  return Object.entries(UPTRADE_SERVICES)
    .map(([key, service]) => `- ${service.title}: ${service.url} - ${service.description}`)
    .join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  UPTRADE_SERVICES,
  UPTRADE_WRITING_STYLE,
  GWA_WRITING_STYLE,
  BLOG_OUTPUT_SCHEMA,
  getTenantWritingStyle,
  findRelatedServices,
  buildServicesContext
}
