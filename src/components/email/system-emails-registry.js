/**
 * System Emails Registry
 * 
 * This registry defines all transactional/system emails that are sent by the portal.
 * These are NOT marketing emails - they are functional emails triggered by system events.
 * 
 * Each email can be viewed and customized through the Outreach module.
 */

// Brand colors - consistent with email templates
const BRAND = {
  primary: '#4bbf39',
  primaryDark: '#3a9c2d',
  secondary: '#007AFF',
  dark: '#1a1a1a',
  gray: '#666666',
  lightGray: '#f5f5f7',
  white: '#ffffff',
  border: '#e5e5e5',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444'
}

/**
 * System email categories for organization
 */
export const SYSTEM_EMAIL_CATEGORIES = {
  authentication: {
    id: 'authentication',
    name: 'Authentication',
    description: 'Login, account setup, and access emails',
    icon: 'Shield'
  },
  audits: {
    id: 'audits',
    name: 'Website Audits',
    description: 'Audit results and reports',
    icon: 'Search'
  },
  billing: {
    id: 'billing',
    name: 'Billing & Invoices',
    description: 'Payment receipts, invoices, and reminders',
    icon: 'CreditCard'
  },
  proposals: {
    id: 'proposals',
    name: 'Proposals',
    description: 'Proposal notifications and signatures',
    icon: 'FileText'
  },
  projects: {
    id: 'projects',
    name: 'Projects',
    description: 'Project updates and milestones',
    icon: 'FolderKanban'
  },
  notifications: {
    id: 'notifications',
    name: 'Notifications',
    description: 'System notifications and alerts',
    icon: 'Bell'
  }
}

/**
 * System email definitions
 * Each email has:
 * - id: Unique identifier (used for storage/API)
 * - name: Display name
 * - category: Category from SYSTEM_EMAIL_CATEGORIES
 * - description: What this email does
 * - trigger: What triggers this email
 * - variables: Available template variables
 * - defaultSubject: Default subject line
 * - defaultHtml: Default HTML template
 * - functionFile: The Netlify function that sends this email (for reference)
 */
