import { pgTable, uuid, text, timestamp, boolean, decimal, integer, jsonb } from 'drizzle-orm/pg-core'
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
  updatedAt: timestamp('updated_at').defaultNow(),
  // OpenPhone CRM fields
  openphoneContactId: text('openphone_contact_id'),
  firstCallDate: timestamp('first_call_date'),
  lastCallDate: timestamp('last_call_date'),
  totalCalls: integer('total_calls').default(0),
  totalCallDuration: integer('total_call_duration').default(0),
  averageCallDuration: integer('average_call_duration'),
  lastCallSentiment: text('last_call_sentiment'),
  // Pipeline/CRM
  pipelineStage: text('pipeline_stage'), // new_lead, contacted, qualified, proposal, negotiation, won, lost
  // Auth fields
  magicLinkToken: text('magic_link_token'),
  magicLinkExpires: timestamp('magic_link_expires'),
  accountSetup: text('account_setup').default('false'), // 'true' or 'false'
  avatar: text('avatar'),
  googleId: text('google_id')
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
  description: text('description'),
  mdxContent: text('mdx_content').notNull(),
  status: text('status').default('draft'), // draft, sent, viewed, signed, accepted, declined
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  timeline: text('timeline'), // Project timeline (e.g., "6 weeks")
  paymentTerms: text('payment_terms'), // Payment terms (e.g., "100% upfront", "50/50")
  version: integer('version').default(1),
  validUntil: timestamp('valid_until'),
  sentAt: timestamp('sent_at'),
  viewedAt: timestamp('viewed_at'),
  clientEmail: text('client_email'),
  heroImageUrl: text('hero_image_url'), // Hero image URL for proposal display
  // Client signature fields
  clientSignatureUrl: text('client_signature_url'), // URL to signature image in Netlify Blobs
  clientSignedBy: text('client_signed_by'), // Printed name entered when signing
  clientSignedAt: timestamp('client_signed_at'),
  // Admin counter-signature fields
  adminSignatureUrl: text('admin_signature_url'),
  adminSignedBy: text('admin_signed_by'),
  adminSignedAt: timestamp('admin_signed_at'),
  // Counter-sign magic link
  counterSignToken: text('counter_sign_token'),
  counterSignTokenExpires: timestamp('counter_sign_token_expires'),
  // Legacy fields (keeping for compatibility)
  signedAt: timestamp('signed_at'),
  fullyExecutedAt: timestamp('fully_executed_at'),
  metadata: jsonb('metadata').default({}), // For AI edit tracking and other dynamic data
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
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type'),
  fileSize: integer('file_size'),
  category: text('category'),
  isPublic: boolean('is_public').default(false),
  uploadedBy: uuid('uploaded_by').references(() => contacts.id),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  storageType: text('storage_type').default('supabase') // 'supabase' or 'netlify-blobs'
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
  parentId: uuid('parent_id'),
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
  status: text('status').default('draft'), // draft, sent, paid, overdue, cancelled
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  squareInvoiceId: text('square_invoice_id'),
  squarePaymentId: text('square_payment_id'),
  lineItems: text('line_items'), // JSON
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// AUDITS (Website Performance Audits)
// ========================================
export const audits = pgTable('audits', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  targetUrl: text('target_url').notNull(),
  status: text('status').default('pending'), // pending, running, completed, failed
  errorMessage: text('error_message'),
  // Lighthouse scores (0-100)
  performanceScore: integer('performance_score'),
  accessibilityScore: integer('accessibility_score'),
  bestPracticesScore: integer('best_practices_score'),
  seoScore: integer('seo_score'),
  pwaScore: integer('pwa_score'),
  // Core Web Vitals
  lcpMs: integer('lcp_ms'), // Largest Contentful Paint
  fidMs: integer('fid_ms'), // First Input Delay
  clsScore: decimal('cls_score', { precision: 6, scale: 4 }), // Cumulative Layout Shift
  fcpMs: integer('fcp_ms'), // First Contentful Paint
  ttiMs: integer('tti_ms'), // Time to Interactive
  tbtMs: integer('tbt_ms'), // Total Blocking Time
  speedIndexMs: integer('speed_index_ms'),
  // Full audit data
  fullAuditJson: text('full_audit_json'), // Complete PageSpeed JSON
  reportStoragePath: text('report_storage_path'), // Netlify Blobs path
  // Configuration
  deviceType: text('device_type').default('mobile'), // mobile, desktop
  throttlingProfile: text('throttling_profile').default('mobile4G'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
  // Magic link for public access
  magicToken: text('magic_token'),
  magicTokenExpires: timestamp('magic_token_expires'),
  // Additional scores
  scoreSecurity: integer('score_security'),
  scoreOverall: integer('score_overall'),
  htmlReport: text('html_report'),
  summary: text('summary') // JSON summary object
})

