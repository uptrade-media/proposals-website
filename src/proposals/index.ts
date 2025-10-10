// src/proposals/index.ts
import { lazy, type LazyExoticComponent, type ComponentType } from 'react'

export type ProposalMeta = {
  slug: string
  title: string
  // purely visual, not security:
  brand?: { title?: string; logo?: string; tagline?: string }

  // Which routes this login unlocks
  // (Your server ultimately enforces; client uses for UI.)
  allowedDomains?: string[]
  allowedEmails?: string[]

  // Renderer
  component: LazyExoticComponent<ComponentType<any>>
}

export const PROPOSALS: Record<string, ProposalMeta> = {
  row94: {
    slug: 'row94',
    title: 'Row 94 Whiskey — Digital Growth Proposal',
    brand: {
      title: 'Row 94 — Proposals Portal',
      logo: '/uptrade_media_logo_white.png',
      tagline: 'Secure access to Row 94 Whiskey proposal',
    },
    allowedDomains: ['row94whiskey.com', 'grsm.com'],
    component: lazy(() => import('../pages/Row94WhiskeyPage')), // ← relative, no "@"
  },

  mbfm: {
    slug: 'mbfm',
    title: 'MBFM — Fleet Growth Proposal',
    brand: {
      title: 'MBFM — Proposals Portal',
      logo: '/uptrade_media_logo_white.png',
      tagline: 'Secure access to MBFM proposal',
    },
    allowedDomains: ['mbfm.com'],
    component: lazy(() => import('../pages/MBFMPage')),
  },
}

export function getProposal(slug?: string | null): ProposalMeta | undefined {
  if (!slug) return undefined
  return PROPOSALS[slug.toLowerCase()]
}

export function inferBrandFromPath(pathname: string): string {
  const m = pathname.match(/^\/p\/([^\/?#]+)/)
  return (m?.[1] ?? 'default').toLowerCase()
}
