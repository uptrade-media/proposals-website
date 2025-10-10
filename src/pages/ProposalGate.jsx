// src/pages/ProposalGate.jsx
import React, { Suspense } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'

const Row94 = React.lazy(() => import('./Row94WhiskeyPage'))
const MBFM  = React.lazy(() => import('./MBFMPage'))

const MAP = {
  row94: { title: 'Row 94 Whiskey — Proposal', Comp: Row94 },
  mbfm:  { title: 'MBFM — Proposal',            Comp: MBFM },
}

export default function ProposalGate() {
  const { slug = '' } = useParams()
  const entry = MAP[slug.toLowerCase()]
  if (!entry) return <Navigate to="/dashboard" replace />
  const { Comp, title } = entry

  return (
    <>
      <Helmet><title>{title}</title></Helmet>
      <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
        <Comp />
      </Suspense>
    </>
  )
}
