// src/components/SendProposalDialog.jsx
/**
 * Send Proposal Dialog
 * 
 * Email composition with:
 * - Client email display
 * - Custom subject line
 * - Personal message
 * - Email preview
 * - Sends magic link in branded email
 */
import React, { useState, useMemo } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Mail, 
  Send, 
  Loader2,
  User,
  Building2,
  FileText,
  Eye,
  Edit3,
  Check,
  DollarSign,
  Calendar,
  Sparkles,
  Copy,
  ExternalLink
} from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'

export default function SendProposalDialog({
  proposal,
  client,
  isOpen,
  onClose,
  onSuccess
}) {
  const [activeTab, setActiveTab] = useState('compose')
  const [isSending, setIsSending] = useState(false)
  const [emailData, setEmailData] = useState({
    to: client?.email || '',
    subject: `Your Proposal from Uptrade Media: ${proposal?.title || ''}`,
    personalMessage: ''
  })

  // Generate default subject
  useMemo(() => {
    if (proposal?.title && client?.name) {
      setEmailData(prev => ({
        ...prev,
        to: client.email || prev.to,
        subject: `${client.name.split(' ')[0]}, your custom proposal is ready`,
        personalMessage: `Hi ${client.name.split(' ')[0]},\n\nI've put together a custom proposal for you based on our conversation. This outlines exactly how we can help ${client.company || 'your business'} achieve your goals.\n\nTake a look when you get a chance - I'm confident you'll love what you see.\n\nLooking forward to working together!`
      }))
    }
  }, [proposal, client])

  // Handle send
  const handleSend = async () => {
    if (!emailData.to || !proposal?.id) return

    setIsSending(true)
    try {
      const response = await api.post('/.netlify/functions/proposals-send', {
        proposalId: proposal.id,
        email: emailData.to,
        subject: emailData.subject,
        personalMessage: emailData.personalMessage
      })

      if (response.data.success) {
        onSuccess?.(response.data)
        onClose?.()
      }
    } catch (error) {
      console.error('Failed to send proposal:', error)
      alert('Failed to send: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsSending(false)
    }
  }

  // Email preview HTML
  const emailPreviewHtml = useMemo(() => {
    const magicLink = `https://portal.uptrademedia.com/p/${proposal?.slug}?token=MAGIC_TOKEN`
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
          .logo { height: 40px; margin-bottom: 20px; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
          .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
          .content { padding: 40px 30px; }
          .proposal-card { background: #f8f9fc; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb; }
          .proposal-title { font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 12px; }
          .proposal-meta { display: flex; gap: 20px; flex-wrap: wrap; }
          .meta-item { display: flex; align-items: center; gap: 8px; color: #6b7280; font-size: 14px; }
          .price { color: #059669; font-weight: 600; font-size: 20px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
          .message { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
          .footer { background: #f8f9fc; padding: 24px 30px; text-align: center; color: #6b7280; font-size: 14px; }
          .valid-until { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-top: 16px; color: #92400e; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://portal.uptrademedia.com/uptrade_media_logo_white.png" alt="Uptrade Media" class="logo" />
            <h1>Your Proposal is Ready</h1>
            <p>A custom proposal prepared just for you</p>
          </div>
          
          <div class="content">
            ${emailData.personalMessage ? `
              <div class="message">
                ${emailData.personalMessage.replace(/\n/g, '<br>')}
              </div>
            ` : ''}
            
            <div class="proposal-card">
              <h2 class="proposal-title">${proposal?.title || 'Your Custom Proposal'}</h2>
              <div class="proposal-meta">
                <div class="meta-item">
                  <span>💰</span>
                  <span class="price">$${parseFloat(proposal?.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div class="meta-item">
                  <span>📅</span>
                  <span>Valid until ${new Date(proposal?.validUntil || Date.now() + 14*24*60*60*1000).toLocaleDateString()}</span>
                </div>
              </div>
              
              ${proposal?.validUntil && new Date(proposal.validUntil) < new Date(Date.now() + 7*24*60*60*1000) ? `
                <div class="valid-until">
                  ⏰ This proposal expires soon! Review it today to lock in this pricing.
                </div>
              ` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${magicLink}" class="cta-button">View Your Proposal →</a>
              <p style="color: #6b7280; font-size: 13px; margin-top: 8px;">
                Click the button above to view and accept your proposal
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Uptrade Media</strong></p>
            <p>Premium Digital Marketing & Web Design</p>
            <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
              This email was sent to ${emailData.to}.<br>
              If you have questions, reply to this email or call us.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }, [proposal, emailData, client])

  if (!proposal) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>Send Proposal</DialogTitle>
              <DialogDescription>
                {client?.name} will receive a magic link to view and sign
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mx-4 mt-4 grid w-fit grid-cols-2">
            <TabsTrigger value="compose" className="gap-2">
              <Edit3 className="w-4 h-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Compose Tab */}
            <TabsContent value="compose" className="mt-0 space-y-6">
              {/* Recipient */}
              <div className="p-4 rounded-xl bg-[var(--surface-secondary)] border border-[var(--glass-border)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-medium">
                    {client?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{client?.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{client?.company}</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {client?.type === 'prospect' ? 'Prospect' : 'Client'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--text-secondary)]">Send to</Label>
                  <Input
                    value={emailData.to}
                    onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                    placeholder="email@example.com"
                    type="email"
                    className="glass-bg border-[var(--glass-border)]"
                  />
                </div>
              </div>

              {/* Proposal Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-[var(--text-primary)]">Proposal</span>
                </div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">{proposal.title}</h4>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">${parseFloat(proposal.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  {proposal.validUntil && (
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <Calendar className="w-4 h-4" />
                      <span>Valid until {new Date(proposal.validUntil).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Subject Line</Label>
                <Input
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Your proposal from Uptrade Media"
                  className="glass-bg border-[var(--glass-border)]"
                />
              </div>

              {/* Personal Message */}
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">Personal Message (optional)</Label>
                <Textarea
                  value={emailData.personalMessage}
                  onChange={(e) => setEmailData({ ...emailData, personalMessage: e.target.value })}
                  placeholder="Add a personal note to accompany the proposal..."
                  rows={6}
                  className="glass-bg border-[var(--glass-border)] resize-none"
                />
                <p className="text-xs text-[var(--text-tertiary)]">
                  This message will appear at the top of the email before the proposal details.
                </p>
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-0">
              <div className="border border-[var(--glass-border)] rounded-xl overflow-hidden">
                <div className="p-3 bg-[var(--surface-secondary)] border-b border-[var(--glass-border)] flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-[var(--text-tertiary)]">To:</span>
                    <span className="ml-2 text-[var(--text-primary)]">{emailData.to}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-[var(--text-tertiary)]">Subject:</span>
                    <span className="ml-2 text-[var(--text-primary)]">{emailData.subject}</span>
                  </div>
                </div>
                <iframe
                  srcDoc={emailPreviewHtml}
                  className="w-full h-[400px] bg-white"
                  title="Email Preview"
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 pt-4 border-t border-[var(--glass-border)]">
          <div className="flex items-center gap-3 w-full">
            <p className="text-xs text-[var(--text-tertiary)] flex-1">
              <Sparkles className="w-3 h-3 inline mr-1" />
              A magic link will be generated so {client?.name?.split(' ')[0]} can access this proposal without logging in.
            </p>
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSending || !emailData.to}
              className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Proposal
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
