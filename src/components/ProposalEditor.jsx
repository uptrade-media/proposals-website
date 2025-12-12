// src/components/ProposalEditor.jsx
/**
 * Proposal Editor Wrapper
 * - Top toolbar (back, send, export, status)
 * - Renders ProposalView (same as client sees)
 * - AI Chat bubble for edits (bottom right)
 */
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowLeft, 
  Send, 
  Download, 
  Edit3, 
  Loader2,
  X,
  Sparkles,
  Check,
  Clock,
  FileText,
  MoreHorizontal,
  Copy,
  ExternalLink
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import SendProposalDialog from './SendProposalDialog'
import ProposalView from './ProposalView'
import jsPDF from 'jspdf'

// AI Chat Bubble Component
function AIChatBubble({ proposal, onProposalUpdate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await api.post('/.netlify/functions/proposals-edit-ai', {
        proposalId: proposal.id,
        instruction: userMessage,
        currentContent: proposal.mdxContent
      })

      if (response.data.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.message || 'Done! I\'ve updated the proposal.' 
        }])
        if (response.data.proposal) {
          onProposalUpdate(response.data.proposal)
        }
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I couldn\'t make that change. Please try again.' 
        }])
      }
    } catch (error) {
      console.error('AI edit error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Something went wrong. Please try again.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-full shadow-lg transition-all hover:scale-105"
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-medium">Edit with AI</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[var(--brand-primary)] text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">AI Proposal Editor</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-[var(--surface-secondary)]">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-tertiary)] py-8">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Ask me to edit the proposal.</p>
            <p className="text-xs mt-1">e.g., "Make the pricing section more urgent"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'max-w-[85%] rounded-lg px-3 py-2 text-sm',
              msg.role === 'user'
                ? 'ml-auto bg-[var(--brand-primary)] text-white'
                : 'bg-[var(--surface-primary)] border border-[var(--border-primary)]'
            )}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Updating proposal...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--surface-primary)]">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me what to change..."
            className="min-h-[40px] max-h-[100px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Status badge component
function StatusBadge({ status }) {
  const statusConfig = {
    draft: { label: 'Draft', variant: 'secondary', icon: Edit3 },
    generating: { label: 'Generating', variant: 'secondary', icon: Loader2 },
    sent: { label: 'Sent', variant: 'default', icon: Send },
    viewed: { label: 'Viewed', variant: 'outline', icon: FileText },
    accepted: { label: 'Accepted', variant: 'success', icon: Check },
    signed: { label: 'Signed', variant: 'success', icon: Check },
    declined: { label: 'Declined', variant: 'destructive', icon: X },
  }

  const config = statusConfig[status] || statusConfig.draft
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className={cn("w-3 h-3", status === 'generating' && "animate-spin")} />
      {config.label}
    </Badge>
  )
}

export default function ProposalEditor({ proposalId, onBack }) {
  const [proposal, setProposal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch proposal data
  useEffect(() => {
    async function fetchProposal() {
      if (!proposalId) return
      
      setIsLoading(true)
      try {
        const response = await api.get(`/.netlify/functions/proposals-get?id=${proposalId}`)
        if (response.data.proposal) {
          setProposal(response.data.proposal)
        } else {
          setError('Proposal not found')
        }
      } catch (err) {
        console.error('Error fetching proposal:', err)
        setError(err.message || 'Failed to load proposal')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProposal()
  }, [proposalId])

  // Poll for updates if proposal is generating
  useEffect(() => {
    if (!proposal) return
    
    const mdxContent = proposal.mdxContent || proposal.mdx_content
    const hasContent = mdxContent && 
      !mdxContent.startsWith('# Generating') && 
      mdxContent.length > 100

    if (hasContent || (proposal.status !== 'draft' && proposal.status !== 'generating')) return

    // Poll every 3 seconds
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/.netlify/functions/proposals-get?id=${proposalId}`)
        if (response.data.proposal) {
          setProposal(response.data.proposal)
          
          const newContent = response.data.proposal.mdxContent
          if (newContent && !newContent.startsWith('# Generating') && newContent.length > 100) {
            clearInterval(interval)
          }
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [proposal, proposalId])

  const handleExportPDF = async () => {
    if (!proposal) return
    setIsExporting(true)
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 20
      const contentWidth = pageWidth - (margin * 2)
      
      pdf.setFontSize(24)
      pdf.setTextColor(17, 24, 39)
      pdf.text(proposal.title || 'Proposal', margin, 30)
      
      const mdxContent = proposal.mdxContent || proposal.mdx_content
      if (mdxContent) {
        pdf.setFontSize(11)
        pdf.setTextColor(51, 51, 51)
        
        const plainText = mdxContent
          .replace(/<[^>]+>/g, '')
          .replace(/\{[^}]+\}/g, '')
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/^\-\s+/gm, '• ')
          .trim()
        
        const lines = pdf.splitTextToSize(plainText, contentWidth)
        let y = 45
        
        lines.forEach(line => {
          if (y > 280) {
            pdf.addPage()
            y = 20
          }
          pdf.text(line, margin, y)
          y += 6
        })
      }
      
      pdf.save(`${proposal.slug || 'proposal'}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyLink = () => {
    if (!proposal?.slug) return
    const link = `${window.location.origin}/p/${proposal.slug}`
    navigator.clipboard.writeText(link)
  }

  const handleProposalUpdate = (updatedProposal) => {
    setProposal(prev => ({ ...prev, ...updatedProposal }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Proposals
        </Button>
      </div>
    )
  }

  const mdxContent = proposal?.mdxContent || proposal?.mdx_content
  const hasContent = mdxContent && 
    !mdxContent.startsWith('# Generating') && 
    mdxContent.length > 100

  return (
    <div className="min-h-screen">
      {/* Top Toolbar */}
      <div className="sticky top-0 z-40 bg-[var(--surface-primary)]/95 backdrop-blur border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-[var(--border-primary)]" />
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)] line-clamp-1">
                {proposal?.title || 'Untitled Proposal'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                {proposal?.contact?.company && (
                  <span>{proposal.contact.company}</span>
                )}
                {(proposal?.validUntil || proposal?.valid_until) && (
                  <>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>Valid until {new Date(proposal.validUntil || proposal.valid_until).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <StatusBadge status={proposal?.status} />
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              disabled={!proposal?.slug}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting || !hasContent}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export PDF
            </Button>

            <Button
              size="sm"
              onClick={() => setShowSendDialog(true)}
              disabled={!hasContent}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Proposal
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.open(`/p/${proposal?.slug}`, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview as Client
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="w-4 h-4 mr-2" />
                  View History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  Delete Proposal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content - Renders the same ProposalView as clients see */}
      <div className="py-8 px-6">
        <ProposalView 
          proposal={proposal} 
          isPublicView={true}
          showSignature={true}
        />
      </div>

      {/* AI Chat Bubble */}
      {hasContent && (
        <AIChatBubble 
          proposal={proposal} 
          onProposalUpdate={handleProposalUpdate} 
        />
      )}

      {/* Send Dialog */}
      <SendProposalDialog
        proposal={proposal}
        isOpen={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        onSent={() => {
          setShowSendDialog(false)
          api.get(`/.netlify/functions/proposals-get?id=${proposalId}`)
            .then(res => setProposal(res.data.proposal))
        }}
      />
    </div>
  )
}
