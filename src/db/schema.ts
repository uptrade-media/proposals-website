import { pgTable, uuid, text, timestamp, boolean, decimal, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ========================================
// CONTACTS (User Profiles)
// ========================================
// This table extends Supabase auth.users with business-specific fields
// auth_user_id references auth.users(id) managed by Supabase Auth
export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authUserId: uuid('auth_user_id').unique(), // References auth.users(id) - null for pre-migration users
  email: text('email').notNull().unique(),
  name: text('name'),
  company: text('company'),
  phone: text('phone'),
  website: text('website'), // Client's business website URL
  role: text('role').default('client'), // 'client' or 'admin'
  subscribed: boolean('subscribed').default(true), // Newsletter subscription
  notes: text('notes'), // Internal notes
  tags: text('tags'), // JSON array of tags
  source: text('source'), // How they found us
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// PROJECTS
// ========================================
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('planning'), // planning, active, on-hold, completed
  budget: decimal('budget', { precision: 10, scale: 2 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// PROPOSALS
// ========================================
export const proposals = pgTable('proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'), // NEW: Short description
  mdxContent: text('mdx_content').notNull(),
  status: text('status').default('draft'), // draft, sent, viewed, signed, accepted, declined
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  version: integer('version').default(1), // NEW: Track versions
  validUntil: timestamp('valid_until'),
  sentAt: timestamp('sent_at'), // NEW: When sent to client
  viewedAt: timestamp('viewed_at'), // NEW: When client first viewed
  clientEmail: text('client_email'), // NEW: Recipient email
  signedAt: timestamp('signed_at'),
  adminSignedAt: timestamp('admin_signed_at'),
  fullyExecutedAt: timestamp('fully_executed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// FILES
// ========================================
export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  blobPath: text('blob_path').notNull(), // Netlify Blobs storage path
  mimeType: text('mime_type'),
  fileSize: integer('file_size'), // bytes
  category: text('category'), // document, image, contract, invoice, etc.
  isPublic: boolean('is_public').default(false),
  uploadedBy: uuid('uploaded_by').references(() => contacts.id),
  uploadedAt: timestamp('uploaded_at').defaultNow()
})

// ========================================
// MESSAGES
// ========================================
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  senderId: uuid('sender_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  subject: text('subject'),
  content: text('content').notNull(),
  parentId: uuid('parent_id'), // For reply threads
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow()
})

// ========================================
// INVOICES
// ========================================
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  squareInvoiceId: text('square_invoice_id'), // Square API reference
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  taxAmount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').default('pending'), // pending, sent, paid, overdue, cancelled
  description: text('description'),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// PROJECT MILESTONES
// ========================================
export const projectMilestones = pgTable('project_milestones', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('pending'), // pending, in-progress, completed, blocked
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// PROJECT TEAM MEMBERS
// ========================================
export const projectMembers = pgTable('project_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  role: text('role').default('member'), // lead, member, viewer
  joinedAt: timestamp('joined_at').defaultNow()
})

// ========================================
// PROPOSAL TEMPLATES
// ========================================
export const proposalTemplates = pgTable('proposal_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdBy: uuid('created_by').references(() => contacts.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  mdxContent: text('mdx_content').notNull(),
  category: text('category'), // web-design, seo, branding, consulting, development
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// PROPOSAL ACTIVITY LOG
// ========================================
export const proposalActivity = pgTable('proposal_activity', {
  id: uuid('id').defaultRandom().primaryKey(),
  proposalId: uuid('proposal_id').notNull().references(() => proposals.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // created, sent, viewed, signed, accepted, declined, reopened, updated
  performedBy: uuid('performed_by').references(() => contacts.id, { onDelete: 'set null' }),
  metadata: text('metadata'), // JSON: {ipAddress, userAgent, viewDuration, etc}
  createdAt: timestamp('created_at').defaultNow()
})

// ========================================
// BLOG POSTS
// ========================================
export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  category: text('category').notNull(), // 'design', 'marketing', 'media', 'news'
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(), // Markdown
  contentHtml: text('content_html'), // Pre-rendered HTML
  featuredImage: text('featured_image').notNull(),
  featuredImageAlt: text('featured_image_alt'),
  author: text('author').default('Uptrade Media'),
  authorAvatar: text('author_avatar'),
  keywords: text('keywords'), // JSON array as string
  readingTime: integer('reading_time').default(5),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  ogTitle: text('og_title'), // Open Graph title for social media
  ogDescription: text('og_description'), // Open Graph description
  focusKeyphrase: text('focus_keyphrase'), // Primary SEO keyphrase
  internalLinks: text('internal_links'), // JSON array of suggested internal links
  schemaMarkup: text('schema_markup'), // JSON-LD schema.org markup
  status: text('status').default('draft'), // 'draft', 'published', 'archived'
  featured: boolean('featured').default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// AUDITS (Lighthouse Performance Audits)
// ========================================
export const audits = pgTable('audits', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  targetUrl: text('target_url').notNull(),
  status: text('status').default('pending'), // pending, running, completed, failed
  errorMessage: text('error_message'),
  
  // Lighthouse scores (0-100)
  performanceScore: integer('performance_score'),
  accessibilityScore: integer('accessibility_score'),
  bestPracticesScore: integer('best_practices_score'),
  seoScore: integer('seo_score'),
  pwascore: integer('pwa_score'),
  
  // Core Web Vitals
  lcpMs: decimal('lcp_ms', { precision: 8, scale: 2 }), // Largest Contentful Paint (milliseconds)
  fidMs: decimal('fid_ms', { precision: 8, scale: 2 }), // First Input Delay (milliseconds)
  clsScore: decimal('cls_score', { precision: 5, scale: 3 }), // Cumulative Layout Shift
  
  // First Contentful Paint
  fcpMs: decimal('fcp_ms', { precision: 8, scale: 2 }), // First Contentful Paint (milliseconds)
  
  // Time to Interactive
  ttiMs: decimal('tti_ms', { precision: 8, scale: 2 }), // Time to Interactive (milliseconds)
  
  // Total Blocking Time
  tbtMs: decimal('tbt_ms', { precision: 8, scale: 2 }), // Total Blocking Time (milliseconds)
  
  // Speed Index
  speedIndexMs: decimal('speed_index_ms', { precision: 8, scale: 2 }), // Speed Index (milliseconds)
  
  // Full audit data
  fullAuditJson: text('full_audit_json'), // Complete Lighthouse JSON
  reportUrl: text('report_url'), // URL to detailed HTML report in Netlify Blobs
  
  // Metadata
  deviceType: text('device_type').default('mobile'), // mobile or desktop
  throttlingProfile: text('throttling_profile').default('4g'), // Simulated network throttling
  
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// LIGHTHOUSE METRICS (Historical tracking for trends)
// ========================================
export const lighthouseMetrics = pgTable('lighthouse_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  auditId: uuid('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  
  metricName: text('metric_name').notNull(), // performance, accessibility, best_practices, seo, pwa, lcp, fid, cls, etc.
  score: integer('score'), // For scores out of 100
  value: decimal('value', { precision: 10, scale: 2 }), // For metrics like ms or unitless values
  unit: text('unit'), // ms, %, score, etc.
  threshold: text('threshold'), // good, needs_improvement, poor
  
  createdAt: timestamp('created_at').defaultNow()
})

// ========================================
// WEB VITALS (Continuous monitoring data)
// ========================================
export const webVitals = pgTable('web_vitals', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  targetUrl: text('target_url').notNull(),
  
  // Core Web Vitals
  lcp: decimal('lcp', { precision: 8, scale: 2 }), // Largest Contentful Paint (ms)
  fid: decimal('fid', { precision: 8, scale: 2 }), // First Input Delay (ms)
  cls: decimal('cls', { precision: 5, scale: 3 }), // Cumulative Layout Shift
  
  // Additional metrics
  ttfb: decimal('ttfb', { precision: 8, scale: 2 }), // Time to First Byte (ms)
  fcp: decimal('fcp', { precision: 8, scale: 2 }), // First Contentful Paint (ms)
  tti: decimal('tti', { precision: 8, scale: 2 }), // Time to Interactive (ms)
  
  // User segment
  deviceType: text('device_type'), // mobile, desktop
  connectionType: text('connection_type'), // 4g, 3g, etc.
  
  recordedAt: timestamp('recorded_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow()
})

// ========================================
// RELATIONS
// ========================================
export const contactsRelations = relations(contacts, ({ many }) => ({
  projects: many(projects),
  proposals: many(proposals),
  files: many(files),
  messagesSent: many(messages, { relationName: 'sender' }),
  messagesReceived: many(messages, { relationName: 'recipient' }),
  invoices: many(invoices),
  projectMembers: many(projectMembers), // NEW
  createdTemplates: many(proposalTemplates), // NEW
  proposalActivity: many(proposalActivity), // NEW
  audits: many(audits) // NEW
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [projects.contactId],
    references: [contacts.id]
  }),
  proposals: many(proposals),
  files: many(files),
  messages: many(messages),
  invoices: many(invoices),
  milestones: many(projectMilestones), // NEW
  members: many(projectMembers), // NEW
  audits: many(audits), // NEW
  lighthouseMetrics: many(lighthouseMetrics), // NEW
  webVitals: many(webVitals) // NEW
}))

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [proposals.contactId],
    references: [contacts.id]
  }),
  project: one(projects, {
    fields: [proposals.projectId],
    references: [projects.id]
  }),
  activity: many(proposalActivity) // NEW
}))

