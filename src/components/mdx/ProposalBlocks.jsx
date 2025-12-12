/**
 * ProposalBlocks - MDX Components for Proposals
 * 
 * All components are theme-compatible using CSS custom properties.
 * Individual components are in ./proposal-blocks/ for maintainability.
 */

// Re-export all components from modular files
export { ProposalHero } from './proposal-blocks/ProposalHero'
export { Section } from './proposal-blocks/Section'
export { ExecutiveSummary } from './proposal-blocks/ExecutiveSummary'
export { StatsGrid, StatCard } from './proposal-blocks/StatsGrid'
export { CriticalIssues, IssueCard } from './proposal-blocks/CriticalIssues'
export { PricingSection, PricingTier } from './proposal-blocks/PricingSection'
export { Timeline, Phase } from './proposal-blocks/Timeline'
export { NewWebsiteBuild, WebsiteFeature } from './proposal-blocks/NewWebsiteBuild'
export { DownloadBlock } from './proposal-blocks/DownloadBlock'

// Advanced conversion-focused components
export { 
  ValueStack,
  GuaranteeBadge,
  UrgencyBanner,
  Testimonial,
  ComparisonTable,
  ProcessSteps,
  MetricHighlight,
  CTASection,
  IconFeatureGrid,
  BonusSection,
  WebsitePortfolio
} from './proposal-blocks/AdvancedBlocks'

// Import for mdxComponents object
import { ProposalHero } from './proposal-blocks/ProposalHero'
import { Section } from './proposal-blocks/Section'
import { ExecutiveSummary } from './proposal-blocks/ExecutiveSummary'
import { StatsGrid, StatCard } from './proposal-blocks/StatsGrid'
import { CriticalIssues, IssueCard } from './proposal-blocks/CriticalIssues'
import { PricingSection, PricingTier } from './proposal-blocks/PricingSection'
import { Timeline, Phase } from './proposal-blocks/Timeline'
import { NewWebsiteBuild, WebsiteFeature } from './proposal-blocks/NewWebsiteBuild'
import { DownloadBlock } from './proposal-blocks/DownloadBlock'
import { 
  ValueStack,
  GuaranteeBadge,
  UrgencyBanner,
  Testimonial,
  ComparisonTable,
  ProcessSteps,
  MetricHighlight,
  CTASection,
  IconFeatureGrid,
  BonusSection,
  WebsitePortfolio
} from './proposal-blocks/AdvancedBlocks'

// Lucide icons for MDX usage
import { 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Clock,
  DollarSign,
  Download,
  BarChart3,
  Shield,
  Sparkles,
  Zap,
  Award,
  Users,
  Globe,
  Smartphone,
  Search,
  Mail,
  Calendar,
  ArrowRight
} from 'lucide-react'

// Export all components for MDX runtime
export const mdxComponents = {
  // Core components
  ProposalHero,
  Section,
  ExecutiveSummary,
  StatsGrid,
  StatCard,
  CriticalIssues,
  IssueCard,
  PricingSection,
  PricingTier,
  Timeline,
  Phase,
  NewWebsiteBuild,
  WebsiteFeature,
  DownloadBlock,
  
  // Advanced conversion components
  ValueStack,
  GuaranteeBadge,
  UrgencyBanner,
  Testimonial,
  ComparisonTable,
  ProcessSteps,
  MetricHighlight,
  CTASection,
  IconFeatureGrid,
  BonusSection,
  WebsitePortfolio,
  
  // Lucide icons for use in MDX
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Clock,
  DollarSign,
  Download,
  BarChart3,
  Shield,
  Sparkles,
  Zap,
  Award,
  Users,
  Globe,
  Smartphone,
  Search,
  Mail,
  Calendar,
  ArrowRight
}
