/**
 * IntegrationCodeView - Display generated site-kit integration code
 * 
 * Shows code snippets grouped by module with copy functionality.
 * Can be used in setup wizards or admin dashboards.
 */

'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { generateIntegrationCode, getSnippetsByModule, type IntegrationSnippet, type GeneratorContext } from './integration-generator'

// ============================================
// Icons (inline SVG to avoid dependencies)
// ============================================

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ============================================
// Module metadata
// ============================================

const moduleLabels: Record<string, string> = {
  provider: 'Setup',
  analytics: 'Analytics',
  engage: 'Engage (Chat)',
  forms: 'Forms',
  commerce: 'Commerce',
  seo: 'SEO',
  blog: 'Blog',
}

const moduleColors: Record<string, string> = {
  provider: '#6366f1', // indigo
  analytics: '#8b5cf6', // violet
  engage: '#ec4899', // pink
  forms: '#14b8a6', // teal
  commerce: '#f59e0b', // amber
  seo: '#10b981', // emerald
  blog: '#3b82f6', // blue
}

// ============================================
// Component
// ============================================

export interface IntegrationCodeViewProps {
  projectId: string
  enabledModules: string[]
  apiUrl?: string
  brand?: {
    primaryColor?: string
    businessName?: string
  }
  className?: string
  onCopy?: (code: string, title: string) => void
}

export function IntegrationCodeView({
  projectId,
  enabledModules,
  apiUrl,
  brand,
  className,
  onCopy,
}: IntegrationCodeViewProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['provider']))
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Generate code snippets
  const snippets = useMemo(() => {
    return generateIntegrationCode({
      projectId,
      enabledModules,
      apiUrl,
      brand,
    })
  }, [projectId, enabledModules, apiUrl, brand])

  // Group by module
  const snippetsByModule = useMemo(() => {
    return getSnippetsByModule(snippets)
  }, [snippets])

  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(module)) {
        next.delete(module)
      } else {
        next.add(module)
      }
      return next
    })
  }

  const copyCode = async (code: string, id: string, title: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      onCopy?.(code, title)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const copyAll = async () => {
    const allCode = snippets
      .map(s => `// ${s.title}\n${s.filePath ? `// File: ${s.filePath}\n` : ''}${s.code}`)
      .join('\n\n// ---\n\n')
    try {
      await navigator.clipboard.writeText(allCode)
      onCopy?.(allCode, 'All snippets')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (enabledModules.length === 0) {
    return (
      <div className={className} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
        <p>No modules enabled for this project.</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Enable modules in Project Settings to generate integration code.
        </p>
      </div>
    )
  }

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 600 }}>Integration Code</h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#666' }}>
            {snippets.length} snippets for {enabledModules.length} modules
          </p>
        </div>
        <button
          onClick={copyAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            background: 'white',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          <CopyIcon />
          Copy All
        </button>
      </div>

      {/* Module Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Object.entries(snippetsByModule).map(([module, moduleSnippets]) => {
          const isExpanded = expandedModules.has(module)
          const color = moduleColors[module] || '#6366f1'
          
          return (
            <div 
              key={module} 
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                overflow: 'hidden',
              }}
            >
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: '#f9fafb',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      borderRadius: '50%',
                      background: color,
                    }}
                  />
                  <span style={{ fontWeight: 500 }}>
                    {moduleLabels[module] || module}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.125rem 0.5rem',
                      background: '#e5e7eb',
                      borderRadius: '9999px',
                    }}
                  >
                    {moduleSnippets.length}
                  </span>
                </div>
                {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
              </button>

              {/* Snippets */}
              {isExpanded && (
                <div>
                  {moduleSnippets.map((snippet, idx) => {
                    const snippetId = `${module}-${idx}`
                    const isCopied = copiedId === snippetId

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '1rem',
                          borderTop: '1px solid #e5e7eb',
                        }}
                      >
                        {/* Snippet Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                {snippet.title}
                              </span>
                              {snippet.required && (
                                <span
                                  style={{
                                    fontSize: '0.625rem',
                                    padding: '0.125rem 0.375rem',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.25rem',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Required
                                </span>
                              )}
                            </div>
                            {snippet.description && (
                              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
                                {snippet.description}
                              </p>
                            )}
                            {snippet.filePath && (
                              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: color, fontFamily: 'monospace' }}>
                                {snippet.filePath}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => copyCode(snippet.code, snippetId, snippet.title)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '2rem',
                              height: '2rem',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              borderRadius: '0.25rem',
                            }}
                            title="Copy code"
                          >
                            {isCopied ? (
                              <CheckIcon className="text-green-500" />
                            ) : (
                              <CopyIcon />
                            )}
                          </button>
                        </div>

                        {/* Code Block */}
                        <pre
                          style={{
                            margin: 0,
                            padding: '0.75rem',
                            background: '#1f2937',
                            color: '#e5e7eb',
                            borderRadius: '0.375rem',
                            overflow: 'auto',
                            fontSize: '0.75rem',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            lineHeight: 1.5,
                          }}
                        >
                          <code>{snippet.code}</code>
                        </pre>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
