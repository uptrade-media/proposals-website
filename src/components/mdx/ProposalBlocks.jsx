import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Clock,
  DollarSign,
  Download,
  BarChart3
} from 'lucide-react'

// Section wrapper with consistent spacing
export function Section({ children, className = '', bg = 'white' }) {
  const bgClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    gradient: 'bg-gradient-to-br from-gray-50 to-white'
  }
  
  return (
    <section className={`py-12 sm:py-16 ${bgClasses[bg]} ${className}`}>
      <div className="space-y-6">
        {children}
      </div>
    </section>
  )
}

// Executive Summary Block
export function ExecutiveSummary({ children }) {
  return (
    <Section>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
        Executive Summary
      </h2>
      <div className="bg-gradient-to-r from-green-50 to-teal-100 border-l-4 border-green-500 rounded-xl p-6 sm:p-8">
        <div className="prose prose-lg max-w-none text-gray-700">
          {children}
        </div>
      </div>
    </Section>
  )
}

// Stats Card Grid
export function StatsGrid({ children }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 my-8">
      {children}
    </div>
  )
}

export function StatCard({ value, label, change, trend = 'neutral', icon: Icon }) {
  const trendColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600'
  }
  
  return (
    <div className="text-center p-4 bg-gray-50 rounded-lg border">
      {Icon && <Icon className="h-6 w-6 mx-auto mb-2 text-gray-600" />}
      <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
        {value}
      </div>
      <div className="text-xs sm:text-sm text-gray-600">{label}</div>
      {change && (
        <div className={`text-xs mt-1 ${trendColors[trend]}`}>
          {change}
        </div>
      )}
    </div>
  )
}

// Critical Issues Block
export function CriticalIssues({ children, title = 'CRITICAL DIGITAL GAPS' }) {
  return (
    <Section>
      <div className="bg-black rounded-xl p-4 sm:p-8 border-l-4 border-yellow-500">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center">
          <div className="flex items-center mb-2 sm:mb-0">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-yellow-400" />
            <span className="text-yellow-400">{title}</span>
          </div>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {children}
        </div>
      </div>
    </Section>
  )
}

export function IssueCard({ title, description, severity = 'high' }) {
  const severityColors = {
    critical: 'bg-red-900/50 border-red-500',
    high: 'bg-orange-900/50 border-orange-500',
    medium: 'bg-yellow-900/50 border-yellow-500'
  }
  
  return (
    <div className={`p-4 border-l-4 rounded ${severityColors[severity]}`}>
      <h4 className="font-semibold text-white mb-2">{title}</h4>
      <p className="text-gray-300 text-sm">{description}</p>
    </div>
  )
}

// Pricing/Solution Block
export function PricingSection({ children }) {
  return (
    <Section bg="gray">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
        Proposed Solution & Investment
      </h2>
      {children}
    </Section>
  )
}

export function PricingTier({ 
  name, 
  price, 
  period = 'one-time',
  description,
  features = [],
  highlighted = false 
}) {
  return (
    <Card className={highlighted ? 'border-2 border-green-500 shadow-lg' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{name}</span>
          {highlighted && (
            <Badge className="bg-green-500">Recommended</Badge>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <span className="text-4xl font-bold text-gray-900">${price}</span>
          <span className="text-gray-600 ml-2">/ {period}</span>
        </div>
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// Timeline Block
export function Timeline({ children }) {
  return (
    <Section>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
        Project Timeline
      </h2>
      <div className="space-y-6">
        {children}
      </div>
    </Section>
  )
}

export function Phase({ 
  number, 
  title, 
  duration, 
  deliverables = [],
  description 
}) {
  return (
    <div className="relative pl-8 pb-8 border-l-2 border-gray-300 last:border-transparent">
      <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-green-500 border-4 border-white flex items-center justify-center">
        <span className="text-xs font-bold text-white">{number}</span>
      </div>
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <Badge variant="outline" className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {duration}
          </Badge>
        </div>
        {description && <p className="text-gray-600 mb-4">{description}</p>}
        {deliverables.length > 0 && (
          <ul className="space-y-2">
            {deliverables.map((item, i) => (
              <li key={i} className="flex items-start text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// New Website Build Block (for clients with no existing site)
export function NewWebsiteBuild({ children }) {
  return (
    <Section>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
        New Website Build
      </h2>
      <Alert className="mb-6 border-green-500 bg-green-50">
        <TrendingUp className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Starting Fresh:</strong> We'll build your digital presence from the ground up with modern technology and best practices.
        </AlertDescription>
      </Alert>
      {children}
    </Section>
  )
}

export function WebsiteFeature({ 
  title, 
  description, 
  icon: Icon = Target,
  included = true 
}) {
  return (
    <Card className={included ? '' : 'opacity-60'}>
      <CardContent className="pt-6">
        <div className="flex items-start">
          <div className="mr-4 p-3 bg-green-100 rounded-lg">
            <Icon className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{title}</h4>
              {included && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Download Block (for reports, etc.)
export function DownloadBlock({ 
  title = 'Download Full Report',
  description,
  fileUrl,
  fileName = 'report.pdf'
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg border p-6 sm:p-8 my-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div className="mb-4 sm:mb-0">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
        <a href={fileUrl} download={fileName}>
          <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-bold w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </a>
      </div>
    </div>
  )
}

// Export all components for MDX
export const mdxComponents = {
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
  // Also export lucide icons for use in MDX
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Clock,
  DollarSign,
  Download,
  BarChart3
}
