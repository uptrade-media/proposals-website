// src/components/seo/signal/ImplementationSnippet.jsx
// Copyable code snippets for SEO recommendations
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Copy, 
  Check, 
  Code2, 
  ChevronDown, 
  ChevronUp,
  Terminal,
  FileCode,
  Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// Snippet type configurations
const SNIPPET_TYPES = {
  html: {
    icon: Code2,
    label: 'HTML',
    language: 'html',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10'
  },
  meta: {
    icon: Globe,
    label: 'Meta Tag',
    language: 'html',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10'
  },
  schema: {
    icon: FileCode,
    label: 'JSON-LD',
    language: 'json',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10'
  },
  htaccess: {
    icon: Terminal,
    label: '.htaccess',
    language: 'apache',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10'
  },
  nextjs: {
    icon: FileCode,
    label: 'Next.js',
    language: 'javascript',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10'
  },
  wordpress: {
    icon: Code2,
    label: 'WordPress',
    language: 'php',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10'
  }
}

/**
 * Generate implementation snippets based on recommendation type
 */
export function generateSnippet(recommendation) {
  const { type, category, data = {} } = recommendation
  
  switch (category) {
    case 'title':
      return {
        type: 'meta',
        code: `<title>${data.suggested_title || 'Your Optimized Title Here'}</title>`,
        description: 'Add this to your page\'s <head> section',
        alternatives: [
          {
            type: 'nextjs',
            label: 'Next.js App Router',
            code: `// app/page.tsx
export const metadata = {
  title: '${data.suggested_title || 'Your Optimized Title Here'}',
}`
          },
          {
            type: 'wordpress',
            label: 'WordPress (Yoast)',
            code: `// In Yoast SEO panel:
// SEO Title: ${data.suggested_title || 'Your Optimized Title Here'}`
          }
        ]
      }
      
    case 'meta_description':
      return {
        type: 'meta',
        code: `<meta name="description" content="${data.suggested_description || 'Your optimized meta description here. Make it compelling and under 160 characters.'}" />`,
        description: 'Add this to your page\'s <head> section',
        alternatives: [
          {
            type: 'nextjs',
            label: 'Next.js App Router',
            code: `// app/page.tsx
export const metadata = {
  description: '${data.suggested_description || 'Your optimized meta description'}',
}`
          }
        ]
      }
      
    case 'schema':
    case 'schema_markup':
      return {
        type: 'schema',
        code: JSON.stringify(data.schema || {
          "@context": "https://schema.org",
          "@type": data.schema_type || "Organization",
          "name": data.business_name || "Your Business",
          "url": data.url || "https://example.com"
        }, null, 2),
        description: 'Add this JSON-LD script to your page\'s <head>',
        wrapper: '<script type="application/ld+json">\n{code}\n</script>'
      }
      
    case 'canonical':
      return {
        type: 'meta',
        code: `<link rel="canonical" href="${data.canonical_url || 'https://example.com/page'}" />`,
        description: 'Add this to your page\'s <head> section to specify the canonical URL'
      }
      
    case 'redirect':
      return {
        type: 'htaccess',
        code: `# 301 Redirect
Redirect 301 ${data.from_path || '/old-page'} ${data.to_url || 'https://example.com/new-page'}`,
        description: 'Add this to your .htaccess file (Apache servers)',
        alternatives: [
          {
            type: 'nextjs',
            label: 'Next.js',
            code: `// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: '${data.from_path || '/old-page'}',
        destination: '${data.to_url || '/new-page'}',
        permanent: true,
      },
    ]
  },
}`
          }
        ]
      }
      
    case 'image_alt':
      return {
        type: 'html',
        code: `<img src="${data.image_src || 'image.jpg'}" alt="${data.suggested_alt || 'Descriptive alt text for the image'}" />`,
        description: 'Update your image tag with descriptive alt text'
      }
      
    case 'internal_link':
      return {
        type: 'html',
        code: `<a href="${data.target_url || '/related-page'}">${data.anchor_text || 'descriptive anchor text'}</a>`,
        description: 'Add this internal link to your content'
      }
      
    case 'robots':
      return {
        type: 'meta',
        code: `<meta name="robots" content="${data.robots_content || 'index, follow'}" />`,
        description: 'Add this to control how search engines crawl this page'
      }
      
    case 'hreflang':
      return {
        type: 'meta',
        code: `<link rel="alternate" hreflang="${data.lang || 'en'}" href="${data.url || 'https://example.com'}" />
<link rel="alternate" hreflang="x-default" href="${data.default_url || 'https://example.com'}" />`,
        description: 'Add these tags for international SEO'
      }
      
    default:
      return null
  }
}

