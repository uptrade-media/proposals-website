import { pgTable, uuid, text, timestamp, boolean, decimal, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ========================================
// CONTACTS (Users)
// ========================================
export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  company: text('company'),
  role: text('role').default('client'), // 'client' or 'admin'
  accountSetup: text('account_setup').default('false'), // Using text for boolean
  googleId: text('google_id'),
  avatar: text('avatar'),
  password: text('password'),
  lastLogin: timestamp('last_login'),
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
  mdxContent: text('mdx_content').notNull(),
  status: text('status').default('draft'), // draft, sent, viewed, signed, accepted, declined
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  validUntil: timestamp('valid_until'),
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
// RELATIONS
// ========================================
export const contactsRelations = relations(contacts, ({ many }) => ({
  projects: many(projects),
  proposals: many(proposals),
  files: many(files),
  messagesSent: many(messages, { relationName: 'sender' }),
  messagesReceived: many(messages, { relationName: 'recipient' }),
  invoices: many(invoices)
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [projects.contactId],
    references: [contacts.id]
  }),
  proposals: many(proposals),
  files: many(files),
  messages: many(messages),
  invoices: many(invoices)
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