export const SYSTEM_EMAILS = [
  // ============================================
  // AUTHENTICATION EMAILS
  // ============================================
  {
    id: 'account-setup-invite',
    name: 'Account Setup Invite',
    category: 'authentication',
    description: 'Sent when a new client is added and needs to set up their account',
    trigger: 'Admin creates a new client or resends setup email',
    functionFile: 'admin-resend-setup-email.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{setup_link}}', description: 'One-time setup link' },
      { name: '{{company}}', description: 'Client company name' }
    ],
    defaultSubject: 'Set up your Uptrade Media portal account',
    editable: true
  },
  {
    id: 'magic-link-login',
    name: 'Magic Link Login',
    category: 'authentication',
    description: 'Passwordless login link sent to existing users',
    trigger: 'User requests magic link login',
    functionFile: 'admin-resend-setup-email.js',
    variables: [
      { name: '{{first_name}}', description: 'User first name' },
      { name: '{{magic_link}}', description: 'One-time login link' },
      { name: '{{expires_in}}', description: 'Link expiration time' }
    ],
    defaultSubject: 'Your login link for Uptrade Portal',
    editable: true
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    category: 'authentication',
    description: 'Password reset link for users with password auth',
    trigger: 'User requests password reset',
    functionFile: 'auth-forgot.js',
    variables: [
      { name: '{{first_name}}', description: 'User first name' },
      { name: '{{reset_link}}', description: 'Password reset link' },
      { name: '{{expires_in}}', description: 'Link expiration time' }
    ],
    defaultSubject: 'Reset your Uptrade Portal password',
    editable: true
  },

  // ============================================
  // AUDIT EMAILS
  // ============================================
  {
    id: 'audit-complete',
    name: 'Audit Complete',
    category: 'audits',
    description: 'Sent when a website audit is complete with results summary',
    trigger: 'Admin sends audit results to client',
    functionFile: 'audits-send-email.js',
    variables: [
      { name: '{{first_name}}', description: 'Recipient first name' },
      { name: '{{target_url}}', description: 'Website URL that was audited' },
      { name: '{{grade}}', description: 'Overall audit grade (A-F)' },
      { name: '{{performance_score}}', description: 'Performance score (0-100)' },
      { name: '{{seo_score}}', description: 'SEO score (0-100)' },
      { name: '{{accessibility_score}}', description: 'Accessibility score (0-100)' },
      { name: '{{security_score}}', description: 'Security score (0-100)' },
      { name: '{{magic_link}}', description: 'Link to view full audit report' },
      { name: '{{personalized_message}}', description: 'AI-generated personalized message' }
    ],
    defaultSubject: '{{first_name}}, Your Website Audit is Ready - Grade: {{grade}}',
    editable: true,
    hasAiPersonalization: true
  },

  // ============================================
  // BILLING EMAILS
  // ============================================
  {
    id: 'invoice-sent',
    name: 'Invoice Sent',
    category: 'billing',
    description: 'Sent when a new invoice is created and sent to client',
    trigger: 'Admin sends an invoice',
    functionFile: 'invoices-send.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{invoice_number}}', description: 'Invoice number' },
      { name: '{{amount}}', description: 'Invoice amount' },
      { name: '{{due_date}}', description: 'Payment due date' },
      { name: '{{payment_link}}', description: 'Link to pay invoice' },
      { name: '{{line_items}}', description: 'Invoice line items (HTML table)' }
    ],
    defaultSubject: 'Invoice #{{invoice_number}} from Uptrade Media',
    editable: true
  },
  {
    id: 'invoice-reminder',
    name: 'Invoice Reminder',
    category: 'billing',
    description: 'Reminder for unpaid invoices',
    trigger: 'Automated reminder or manual send',
    functionFile: 'invoices-reminder.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{invoice_number}}', description: 'Invoice number' },
      { name: '{{amount}}', description: 'Invoice amount' },
      { name: '{{due_date}}', description: 'Payment due date' },
      { name: '{{days_overdue}}', description: 'Days past due date' },
      { name: '{{payment_link}}', description: 'Link to pay invoice' }
    ],
    defaultSubject: 'Reminder: Invoice #{{invoice_number}} is due',
    editable: true
  },
  {
    id: 'payment-received',
    name: 'Payment Received',
    category: 'billing',
    description: 'Confirmation when a payment is successfully processed',
    trigger: 'Payment webhook from Square',
    functionFile: 'invoices-webhook.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{invoice_number}}', description: 'Invoice number' },
      { name: '{{amount}}', description: 'Amount paid' },
      { name: '{{payment_method}}', description: 'Payment method used' },
      { name: '{{payment_date}}', description: 'Date of payment' }
    ],
    defaultSubject: 'Payment received - Invoice #{{invoice_number}}',
    editable: true
  },

  // ============================================
  // PROPOSAL EMAILS
  // ============================================
  {
    id: 'proposal-sent',
    name: 'Proposal Sent',
    category: 'proposals',
    description: 'Notification when a proposal is shared with a client',
    trigger: 'Admin sends proposal to client',
    functionFile: 'proposals-send.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{proposal_title}}', description: 'Title of the proposal' },
      { name: '{{total_amount}}', description: 'Total proposal amount' },
      { name: '{{view_link}}', description: 'Link to view proposal' },
      { name: '{{expires_at}}', description: 'Proposal expiration date' }
    ],
    defaultSubject: 'New proposal from Uptrade Media: {{proposal_title}}',
    editable: true
  },
  {
    id: 'proposal-accepted',
    name: 'Proposal Accepted',
    category: 'proposals',
    description: 'Confirmation when a client accepts a proposal',
    trigger: 'Client accepts and signs proposal',
    functionFile: 'proposals-accept.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{proposal_title}}', description: 'Title of the proposal' },
      { name: '{{signed_at}}', description: 'Date/time of signature' },
      { name: '{{project_link}}', description: 'Link to new project' }
    ],
    defaultSubject: 'Proposal accepted: {{proposal_title}}',
    editable: true
  },
  {
    id: 'proposal-signature-request',
    name: 'Counter-Signature Request',
    category: 'proposals',
    description: 'Sent to admin when client signs, requesting counter-signature',
    trigger: 'Client signs proposal',
    functionFile: 'proposals-sign.js',
    variables: [
      { name: '{{client_name}}', description: 'Client who signed' },
      { name: '{{proposal_title}}', description: 'Title of the proposal' },
      { name: '{{signed_at}}', description: 'Date/time of client signature' },
      { name: '{{counter_sign_link}}', description: 'Link to counter-sign' }
    ],
    defaultSubject: 'Action required: Counter-sign {{proposal_title}}',
    editable: true,
    isInternal: true
  },

  // ============================================
  // PROJECT EMAILS
  // ============================================
  {
    id: 'project-created',
    name: 'Project Created',
    category: 'projects',
    description: 'Welcome email when a new project is created for client',
    trigger: 'New project created (usually from accepted proposal)',
    functionFile: 'projects-create.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{project_name}}', description: 'Name of the project' },
      { name: '{{project_link}}', description: 'Link to project dashboard' },
      { name: '{{start_date}}', description: 'Project start date' }
    ],
    defaultSubject: "Let's get started: {{project_name}}",
    editable: true
  },
  {
    id: 'milestone-complete',
    name: 'Milestone Complete',
    category: 'projects',
    description: 'Notification when a project milestone is completed',
    trigger: 'Admin marks milestone as complete',
    functionFile: 'project-milestones-update.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{project_name}}', description: 'Name of the project' },
      { name: '{{milestone_name}}', description: 'Completed milestone name' },
      { name: '{{next_milestone}}', description: 'Next milestone (if any)' },
      { name: '{{project_link}}', description: 'Link to project dashboard' }
    ],
    defaultSubject: 'Milestone complete: {{milestone_name}}',
    editable: true
  },
  {
    id: 'project-complete',
    name: 'Project Complete',
    category: 'projects',
    description: 'Celebration email when project is marked complete',
    trigger: 'Admin marks project as complete',
    functionFile: 'projects-complete.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{project_name}}', description: 'Name of the project' },
      { name: '{{completed_date}}', description: 'Project completion date' },
      { name: '{{review_link}}', description: 'Link to leave a review' }
    ],
    defaultSubject: '🎉 Project complete: {{project_name}}',
    editable: true
  },

  // ============================================
  // NOTIFICATION EMAILS
  // ============================================
  {
    id: 'new-message',
    name: 'New Message',
    category: 'notifications',
    description: 'Notification when client receives a new message',
    trigger: 'Admin sends message to client',
    functionFile: 'messages-send.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{sender_name}}', description: 'Name of message sender' },
      { name: '{{message_preview}}', description: 'First 100 chars of message' },
      { name: '{{message_link}}', description: 'Link to view full message' }
    ],
    defaultSubject: 'New message from {{sender_name}}',
    editable: true
  },
  {
    id: 'file-shared',
    name: 'File Shared',
    category: 'notifications',
    description: 'Notification when a file is shared with client',
    trigger: 'Admin shares file with client',
    functionFile: 'drive-upload.js',
    variables: [
      { name: '{{first_name}}', description: 'Client first name' },
      { name: '{{file_name}}', description: 'Name of shared file' },
      { name: '{{shared_by}}', description: 'Name of person who shared' },
      { name: '{{download_link}}', description: 'Link to download file' }
    ],
    defaultSubject: '{{shared_by}} shared a file with you',
    editable: true
  }
]

/**
 * Get system emails by category
 */
export function getSystemEmailsByCategory(categoryId) {
  if (categoryId === 'all') return SYSTEM_EMAILS
  return SYSTEM_EMAILS.filter(email => email.category === categoryId)
}

/**
 * Get a single system email by ID
 */
export function getSystemEmailById(emailId) {
  return SYSTEM_EMAILS.find(email => email.id === emailId)
}

/**
 * Get all categories with email counts
 */
export function getSystemEmailCategories() {
  const categories = Object.values(SYSTEM_EMAIL_CATEGORIES).map(cat => ({
    ...cat,
    count: SYSTEM_EMAILS.filter(e => e.category === cat.id).length
  }))
  
  return [
    { id: 'all', name: 'All Emails', description: 'All system emails', icon: 'Mail', count: SYSTEM_EMAILS.length },
    ...categories
  ]
}

export default SYSTEM_EMAILS