export const filesRelations = relations(files, ({ one }) => ({
  contact: one(contacts, {
    fields: [files.contactId],
    references: [contacts.id]
  }),
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id]
  }),
  uploader: one(contacts, {
    fields: [files.uploadedBy],
    references: [contacts.id]
  })
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(contacts, {
    fields: [messages.senderId],
    references: [contacts.id],
    relationName: 'sender'
  }),
  recipient: one(contacts, {
    fields: [messages.recipientId],
    references: [contacts.id],
    relationName: 'recipient'
  }),
  project: one(projects, {
    fields: [messages.projectId],
    references: [projects.id]
  }),
  parent: one(messages, {
    fields: [messages.parentId],
    references: [messages.id]
  })
}))

export const invoicesRelations = relations(invoices, ({ one }) => ({
  contact: one(contacts, {
    fields: [invoices.contactId],
    references: [contacts.id]
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id]
  })
}))

// NEW RELATIONS
export const projectMilestonesRelations = relations(projectMilestones, ({ one }) => ({
  project: one(projects, {
    fields: [projectMilestones.projectId],
    references: [projects.id]
  })
}))

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id]
  }),
  member: one(contacts, {
    fields: [projectMembers.memberId],
    references: [contacts.id]
  })
}))

export const proposalTemplatesRelations = relations(proposalTemplates, ({ one }) => ({
  creator: one(contacts, {
    fields: [proposalTemplates.createdBy],
    references: [contacts.id]
  })
}))

