import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Info } from 'lucide-react'
import Section from './Section'
import SignalAILogo from '@/components/signal/SignalAILogo'

/**
 * SignalAISection
 * Shows a specialized Signal AI upsell section
 */
export function SignalAISection({ 
  title = "Add Intelligence to Your Business",
  description = "Enable Signal AI to automate operations, engage visitors 24/7, and manage your new platform.",
  benefits = [],
  price = "199",
  period = "monthly",
  included = false
}) {
  return (
    <Section bg="gradient-dark">
      <div className="flex flex-col md:flex-row gap-8 items-center bg-zinc-900/50 rounded-2xl p-8 border border-[var(--glass-border)]">
        {/* Left Side: Brand & Value */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <SignalAILogo size={42} />
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">
              Signal AI
            </span>
          </div>
          
          <h3 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
          
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="mt-1 p-1 rounded-full bg-emerald-500/10">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Pricing Card */}
        <div className="w-full md:w-80 flex-shrink-0">
          <Card className="bg-[var(--surface-primary)] border-[var(--glass-border)] relative overflow-hidden">
             {included && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-0">Included</Badge>
              </div>
            )}
            
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />
            
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-[var(--text-primary)]">Signal AI Core</CardTitle>
              <CardDescription>Full intelligence suite</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-bold text-[var(--text-primary)]">${price}</span>
                <span className="text-[var(--text-tertiary)] ml-2 text-sm">/ {period}</span>
              </div>

              {!included ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-400" />
                    Optional add-on. Select this to include AI-powered features in your package.
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                  <CheckCircle className="w-5 h-5" />
                  Active on Launch
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Section>
  )
}
