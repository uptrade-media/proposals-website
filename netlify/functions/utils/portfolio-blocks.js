/**
 * Portfolio Block Definitions
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Centralized prompts and tech registry for AI portfolio generation.
 * Used by ContentSkill and portfolio-ai-generate.js
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TECH STACK REGISTRY
// Main site has icons for these - use EXACT names
// ═══════════════════════════════════════════════════════════════════════════════

export const TECH_REGISTRY = {
  // Frontend
  frontend: [
    'React', 'Next.js', 'Vite', 'TypeScript', 'JavaScript', 
    'Tailwind CSS', 'MDX', 'Framer Motion', 'Design System', 'Routing'
  ],
  
  // Backend
  backend: ['Node.js', 'Express', 'Python'],
  
  // Database
  database: ['PostgreSQL', 'Supabase', 'MongoDB', 'Redis'],
  
  // Infrastructure
  infrastructure: ['Vercel', 'Netlify', 'AWS', 'Docker', 'Cloudflare', 'Image CDN'],
  
  // Platforms
  platforms: ['Wix', 'WordPress', 'Shopify', 'Webflow', 'Squarespace'],
  
  // Analytics
  analytics: ['GA4', 'Internal Analytics', 'Hotjar', 'Mixpanel'],
  
  // SEO
  seo: ['SEO', 'Local SEO', 'Schema Markup', 'Structured Data'],
  
  // Tools
  tools: ['Git', 'GitHub', 'VS Code', 'Postman'],
  
  // Design
  design: ['Figma', 'Adobe XD', 'Photoshop', 'Illustrator'],
  
  // Security
  security: ['SSL/HTTPS', 'OAuth'],
  
  // Other
  other: ['Stripe', 'Square', 'OpenAI', 'Resend', 'SendGrid']
}

// Flat list of all valid tech names
export const VALID_TECH_NAMES = Object.values(TECH_REGISTRY).flat()

// ═══════════════════════════════════════════════════════════════════════════════
// AVAILABLE ICONS
// ═══════════════════════════════════════════════════════════════════════════════

export const PORTFOLIO_ICONS = {
  // General
  general: ['CheckCircle', 'Sparkles', 'Zap', 'Target', 'Award', 'TrendingUp', 'Star'],
  
  // Services
  services: ['Palette', 'Code', 'Code2', 'Search', 'Rocket', 'Globe', 'Megaphone'],
  
  // Technical
  technical: ['Gauge', 'Shield', 'Smartphone', 'BarChart3', 'Database', 'Server'],
  
  // Project
  project: ['Calendar', 'Clock', 'Users', 'Building', 'MapPin']
}

export const VALID_ICON_NAMES = Object.values(PORTFOLIO_ICONS).flat()

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO GENERATION PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

export const PORTFOLIO_STYLE = `You are an expert copywriter for Uptrade Media, a digital marketing agency specializing in web design, SEO, and media production. Your task is to generate compelling portfolio content that showcases successful client projects.

## STYLE GUIDELINES:
- Professional yet conversational tone
- Focus on tangible results and benefits
- Use active voice and strong action verbs
- Keep paragraphs concise (2-3 sentences max)
- Emphasize ROI and business impact
- Include specific metrics when available
- Use industry-specific terminology appropriately

## CONTENT STRUCTURE:
- Start with strong, benefit-driven headlines
- Highlight the challenge or opportunity
- Explain the strategic approach clearly
- Showcase key services and implementations
- Emphasize measurable results
- Include technical innovations when relevant

## ICON NAMES (use exactly these):
${Object.entries(PORTFOLIO_ICONS).map(([cat, icons]) => `${cat}: ${icons.join(', ')}`).join('\n')}

## TECHNOLOGY REGISTRY (use EXACT names for tech_stack):
${Object.entries(TECH_REGISTRY).map(([cat, techs]) => `${cat}: ${techs.join(', ')}`).join('\n')}`

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO OUTPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const PORTFOLIO_OUTPUT_SCHEMA = {
  subtitle: '5-8 word catchy tagline',
  description: '150-200 character meta description for previews and SEO',
  
  kpis: {
    traffic: 'number or null (percentage increase)',
    conversions: 'number or null (percentage increase)',
    revenue: 'number or null (percentage or dollar amount)',
    rankings: 'number or null (position achieved)',
    performance: 'number or null (score 0-100)'
  },
  
  services_showcase: [
    {
      icon: 'IconName',
      title: 'Service Title',
      description: '1-2 sentence description',
      features: ['Feature 1', 'Feature 2', 'Feature 3']
    }
    // 3-4 services
  ],
  
  strategic_approach: [
    {
      phase: 'Phase 1: Discovery',
      description: '2-3 sentences about this phase',
      icon: 'Search',
      timeline: 'Week 1-2',
      deliverables: ['Deliverable 1', 'Deliverable 2']
    }
    // 3-4 phases
  ],
  
  comprehensive_results: [
    {
      icon: 'TrendingUp',
      metric: '+245%',
      label: 'Organic Traffic',
      description: 'Explanation of this result'
    }
    // 4-6 results
  ],
  
  technical_innovations: [
    {
      icon: 'Zap',
      title: 'Innovation Title',
      description: 'What we implemented',
      metrics: ['Metric 1', 'Metric 2', 'Metric 3']
    }
    // 3-5 innovations
  ],
  
  challenges: [
    {
      title: 'Challenge Title',
      description: 'The problem they faced - 1-2 sentences',
      solution: 'How we solved it - 1-2 sentences',
      icon: 'performance|design|seo|conversion'
    }
    // 3-4 challenges
  ],
  
  tech_stack: [
    { name: 'Next.js', category: 'frontend' },
    { name: 'Tailwind CSS', category: 'frontend' }
    // 6-10 technologies - use EXACT names from TECH_REGISTRY
  ],
  
  content: '## Project Overview\n\nMarkdown content for the case study...',
  
  seo: {
    title: '60 char max SEO title',
    description: '150-160 char meta description',
    keywords: ['keyword1', 'keyword2', 'keyword3']
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate tech stack names against registry
 */
export function validateTechStack(techStack) {
  return techStack.filter(tech => 
    VALID_TECH_NAMES.includes(tech.name)
  )
}

/**
 * Validate icon names against registry
 */
export function validateIconName(iconName) {
  return VALID_ICON_NAMES.includes(iconName) ? iconName : 'CheckCircle'
}

/**
 * Get tech category from name
 */
export function getTechCategory(techName) {
  for (const [category, techs] of Object.entries(TECH_REGISTRY)) {
    if (techs.includes(techName)) {
      return category
    }
  }
  return 'other'
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  TECH_REGISTRY,
  VALID_TECH_NAMES,
  PORTFOLIO_ICONS,
  VALID_ICON_NAMES,
  PORTFOLIO_STYLE,
  PORTFOLIO_OUTPUT_SCHEMA,
  validateTechStack,
  validateIconName,
  getTechCategory
}
