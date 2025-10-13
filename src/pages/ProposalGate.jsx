// src/pages/ProposalGate.jsx
import React, { Suspense, useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import matter from 'gray-matter'
import MDXProposalRenderer from '@/components/MDXProposalRenderer'

const Row94 = React.lazy(() => import('./Row94WhiskeyPage'))
const MBFM  = React.lazy(() => import('./MBFMPage'))

// Legacy hardcoded proposals
const LEGACY_MAP = {
  row94: { title: 'Row 94 Whiskey — Proposal', Comp: Row94 },
  mbfm:  { title: 'MBFM — Proposal',            Comp: MBFM },
}

// MDX proposals - loaded dynamically
const MDX_PROPOSALS = ['row94', 'mbfm', 'row94-audit', 'new-website-demo']

export default function ProposalGate() {
  const { slug = '' } = useParams()
  const [mdxContent, setMdxContent] = useState(null)
  const [mdxMeta, setMdxMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const slugLower = slug.toLowerCase()

  // Check if this is an MDX proposal
  const isMdxProposal = MDX_PROPOSALS.includes(slugLower)
  
  // Check if this is a legacy proposal
  const legacyEntry = LEGACY_MAP[slugLower]

  useEffect(() => {
    if (isMdxProposal) {
      setLoading(true)
      // Load MDX file dynamically
      import(`../proposals/content/${slugLower}.mdx?raw`)
        .then(module => {
          const { data, content } = matter(module.default)
          setMdxMeta(data)
          setMdxContent(content)
          document.title = `${data.title || 'Proposal'} — Uptrade Media`
          setLoading(false)
        })
        .catch(err => {
          console.error('Failed to load MDX proposal:', err)
          setNotFound(true)
          setLoading(false)
        })
    } else if (legacyEntry) {
      document.title = legacyEntry.title
    }
  }, [isMdxProposal, slugLower, legacyEntry])

  // Not found
  if (!isMdxProposal && !legacyEntry) {
    return <Navigate to="/dashboard" replace />
  }

  // MDX loading state
  if (isMdxProposal && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading proposal...</p>
        </div>
      </div>
    )
  }

  // MDX not found
  if (isMdxProposal && notFound) {
    return <Navigate to="/dashboard" replace />
  }

  // Render MDX proposal
  if (isMdxProposal && mdxContent && mdxMeta) {
    return <MDXProposalRenderer mdxSource={mdxContent} meta={mdxMeta} />
  }

  // Render legacy proposal
  if (legacyEntry) {
    const { Comp } = legacyEntry
    return (
      <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
        <Comp />
      </Suspense>
    )
  }

  return null
}