export const proposalActivityRelations = relations(proposalActivity, ({ one }) => ({
  proposal: one(proposals, {
    fields: [proposalActivity.proposalId],
    references: [proposals.id]
  }),
  performer: one(contacts, {
    fields: [proposalActivity.performedBy],
    references: [contacts.id]
  })
}))

// LIGHTHOUSE RELATIONS
export const auditsRelations = relations(audits, ({ one, many }) => ({
  project: one(projects, {
    fields: [audits.projectId],
    references: [projects.id]
  }),
  contact: one(contacts, {
    fields: [audits.contactId],
    references: [contacts.id]
  }),
  metrics: many(lighthouseMetrics)
}))

export const lighthouseMetricsRelations = relations(lighthouseMetrics, ({ one }) => ({
  audit: one(audits, {
    fields: [lighthouseMetrics.auditId],
    references: [audits.id]
  }),
  project: one(projects, {
    fields: [lighthouseMetrics.projectId],
    references: [projects.id]
  })
}))

export const webVitalsRelations = relations(webVitals, ({ one }) => ({
  project: one(projects, {
    fields: [webVitals.projectId],
    references: [projects.id]
  })
}))

// ========================================
// EMAIL CAMPAIGNS
// ========================================
export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(), // 'one_off', 'newsletter', 'drip'
  name: text('name').notNull(),
  mailboxId: uuid('mailbox_id'), // For future mailbox rotation feature
  status: text('status').default('draft'), // draft, scheduled, active, paused, completed, cancelled
  scheduledStart: timestamp('scheduled_start'),
  windowStartLocal: integer('window_start_local').default(9), // 9 AM local time
  windowEndLocal: integer('window_end_local').default(17), // 5 PM local time
  dailyCap: integer('daily_cap').default(100),
  warmupPercent: integer('warmup_percent').default(0), // 0-100
  goalUrl: text('goal_url'), // Track conversions
  daypartEnabled: boolean('daypart_enabled').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export const campaignSteps = pgTable('campaign_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  stepIndex: integer('step_index').notNull().default(0), // 0 for initial, 1+ for follow-ups
  delayDays: integer('delay_days').default(0), // Days after previous step
  subjectOverride: text('subject_override'), // Override campaign subject
  htmlOverride: text('html_override'), // Override campaign HTML
  createdAt: timestamp('created_at').defaultNow()
})

export const recipients = pgTable('recipients', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  stepIndex: integer('step_index').default(0), // Current step in sequence
  status: text('status').default('queued'), // queued, sent, opened, clicked, bounced, unsubscribed, failed
  unsubscribeToken: text('unsubscribe_token').notNull().unique(),
  sentAt: timestamp('sent_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  bouncedAt: timestamp('bounced_at'),
  unsubscribedAt: timestamp('unsubscribed_at'),
  createdAt: timestamp('created_at').defaultNow()
})

export const clientActivity = pgTable('client_activity', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  activityType: text('activity_type').notNull(), // email_campaign_created, email_sent, email_opened, etc.
  description: text('description'),
  metadata: text('metadata'), // JSON for additional data
  createdAt: timestamp('created_at').defaultNow()
})

// Campaign Relations
export const campaignsRelations = relations(campaigns, ({ many }) => ({
  steps: many(campaignSteps),
  recipients: many(recipients)
}))

export const campaignStepsRelations = relations(campaignSteps, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignSteps.campaignId],
    references: [campaigns.id]
  })
}))

export const recipientsRelations = relations(recipients, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [recipients.campaignId],
    references: [campaigns.id]
  }),
  contact: one(contacts, {
    fields: [recipients.contactId],
    references: [contacts.id]
  })
}))

export const clientActivityRelations = relations(clientActivity, ({ one }) => ({
  contact: one(contacts, {
    fields: [clientActivity.contactId],
    references: [contacts.id]
  })
}))

