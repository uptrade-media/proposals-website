import { describe, it, expect, vi } from 'vitest'
import { findProject } from '../../netlify/functions/utils/projectLookup.js'

// Minimal supabase client stub for findProject
function createSupabaseStub() {
  const calls = []

  const resolver = (context) => {
    const { table, filters } = context

    if (table === 'organizations') {
      const domainFilter = filters.find(f => f.column === 'domain')
      if (domainFilter?.value === 'acme.com') {
        return { data: { id: 'org1' }, error: null }
      }
      return { data: null, error: { code: 'PGRST116' } }
    }

    if (table === 'projects') {
      const idFilter = filters.find(f => f.column === 'id')
      if (idFilter) {
        if (idFilter.value === 'p-123') {
          return { data: { id: 'p-123', title: 'Direct Project', org_id: 'org-direct' }, error: null }
        }
        return { data: null, error: { code: 'PGRST116' } }
      }

      const orgFilter = filters.find(f => f.column === 'org_id')
      if (orgFilter?.value === 'org1') {
        return { data: { id: 'proj-org1', title: 'Org Project', org_id: 'org1' }, error: null }
      }
      return { data: null, error: { code: 'PGRST116' } }
    }

    return { data: null, error: { code: 'PGRST116' } }
  }

  const supabase = {
    calls,
    from(table) {
      const context = { table, filters: [], select: null }

      const chain = {
        select(selection) {
          context.select = selection
          return chain
        },
        eq(column, value) {
          context.filters.push({ column, value })
          return chain
        },
        order(...args) {
          context.order = args
          return chain
        },
        limit(value) {
          context.limit = value
          return chain
        },
        single: vi.fn(async () => {
          calls.push(context)
          return resolver(context)
        })
      }

      return chain
    }
  }

  return supabase
}

describe('findProject', () => {
  it('returns project via domain fallback', async () => {
    const supabase = createSupabaseStub()

    const result = await findProject({ supabase, domain: 'acme.com' })

    expect(result.org?.id).toBe('org1')
    expect(result.project?.id).toBe('proj-org1')
    expect(supabase.calls.map(c => c.table)).toEqual(['organizations', 'projects'])
  })

  it('returns null when domain not found', async () => {
    const supabase = createSupabaseStub()

    const result = await findProject({ supabase, domain: 'missing.com' })

    expect(result.org).toBeNull()
    expect(result.project).toBeNull()
    expect(supabase.calls.map(c => c.table)).toEqual(['organizations'])
  })

  it('returns project by id when provided', async () => {
    const supabase = createSupabaseStub()

    const result = await findProject({ supabase, projectId: 'p-123' })

    expect(result.project?.id).toBe('p-123')
    expect(result.project?.org_id).toBe('org-direct')
    expect(supabase.calls.map(c => c.table)).toEqual(['projects'])
  })
})