function CodeBlock({ code, language = 'html', onCopy }) {
  return (
    <div className="relative group">
      <pre className={cn(
        'p-4 rounded-lg overflow-x-auto text-sm',
        'bg-[#1e1e2e] text-[#cdd6f4]', // Dark code theme
        'border border-[var(--glass-border)]'
      )}>
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'absolute top-2 right-2 h-8 w-8',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4]'
        )}
        onClick={onCopy}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  )
}

/**
 * ImplementationSnippet - Copyable code snippet for an SEO recommendation
 * 
 * @param {object} recommendation - The recommendation object
 * @param {object} snippet - Pre-generated snippet (optional, will generate if not provided)
 * @param {string} variant - 'inline' | 'expanded' | 'modal'
 * @param {boolean} showAlternatives - Whether to show alternative implementations
 */
export default function ImplementationSnippet({
  recommendation,
  snippet: providedSnippet,
  variant = 'inline',
  showAlternatives = true,
  className
}) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(variant === 'expanded')
  const [activeAlt, setActiveAlt] = useState(null)
  
  const snippet = providedSnippet || generateSnippet(recommendation)
  
  if (!snippet) {
    return null
  }
  
  const typeConfig = SNIPPET_TYPES[snippet.type] || SNIPPET_TYPES.html
  const Icon = typeConfig.icon
  
  const handleCopy = async (code) => {
    const finalCode = snippet.wrapper 
      ? snippet.wrapper.replace('{code}', code)
      : code
    
    await navigator.clipboard.writeText(finalCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  // Inline variant - just a copy button
  if (variant === 'inline') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(snippet.code)}
            className={cn(
              'gap-2',
              copied && 'text-green-400 border-green-500/30',
              className
            )}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Code2 className="h-3.5 w-3.5" />
                Copy Code
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{snippet.description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }
  
  // Expanded variant - full code block with alternatives
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded', typeConfig.bgColor)}>
            <Icon className={cn('h-4 w-4', typeConfig.color)} />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Implementation Code
          </span>
          <Badge variant="outline" className="text-xs">
            {typeConfig.label}
          </Badge>
        </div>
        
        <Button variant="ghost" size="icon" className="h-8 w-8">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Code block */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4">
              {/* Description */}
              <p className="text-sm text-[var(--text-secondary)]">
                {snippet.description}
              </p>
              
              {/* Main code block */}
              <CodeBlock 
                code={snippet.code} 
                language={typeConfig.language}
                onCopy={() => handleCopy(snippet.code)}
              />
              
              {/* Copy button */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleCopy(snippet.code)}
                  className={cn(
                    copied && 'bg-green-600 hover:bg-green-500'
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              </div>
              
              {/* Alternatives */}
              {showAlternatives && snippet.alternatives && snippet.alternatives.length > 0 && (
                <div className="pt-4 border-t border-[var(--glass-border)]">
                  <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
                    Alternative Implementations
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {snippet.alternatives.map((alt, i) => {
                      const altConfig = SNIPPET_TYPES[alt.type] || SNIPPET_TYPES.html
                      return (
                        <Button
                          key={i}
                          variant={activeAlt === i ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setActiveAlt(activeAlt === i ? null : i)}
                          className="text-xs"
                        >
                          {alt.label}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {activeAlt !== null && (
                      <motion.div
                        key={activeAlt}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <CodeBlock 
                          code={snippet.alternatives[activeAlt].code}
                          language={SNIPPET_TYPES[snippet.alternatives[activeAlt].type]?.language || 'text'}
                          onCopy={() => handleCopy(snippet.alternatives[activeAlt].code)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

