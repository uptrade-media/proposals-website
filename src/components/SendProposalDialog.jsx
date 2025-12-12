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
import React, { useState, useMemo, useRef, useCallback } from 'react'
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
  ExternalLink,
  X,
  Plus,
  Users
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
  const [recipients, setRecipients] = useState(client?.email ? [client.email] : [])
  const [newRecipient, setNewRecipient] = useState('')
  const [recipientError, setRecipientError] = useState('')
  const inputRef = useRef(null)
  const [emailData, setEmailData] = useState({
    subject: `Your Proposal from Uptrade Media: ${proposal?.title || ''}`,
    personalMessage: ''
  })

  // Validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Add a recipient
  const addRecipient = useCallback((email) => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return
    
    if (!isValidEmail(trimmedEmail)) {
      setRecipientError('Please enter a valid email address')
      return
    }
    
    if (recipients.includes(trimmedEmail)) {
      setRecipientError('This email is already added')
      return
    }
    
    setRecipients(prev => [...prev, trimmedEmail])
    setNewRecipient('')
    setRecipientError('')
  }, [recipients])

  // Remove a recipient
  const removeRecipient = (email) => {
    setRecipients(prev => prev.filter(e => e !== email))
  }

  // Handle key press in input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault()
      addRecipient(newRecipient)
    } else if (e.key === 'Backspace' && !newRecipient && recipients.length > 0) {
      // Remove last recipient on backspace if input is empty
      setRecipients(prev => prev.slice(0, -1))
    }
  }

  // Handle paste (for pasting multiple emails)
  const handlePaste = (e) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    // Split by comma, semicolon, space, or newline
    const emails = pastedText.split(/[,;\s\n]+/).filter(Boolean)
    emails.forEach(email => addRecipient(email))
  }

  // Generate default subject
  useMemo(() => {
    if (proposal?.title && client?.name) {
      setEmailData(prev => ({
        ...prev,
        subject: `${client.name.split(' ')[0]}, your custom proposal is ready`,
        personalMessage: `Hi ${client.name.split(' ')[0]},\n\nI've put together a custom proposal for you based on our conversation. This outlines exactly how we can help ${client.company || 'your business'} achieve your goals.\n\nTake a look when you get a chance - I'm confident you'll love what you see.\n\nLooking forward to working together!`
      }))
    }
    // Initialize recipients with client email
    if (client?.email && !recipients.includes(client.email)) {
      setRecipients([client.email])
    }
  }, [proposal, client])

  // Handle send
  const handleSend = async () => {
    if (recipients.length === 0 || !proposal?.id) return

    setIsSending(true)
    try {
      const response = await api.post('/.netlify/functions/proposals-send', {
        proposalId: proposal.id,
        recipients: recipients,
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
          .header { background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%); padding: 40px 30px; text-align: center; }
          .logo { height: 40px; margin-bottom: 20px; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
          .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
          .content { padding: 40px 30px; }
          .proposal-card { background: #f8f9fc; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb; }
          .proposal-title { font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 16px; }
          .proposal-meta { display: flex; gap: 32px; flex-wrap: wrap; }
          .meta-item { display: flex; flex-direction: column; gap: 4px; }
          .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 500; }
          .meta-value { font-size: 18px; font-weight: 600; color: #111827; }
          .price { color: #059669 !important; font-size: 22px !important; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #4ade80 0%, #2dd4bf 100%); color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
          .message { background: #f0fdf4; border-left: 4px solid #4ade80; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
          .footer { background: #f8f9fc; padding: 24px 30px; text-align: center; color: #6b7280; font-size: 14px; }
          .valid-until { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-top: 16px; color: #92400e; font-size: 14px; }
          @media (prefers-color-scheme: dark) {
            body { background: #0a0a0a !important; }
            .container { background: #1a1a2e !important; }
            .proposal-card { background: #16213e !important; border-color: #2d3748 !important; }
            .proposal-title { color: #f3f4f6 !important; }
            .meta-value { color: #f3f4f6 !important; }
            .footer { background: #16213e !important; border-color: #2d3748 !important; }
            .footer p { color: #9ca3af !important; }
            .message { background: rgba(74, 222, 128, 0.1) !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://portal.uptrademedia.com/logo.png" alt="Uptrade Media" class="logo" />
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
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                <tr>
                  <td style="padding-right: 32px; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">Investment</div>
                    <div style="font-size: 22px; font-weight: 700; color: #059669;">$${parseFloat(proposal?.totalAmount || 0).toLocaleString()}</div>
                  </td>
                  <td style="vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">Valid Until</div>
                    <div style="font-size: 18px; font-weight: 600; color: #111827;">${new Date(proposal?.validUntil || Date.now() + 14*24*60*60*1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  </td>
                </tr>
              </table>
              
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
              This email was sent to ${recipients[0] || 'recipient'}.<br>
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
              {/* Recipients */}
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
                  <div className="flex items-center justify-between">
                    <Label className="text-[var(--text-secondary)] flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Send to {recipients.length > 1 ? `(${recipients.length} recipients)` : ''}
                    </Label>
                  </div>
                  
                  {/* Recipients tags container */}
                  <div 
                    className="min-h-[46px] p-2 rounded-lg border border-[var(--glass-border)] glass-bg flex flex-wrap gap-2 cursor-text"
                    onClick={() => inputRef.current?.focus()}
                  >
                    {recipients.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20"
                      >
                        <Mail className="w-3 h-3" />
                        {email}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeRecipient(email)
                          }}
                          className="ml-0.5 hover:bg-[var(--brand-primary)]/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    
                    <input
                      ref={inputRef}
                      type="email"
                      value={newRecipient}
                      onChange={(e) => {
                        setNewRecipient(e.target.value)
                        setRecipientError('')
                      }}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      onBlur={() => newRecipient && addRecipient(newRecipient)}
                      placeholder={recipients.length === 0 ? 'Enter email addresses...' : 'Add another...'}
                      className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>
                  
                  {recipientError && (
                    <p className="text-xs text-red-500">{recipientError}</p>
                  )}
                  
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Press Enter, Tab, or comma to add. Paste multiple emails separated by commas.
                  </p>
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
                  <div className="text-sm flex-1">
                    <span className="text-[var(--text-tertiary)]">To:</span>
                    <span className="ml-2 text-[var(--text-primary)]">
                      {recipients.length > 2 
                        ? `${recipients.slice(0, 2).join(', ')} +${recipients.length - 2} more`
                        : recipients.join(', ') || 'No recipients'}
                    </span>
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
              {recipients.length === 1 
                ? `A magic link will be generated so ${client?.name?.split(' ')[0] || 'the recipient'} can access this proposal without logging in.`
                : `Magic links will be generated for all ${recipients.length} recipients to access this proposal.`}
            </p>
            <Button variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={isSending || recipients.length === 0}
              className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send {recipients.length > 1 ? `to ${recipients.length} Recipients` : 'Proposal'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
