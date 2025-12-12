// src/components/ProposalView.jsx
/**
 * Unified Proposal View Component
 * Used by both:
 * - ProposalEditor (admin preview with toolbar)
 * - ProposalGate (client-facing public view)
 */
import { useState, useEffect, useRef } from 'react'
import { evaluate } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import { mdxComponents, ProposalHero } from './mdx/ProposalBlocks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Clock } from 'lucide-react'
import ProposalSignature from './ProposalSignature'

// Sanitize MDX content to escape problematic characters
function sanitizeMDXContent(mdxSource) {
  if (!mdxSource) return mdxSource
  
  let sanitized = mdxSource
  
  // FIRST: Fix malformed JSX array attributes
  // AI sometimes generates: items=[ instead of items={[
  sanitized = sanitized.replace(/(\w+)=\[(\s*[\[\{"\w])/g, '$1={[$2')
  
  // Close the arrays properly
  sanitized = sanitized.replace(/\](\s*)(\/?>)/g, ']}$1$2')
  sanitized = sanitized.replace(/\](\s+)(\w+=)/g, ']}$1$2')
  
  // SECOND: Fix escaped quotes inside attribute values
  // AI generates: description="...\"quoted text\"..." 
  // Replace \" with ' (single quote) to avoid parsing issues
  sanitized = sanitized.replace(/\\"/g, "'")
  
  // THIRD: Handle square brackets in text that look like placeholders
  // Replace [word] or [word word] with 'word' using single quotes
  sanitized = sanitized.replace(/\[([a-zA-Z][a-zA-Z\s]*)\]/g, "'$1'")
  
  // FOURTH: Fix angle brackets that might appear in text values
  // Replace <number with "less than number" and >number with "more than number"
  sanitized = sanitized.replace(/<(\d)/g, 'less than $1')
  sanitized = sanitized.replace(/>(\d)/g, 'more than $1')
  
  return sanitized
}

// MDX Content Renderer
function MDXContent({ mdxSource }) {
  const [Content, setContent] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function compileMDX() {
      if (!mdxSource) {
        setLoading(false)
        return
      }
      
      try {
        const sanitizedMDX = sanitizeMDXContent(mdxSource)
        const { default: CompiledContent } = await evaluate(sanitizedMDX, {
          ...runtime,
          development: false
        })
        setContent(() => CompiledContent)
      } catch (err) {
        console.error('MDX compilation error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    compileMDX()
  }, [mdxSource])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg p-6">
        <h3 className="text-[var(--accent-red)] font-semibold mb-2">Content Error</h3>
        <pre className="text-sm text-[var(--accent-red)]/80 overflow-auto whitespace-pre-wrap">{error}</pre>
      </div>
    )
  }

  if (!Content) {
    return <p className="text-[var(--text-secondary)]">No content available</p>
  }

  return (
    <div className="mdx-content text-[var(--text-primary)]">
      <Content components={mdxComponents} />
    </div>
  )
}

export default function ProposalView({ 
  proposal, 
  isPublicView = false,
  showSignature = true,
  className = ''
}) {
  if (!proposal) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  // Normalize field names (API returns camelCase, some places have snake_case)
  const totalAmount = proposal.totalAmount || (proposal.total_amount ? parseFloat(proposal.total_amount) : null)
  const validUntil = proposal.validUntil || proposal.valid_until
  const mdxContent = proposal.mdxContent || proposal.mdx_content
  const heroImageUrl = proposal.heroImageUrl || proposal.hero_image_url
  const brandName = proposal.brandName || proposal.brand_name || proposal.contact?.company
  const timeline = proposal.timeline || '6 weeks'
  const paymentTerms = proposal.paymentTerms || proposal.payment_terms || '50/50'

  const hasContent = mdxContent && 
    !mdxContent.startsWith('# Generating') && 
    mdxContent.length > 100

  const isGenerating = !hasContent && proposal.status === 'draft'

  if (isGenerating) {
    return (
      <div className={`max-w-6xl mx-auto ${className}`}>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[var(--brand-primary)] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Generating Your Proposal...
            </h3>
            <p className="text-[var(--text-secondary)]">
              Our AI is crafting a high-converting proposal. This usually takes 30-60 seconds.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasContent) {
    return (
      <div className={`max-w-6xl mx-auto ${className}`}>
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardContent className="py-16 text-center">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              No Content Yet
            </h3>
            <p className="text-[var(--text-secondary)]">
              This proposal doesn't have any content.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Hero Section */}
      <ProposalHero
        title={proposal.title}
        subtitle={proposal.description}
        heroImage={heroImageUrl}
        brandName={brandName}
        totalAmount={totalAmount}
        validUntil={validUntil}
        stats={[
          { value: timeline, label: 'Timeline' },
          { value: `$${(totalAmount || 0).toLocaleString()}`, label: 'Investment' },
          { value: paymentTerms, label: 'Payment' },
          { value: '2', label: 'Q1 Slots Left' }
        ]}
      />

      {/* MDX Content - No card wrapper, components have their own styling */}
      <div className="mb-8">
        <MDXContent mdxSource={mdxContent} />
      </div>

      {/* Signature Section - for public client view */}
      {isPublicView && showSignature && (
        <Card className="mb-8 bg-[var(--glass-bg)] border-[var(--glass-border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">
              {['signed', 'accepted'].includes(proposal.status) ? 'Proposal Signed' : 'Accept This Proposal'}
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              {['signed', 'accepted'].includes(proposal.status) 
                ? 'This proposal has been signed and accepted'
                : 'Sign below to accept this proposal and get started'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProposalSignature 
              proposalId={proposal.id} 
              proposalSlug={proposal.slug}
              clientSignature={proposal.clientSignatureUrl || proposal.clientSignature}
              clientSignedBy={proposal.clientSignedBy}
              clientSignedAt={proposal.clientSignedAt || proposal.signedAt}
              adminSignature={proposal.adminSignatureUrl || proposal.adminSignature}
              adminSignedBy={proposal.adminSignedBy}
              adminSignedAt={proposal.adminSignedAt}
              status={proposal.status}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
