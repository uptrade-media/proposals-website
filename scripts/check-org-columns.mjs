import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mwcjtnoqxolplwpkxnfe.supabase.co',
  'sb_secret_TVGEIKBh0f42LY-GJTmMCg_9xX7QhZ3'
);

// List of tables to check for organization_id column
const tables = [
  'organization_members',
  'organization_secrets', 
  'user_organizations',
  'proposals',
  'invoices',
  'contacts',
  'messages',
  'files',
  'blog_posts',
  'audits',
  'prospects',
  'seo_sites',
  'seo_pages',
  'analytics_page_views',
  'analytics_events',
  'engage_elements',
  'engage_chat_config',
  'signal_knowledge',
  'signal_conversations',
  'signal_faqs',
  'signal_memory',
  'signal_patterns'
];

async function checkTable(table) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (error) return { table, error: error.message };
  if (!data || data.length === 0) return { table, columns: '(empty table)' };
  const orgCols = Object.keys(data[0]).filter(c => 
    c.includes('org') || c.includes('organization') || c.includes('tenant') || c.includes('project_owner')
  );
  return { table, columns: orgCols };
}

async function main() {
  console.log('Checking tables for organization_id, org_id, and tenant columns...\n');
  for (const t of tables) {
    const result = await checkTable(t);
    if (result.error) {
      console.log(`${t}: ERROR - ${result.error}`);
    } else {
      console.log(`${t}: ${JSON.stringify(result.columns)}`);
    }
  }
}

main();
