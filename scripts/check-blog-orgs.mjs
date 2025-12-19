import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://mwcjtnoqxolplwpkxnfe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('blog_posts')
  .select('id, title, org_id, status');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Total posts:', data.length);
console.log('');

// Group by org_id
const byOrg = {};
data.forEach(post => {
  const key = post.org_id || 'NULL';
  if (!byOrg[key]) byOrg[key] = [];
  byOrg[key].push({ title: post.title, status: post.status });
});

Object.entries(byOrg).forEach(([orgId, posts]) => {
  console.log('org_id:', orgId, '- Count:', posts.length);
  posts.forEach(p => console.log('  -', p.title, `(${p.status})`));
  console.log('');
});
