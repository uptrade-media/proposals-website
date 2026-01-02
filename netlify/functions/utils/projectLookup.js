// Shared project lookup helper for Engage functions
// Looks up a project by projectId, slug, or tenant domain (org.domain)

/**
 * Find a project by ID, slug, or organization domain.
 * @param {object} params
 * @param {object} params.supabase - Supabase client instance
 * @param {string|number} [params.projectId]
 * @param {string} [params.slug]
 * @param {string} [params.domain]
 * @param {string} [params.select='id, title, org_id'] - Column selection for projects
 * @returns {Promise<{ project: object|null, org: object|null }>} project/org results (null if not found)
 */
export async function findProject({ supabase, projectId, slug, domain, select = 'id, title, org_id' }) {
  if (!supabase) throw new Error('Supabase client is required for findProject')

  let project = null
  let org = null

  if (projectId) {
    const { data, error } = await supabase
      .from('projects')
      .select(select)
      .eq('id', projectId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    project = data || null
  } else if (slug) {
    const { data, error } = await supabase
      .from('projects')
      .select(select)
      .eq('slug', slug)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    project = data || null
  } else if (domain) {
    const { data: orgResult, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('domain', domain)
      .single()

    if (orgError && orgError.code !== 'PGRST116') throw orgError
    org = orgResult || null

    if (org) {
      const { data, error } = await supabase
        .from('projects')
        .select(select)
        .eq('org_id', org.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      project = data || null
    }
  }

  return { project, org }
}
