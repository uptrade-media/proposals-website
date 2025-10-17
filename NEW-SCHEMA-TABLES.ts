import { pgTable, uuid, text, timestamp, boolean, decimal, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

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
// RELATIONS
// ========================================
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

// Update existing relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [projects.contactId],
    references: [contacts.id]
  }),
  proposals: many(proposals),
  files: many(files),
  messages: many(messages),
  invoices: many(invoices),
  milestones: many(projectMilestones),
  members: many(projectMembers)
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
  activity: many(proposalActivity)
}))
