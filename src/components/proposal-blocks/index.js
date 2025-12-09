/**
 * Proposal Blocks - Modular Component Library
 * 
 * Comprehensive, visual proposal components for binding client proposals.
 * Each component tells a story - what, why, and how.
 * 
 * Structure:
 * - Core: Hero, sections, typography
 * - Story: Problem/solution, vision, context
 * - Scope: Deliverables with detailed breakdowns
 * - Audit: Performance callouts for redesign proposals
 * - Investment: Fixed pricing with optional add-ons
 * - Terms: Legal, payment schedule, boundaries
 * - Acceptance: Signature and agreement
 */

// Core Layout
export { Section, SectionHeader, GradientText, Divider } from './core/Section'
export { ProposalHero } from './core/ProposalHero'
export { ProposalNav } from './core/ProposalNav'

// Story & Context
export { ExecutiveSummary } from './story/ExecutiveSummary'
export { ProblemStatement, ProblemList } from './story/ProblemStatement'
export { ProjectVision, BeforeAfter } from './story/ProjectVision'
export { WhyUs, CredibilityStrip } from './story/WhyUs'

// Audit Callouts (for redesign proposals)
export { 
  AuditCallout, 
  ScoreComparison, 
  AuditIssues, 
  ScoreImpact 
} from './audit/AuditCallout'

// Scope & Deliverables
export { ScopeOverview } from './scope/ScopeOverview'
export { 
  DeliverableCard, 
  DeliverablesGrid, 
  DeliverableItem, 
  DeliverablesList 
} from './scope/Deliverables'
export { PhaseBreakdown, Phase, SimpleTimeline } from './scope/Phases'
export { Exclusions, ExclusionNote } from './scope/Exclusions'

// Investment & Add-ons
export { 
  InvestmentSection, 
  AddOnsGrid, 
  AddOnOption 
} from './investment/InvestmentSection'
export { 
  PaymentSchedule, 
  SimpleSplitPayment 
} from './investment/PaymentSchedule'

// Terms & Legal
export { 
  TermsSection, 
  TermsBlock, 
  StandardTerms, 
  COMMON_TERMS 
} from './terms/TermsSection'

// Next Steps & Acceptance
export { NextSteps, AcceptCTA } from './acceptance/NextSteps'
export { AcceptanceBlock } from './acceptance/AcceptanceBlock'

// Shared utilities
export { StatCard, StatsGrid } from './shared/Stats'
export { IconBox } from './shared/IconBox'
export { Callout } from './shared/Callout'
export { Divider as SectionDivider } from './shared/Divider'