// ========================================
// CAMPAIGNS (Email/Marketing)
// ========================================
export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: text('type'), // email, sms, etc.
  status: text('status').default('draft'),
  subject: text('subject'),
  content: text('content'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// BLOG POSTS
// ========================================
export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  category: text('category'),
  excerpt: text('excerpt'),
  content: text('content'), // Markdown/MDX content
  contentHtml: text('content_html'), // Rendered HTML
  featuredImage: text('featured_image'),
  featuredImageAlt: text('featured_image_alt'),
  author: text('author'),
  authorAvatar: text('author_avatar'),
  keywords: text('keywords'), // JSON array
  readingTime: integer('reading_time'),
  // SEO fields
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  ogTitle: text('og_title'),
  ogDescription: text('og_description'),
  focusKeyphrase: text('focus_keyphrase'),
  internalLinks: text('internal_links'), // JSON array
  schemaMarkup: text('schema_markup'), // JSON-LD
  canonicalUrl: text('canonical_url'),
  // Content enhancements
  tableOfContents: text('table_of_contents'), // JSON
  faqItems: text('faq_items'), // JSON array
  serviceCallouts: text('service_callouts'), // JSON array
  targetAudience: text('target_audience'),
  estimatedValue: decimal('estimated_value', { precision: 10, scale: 2 }),
  // Status
  status: text('status').default('draft'), // draft, published, archived
  featured: boolean('featured').default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// PORTFOLIO ITEMS
// ========================================
export const portfolioItems = pgTable('portfolio_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  category: text('category'),
  services: jsonb('services'), // JSON array of services
  description: text('description'),
  // Media
  heroImage: text('hero_image'),
  heroImageAlt: text('hero_image_alt'),
  heroImageWidth: integer('hero_image_width'),
  heroImageHeight: integer('hero_image_height'),
  gallery: jsonb('gallery'), // JSON array of images
  video: text('video'),
  // Links
  liveUrl: text('live_url'),
  // Content sections (all JSON)
  kpis: jsonb('kpis'),
  strategicApproach: jsonb('strategic_approach'),
  servicesShowcase: jsonb('services_showcase'),
  comprehensiveResults: jsonb('comprehensive_results'),
  technicalInnovations: jsonb('technical_innovations'),
  challenges: jsonb('challenges'),
  testimonial: jsonb('testimonial'),
  team: jsonb('team'),
  technologies: jsonb('technologies'),
  details: jsonb('details'),
  seo: jsonb('seo'),
  // Content
  content: text('content'), // Markdown
  contentHtml: text('content_html'), // Rendered HTML
  // SEO
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  // Status
  status: text('status').default('draft'),
  featured: boolean('featured').default(false),
  order: integer('order').default(0),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// ========================================
// RELATIONS
// ========================================

export const contactsRelations = relations(contacts, ({ many }) => ({
  projects: many(projects),
  proposals: many(proposals),
  files: many(files),
  sentMessages: many(messages, { relationName: 'sender' }),
  receivedMessages: many(messages, { relationName: 'recipient' }),
  invoices: many(invoices),
  audits: many(audits)
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
  audits: many(audits),
  portfolioItems: many(portfolioItems)
}))

export const proposalsRelations = relations(proposals, ({ one }) => ({
  contact: one(contacts, {
    fields: [proposals.contactId],
    references: [contacts.id]
  }),
  project: one(projects, {
    fields: [proposals.projectId],
    references: [projects.id]
  })
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

export const auditsRelations = relations(audits, ({ one }) => ({
  contact: one(contacts, {
    fields: [audits.contactId],
    references: [contacts.id]
  }),
  project: one(projects, {
    fields: [audits.projectId],
    references: [projects.id]
  })
}))

export const portfolioItemsRelations = relations(portfolioItems, ({ one }) => ({
  project: one(projects, {
    fields: [portfolioItems.projectId],
    references: [projects.id]
  })
}))

