// src/components/engage/visual-editor/LayoutTemplates.jsx
// Pre-built layout templates for quick element creation

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Gift,
  Mail,
  Calendar,
  Clock,
  ShoppingCart,
  MessageSquare,
  Star,
  Bell,
  Users,
  TrendingUp,
  Megaphone,
  Zap,
  ArrowRight,
  X,
  Check,
  Sparkles
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TEMPLATES = {
  conversion: {
    label: 'Conversion',
    icon: TrendingUp,
    color: 'green',
    templates: [
      {
        id: 'discount-popup',
        name: 'Discount Offer',
        icon: Gift,
        description: 'Capture leads with a special discount',
        element_type: 'popup',
        headline: 'Get 20% Off Your First Order',
        body: 'Subscribe to our newsletter and save on your next purchase!',
        cta_text: 'Claim My Discount',
        cta_action: 'link',
        position: 'center',
        trigger_type: 'time',
        trigger_config: { delay_seconds: 10 },
        appearance: {
          backgroundColor: '#ffffff',
          textColor: '#1a1a1a',
          primaryColor: '#16a34a',
          borderRadius: 16,
          shadow: 'xl'
        }
      },
      {
        id: 'exit-intent',
        name: 'Exit Intent Offer',
        icon: ArrowRight,
        description: 'Last chance before they leave',
        element_type: 'popup',
        headline: 'Wait! Before You Go...',
        body: "Here's an exclusive offer just for you. Don't miss out!",
        cta_text: 'Get My Offer',
        cta_action: 'link',
        position: 'center',
        trigger_type: 'exit',
        trigger_config: {},
        appearance: {
          backgroundColor: '#1a1a1a',
          textColor: '#ffffff',
          primaryColor: '#f59e0b',
          borderRadius: 12,
          shadow: 'xl'
        }
      },
      {
        id: 'cart-abandonment',
        name: 'Cart Recovery',
        icon: ShoppingCart,
        description: 'Bring back abandoning shoppers',
        element_type: 'slide-in',
        headline: 'Forget Something?',
        body: 'Complete your order now and get free shipping!',
        cta_text: 'Complete Purchase',
        cta_action: 'link',
        position: 'bottom-right',
        trigger_type: 'exit',
        trigger_config: {},
        appearance: {
          backgroundColor: '#ffffff',
          textColor: '#1a1a1a',
          primaryColor: '#3b82f6',
          borderRadius: 12,
          shadow: 'lg'
        }
      },
      {
        id: 'countdown-timer',
        name: 'Limited Time Offer',
        icon: Clock,
        description: 'Create urgency with a countdown',
        element_type: 'banner',
        headline: '🔥 Flash Sale Ends Soon!',
        body: 'Up to 50% off everything',
        cta_text: 'Shop Now',
        cta_action: 'link',
        position: 'top-bar',
        trigger_type: 'load',
        trigger_config: {},
        appearance: {
          backgroundColor: '#dc2626',
          textColor: '#ffffff',
          primaryColor: '#ffffff',
          borderRadius: 0,
          shadow: 'none'
        }
      }
    ]
  },
  engagement: {
    label: 'Engagement',
    icon: MessageSquare,
    color: 'blue',
    templates: [
      {
        id: 'newsletter-signup',
        name: 'Newsletter Signup',
        icon: Mail,
        description: 'Grow your email list',
        element_type: 'popup',
        headline: 'Stay in the Loop',
        body: 'Get exclusive updates, tips, and offers delivered to your inbox.',
        cta_text: 'Subscribe Now',
        cta_action: 'link',
        position: 'center',
        trigger_type: 'scroll',
        trigger_config: { scroll_percentage: 50 },
        appearance: {
          backgroundColor: '#ffffff',
          textColor: '#1a1a1a',
          primaryColor: '#4bbf39',
          borderRadius: 16,
          shadow: 'lg'
        }
      },
      {
        id: 'book-consultation',
        name: 'Book a Call',
        icon: Calendar,
        description: 'Drive meeting bookings',
        element_type: 'slide-in',
        headline: 'Free Consultation',
        body: 'Schedule a 15-minute call with our team.',
        cta_text: 'Book Now',
        cta_action: 'scheduler',
        position: 'bottom-right',
        trigger_type: 'time',
        trigger_config: { delay_seconds: 30 },
        appearance: {
          backgroundColor: '#f8fafc',
          textColor: '#1e293b',
          primaryColor: '#8b5cf6',
          borderRadius: 12,
          shadow: 'lg'
        }
      },
      {
        id: 'chat-prompt',
        name: 'Chat Invitation',
        icon: MessageSquare,
        description: 'Start a conversation',
        element_type: 'nudge',
        headline: 'Need help?',
        body: 'Our team is here to answer your questions.',
        cta_text: 'Start Chat',
        cta_action: 'chat',
        position: 'bottom-right',
        trigger_type: 'time',
        trigger_config: { delay_seconds: 15 },
        appearance: {
          backgroundColor: '#ffffff',
          textColor: '#374151',
          primaryColor: '#4bbf39',
          borderRadius: 16,
          shadow: 'md'
        }
      },
      {
        id: 'announcement-bar',
        name: 'Site Announcement',
        icon: Megaphone,
        description: 'Important site-wide message',
        element_type: 'banner',
        headline: '📢 New Feature Available!',
        body: 'Check out what we just launched',
        cta_text: 'Learn More',
        cta_action: 'link',
        position: 'top-bar',
        trigger_type: 'load',
        trigger_config: {},
        appearance: {
          backgroundColor: '#4bbf39',
          textColor: '#ffffff',
          primaryColor: '#ffffff',
          borderRadius: 0,
          shadow: 'none'
        }
      }
    ]
  },
  social_proof: {
    label: 'Social Proof',
    icon: Users,
    color: 'purple',
    templates: [
      {
        id: 'testimonial',
        name: 'Customer Testimonial',
        icon: Star,
        description: 'Showcase customer reviews',
        element_type: 'popup',
        headline: '"Best decision we ever made!"',
        body: "— Sarah M., Marketing Director\n\n'This tool saved us 20 hours per week. Highly recommend!'",
        cta_text: 'Read More Stories',
        cta_action: 'link',
        position: 'center',
        trigger_type: 'scroll',
        trigger_config: { scroll_percentage: 70 },
        appearance: {
          backgroundColor: '#faf5ff',
          textColor: '#581c87',
          primaryColor: '#9333ea',
          borderRadius: 16,
          shadow: 'lg'
        }
      },
      {
        id: 'recent-activity',
        name: 'Recent Activity',
        icon: Bell,
        description: 'Show live social proof',
        element_type: 'nudge',
        headline: 'John from NYC',
        body: 'just signed up 2 minutes ago',
        cta_text: 'Join Them',
        cta_action: 'link',
        position: 'bottom-left',
        trigger_type: 'time',
        trigger_config: { delay_seconds: 8 },
        appearance: {
          backgroundColor: '#ffffff',
          textColor: '#374151',
          primaryColor: '#10b981',
          borderRadius: 8,
          shadow: 'md'
        }
      },
      {
        id: 'visitor-count',
        name: 'Live Visitors',
        icon: Users,
        description: 'Show current visitor count',
        element_type: 'nudge',
        headline: '🔴 12 people viewing',
        body: 'this page right now',
        cta_text: '',
        cta_action: 'close',
        position: 'bottom-left',
        trigger_type: 'time',
        trigger_config: { delay_seconds: 5 },
        appearance: {
          backgroundColor: '#fef3c7',
          textColor: '#92400e',
          primaryColor: '#f59e0b',
          borderRadius: 8,
          shadow: 'sm'
        }
      }
    ]
  },
  event: {
    label: 'Events',
    icon: Calendar,
    color: 'orange',
    templates: [
      {
        id: 'webinar-registration',
        name: 'Webinar Registration',
        icon: Calendar,
        description: 'Promote upcoming webinars',
        element_type: 'popup',
        headline: 'Join Our Free Webinar',
        body: 'Learn the secrets to 10x growth. Live Q&A with industry experts.',
        cta_text: 'Reserve My Spot',
        cta_action: 'link',
        position: 'center',
        trigger_type: 'time',
        trigger_config: { delay_seconds: 20 },
        appearance: {
          backgroundColor: '#1e40af',
          textColor: '#ffffff',
          primaryColor: '#fbbf24',
          borderRadius: 16,
          shadow: 'xl'
        }
      },
      {
        id: 'holiday-sale',
        name: 'Holiday Sale',
        icon: Gift,
        description: 'Seasonal promotion',
        element_type: 'popup',
        headline: '🎄 Holiday Sale!',
        body: 'Save up to 40% on all products. Limited time only!',
        cta_text: 'Shop the Sale',
        cta_action: 'link',
        position: 'center',
        trigger_type: 'time',
        trigger_config: { delay_seconds: 5 },
        appearance: {
          backgroundColor: '#14532d',
          textColor: '#ffffff',
          primaryColor: '#dc2626',
          borderRadius: 16,
          shadow: 'xl'
        }
      },
      {
        id: 'flash-sale-banner',
        name: 'Flash Sale Banner',
        icon: Zap,
        description: 'Urgent limited-time offer',
        element_type: 'banner',
        headline: '⚡ Flash Sale: 24 Hours Only!',
        body: 'Extra 25% off with code FLASH25',
        cta_text: 'Shop Now',
        cta_action: 'link',
        position: 'top-bar',
        trigger_type: 'load',
        trigger_config: {},
        appearance: {
          backgroundColor: '#7c3aed',
          textColor: '#ffffff',
          primaryColor: '#fbbf24',
          borderRadius: 0,
          shadow: 'none'
        }
      }
    ]
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function LayoutTemplates({ onSelect, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('conversion')
  const [hoveredTemplate, setHoveredTemplate] = useState(null)
  
  const categories = Object.entries(TEMPLATES)
  const currentCategory = TEMPLATES[selectedCategory]
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
            Choose a Template
          </DialogTitle>
          <DialogDescription>
            Start with a pre-designed template and customize it to match your brand
          </DialogDescription>
        </DialogHeader>
        
        {/* Category Tabs */}
        <div className="border-b px-6">
          <div className="flex gap-4">
            {categories.map(([key, category]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={cn(
                  "flex items-center gap-2 py-3 border-b-2 transition-colors",
                  selectedCategory === key 
                    ? "border-[var(--brand-primary)] text-[var(--brand-primary)]" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <category.icon className="h-4 w-4" />
                {category.label}
                <Badge variant="secondary" className="text-xs">
                  {category.templates.length}
                </Badge>
              </button>
            ))}
          </div>
        </div>
        
        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            {currentCategory.templates.map((template) => (
              <motion.div
                key={template.id}
                className={cn(
                  "border rounded-xl overflow-hidden cursor-pointer transition-all",
                  "hover:border-[var(--brand-primary)] hover:shadow-lg"
                )}
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
                onClick={() => onSelect(template)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Preview */}
                <div 
                  className="p-6 min-h-[160px] flex items-center justify-center"
                  style={{ 
                    backgroundColor: template.appearance.backgroundColor,
                    color: template.appearance.textColor
                  }}
                >
                  <TemplatePreview template={template} />
                </div>
                
                {/* Info */}
                <div className="p-4 bg-card border-t">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <template.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{template.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">
                      {template.element_type}
                    </Badge>
                  </div>
                  
                  {hoveredTemplate === template.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3"
                    >
                      <Button size="sm" className="w-full">
                        <Check className="h-4 w-4 mr-2" />
                        Use This Template
                      </Button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t p-4 flex justify-between items-center bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Or start from scratch with a blank element
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="secondary"
              onClick={() => onSelect({ 
                element_type: 'popup',
                name: '',
                headline: '',
                body: '',
                cta_text: '',
                position: 'center'
              })}
            >
              Blank Element
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE PREVIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function TemplatePreview({ template }) {
  const { 
    element_type, 
    headline, 
    body, 
    cta_text, 
    appearance 
  } = template
  
  const { 
    primaryColor, 
    borderRadius, 
    shadow 
  } = appearance
  
  if (element_type === 'banner') {
    return (
      <div className="w-full flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{headline}</span>
          <span className="text-xs opacity-80">{body}</span>
        </div>
        {cta_text && (
          <button
            className="text-xs px-3 py-1 rounded font-medium"
            style={{ 
              backgroundColor: primaryColor,
              color: appearance.backgroundColor 
            }}
          >
            {cta_text}
          </button>
        )}
      </div>
    )
  }
  
  if (element_type === 'nudge') {
    return (
      <div 
        className="max-w-[200px] p-3 text-left"
        style={{ borderRadius: `${borderRadius}px` }}
      >
        <p className="font-semibold text-sm mb-1">{headline}</p>
        <p className="text-xs opacity-80">{body}</p>
        {cta_text && (
          <button
            className="mt-2 text-xs px-3 py-1 rounded font-medium"
            style={{ 
              backgroundColor: primaryColor,
              color: '#fff' 
            }}
          >
            {cta_text}
          </button>
        )}
      </div>
    )
  }
  
  // Default: popup/slide-in
  return (
    <div 
      className="max-w-[280px] p-5 text-center"
      style={{ borderRadius: `${borderRadius}px` }}
    >
      <h3 className="font-bold text-lg mb-2">{headline}</h3>
      <p className="text-sm opacity-80 mb-4 whitespace-pre-line">{body}</p>
      {cta_text && (
        <button
          className="w-full text-sm px-4 py-2 rounded-md font-semibold"
          style={{ 
            backgroundColor: primaryColor,
            color: '#fff',
            borderRadius: `${Math.min(borderRadius, 8)}px`
          }}
        >
          {cta_text}
        </button>
      )}
    </div>
  )
}
