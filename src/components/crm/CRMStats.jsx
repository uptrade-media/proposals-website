/**
 * CRMStats - Glass-styled stats bar for CRM dashboard
 * Features: Animated counters, glass cards, trend indicators
 */
import { cn } from '@/lib/utils'
import {
  Users,
  Phone,
  Flame,
  ListTodo,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { GlassCard, GlassMetric } from './ui'

export default function CRMStats({
  prospects = [],
  callsSummary = {},
  tasksSummary = {},
  followUpsSummary = {},
  className
}) {
  const stats = [
    {
      label: 'Total Prospects',
      value: prospects.length,
      icon: Users,
      color: 'blue',
      gradient: 'from-[#4bbf39]/20 to-[#39bfb0]/20',
      iconBg: 'bg-[#4bbf39]/10',
      iconColor: 'text-[#4bbf39]'
    },
    {
      label: 'Total Calls',
      value: callsSummary.total || 0,
      icon: Phone,
      color: 'purple',
      gradient: 'from-[#39bfb0]/20 to-[#4bbf39]/20',
      iconBg: 'bg-[#39bfb0]/10',
      iconColor: 'text-[#39bfb0]'
    },
    {
      label: 'Hot Leads',
      value: callsSummary.hotLeads || 0,
      icon: Flame,
      color: 'red',
      gradient: 'from-red-500/20 to-orange-500/20',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      highlight: true
    },
    {
      label: 'Pending Tasks',
      value: tasksSummary.pending || 0,
      icon: ListTodo,
      color: 'amber',
      gradient: 'from-amber-500/20 to-yellow-500/20',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500'
    },
    {
      label: 'Overdue',
      value: tasksSummary.overdue || 0,
      icon: AlertCircle,
      color: 'orange',
      gradient: 'from-orange-500/20 to-red-500/20',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      alert: tasksSummary.overdue > 0
    },
    {
      label: 'Follow-ups Today',
      value: followUpsSummary.today || 0,
      icon: Clock,
      color: 'green',
      gradient: 'from-[#4bbf39]/20 to-[#39bfb0]/20',
      iconBg: 'bg-[#4bbf39]/10',
      iconColor: 'text-[#4bbf39]'
    }
  ]

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3', className)}>
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <GlassCard
            key={stat.label}
            className={cn(
              'p-4 relative overflow-hidden transition-all duration-300',
              stat.alert && 'ring-2 ring-orange-500/50'
            )}
            hover
          >
            {/* Background gradient */}
            <div 
              className={cn(
                'absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none',
                stat.gradient
              )}
            />
            
            <div className="relative flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className={cn(
                  'text-2xl font-bold tracking-tight',
                  stat.alert ? 'text-orange-500' : 'text-[var(--text-primary)]'
                )}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
              
              <div className={cn('p-2.5 rounded-xl', stat.iconBg)}>
                <Icon className={cn('h-5 w-5', stat.iconColor)} />
              </div>
            </div>
            
            {/* Highlight indicator for important stats */}
            {stat.highlight && stat.value > 0 && (
              <div className="absolute top-2 right-2">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              </div>
            )}
          </GlassCard>
        )
      })}
    </div>
  )
}
