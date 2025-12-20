import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://mwcjtnoqxolplwpkxnfe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GWA IDs from .env.local
const ORG_ID = '9a05474b-7a6e-432b-a41a-1ba2a6b11600';
const PROJECT_ID = 'e0f443de-6ea8-4200-9e9b-afa000348fe7';

console.log('Checking GWA data in Portal database...\n');

// 1. Check Organization
const { data: org, error: orgErr } = await supabase
  .from('organizations')
  .select('*')
  .eq('id', ORG_ID)
  .single();

if (orgErr) {
  console.log('❌ Organization NOT FOUND:', orgErr.message);
} else {
  console.log('✅ Organization:', org.name);
  console.log('   slug:', org.slug);
  console.log('   org_type:', org.org_type);
  console.log('   features:', org.features);
}

// 2. Check Project
const { data: project, error: projErr } = await supabase
  .from('projects')
  .select('*')
  .eq('id', PROJECT_ID)
  .single();

if (projErr) {
  console.log('\n❌ Project NOT FOUND:', projErr.message);
} else {
  console.log('\n✅ Project:', project.name);
  console.log('   slug:', project.slug);
  console.log('   organization_id:', project.organization_id);
  console.log('   tenant_features:', project.tenant_features);
}

// 3. Check Shopify Stores (use org_id, not organization_id)
const { data: stores } = await supabase
  .from('shopify_stores')
  .select('*')
  .or(`org_id.eq.${ORG_ID},project_id.eq.${PROJECT_ID}`);

console.log('\n📦 Shopify Stores:', stores?.length || 0);
if (stores?.length) {
  stores.forEach(s => console.log('   -', s.shop_domain, '| org_id:', s.org_id, '| project:', s.project_id));
}

// 4. Check Blog Posts
const { data: posts } = await supabase
  .from('blog_posts')
  .select('id, title, status, org_id, project_id')
  .or(`org_id.eq.${ORG_ID},project_id.eq.${PROJECT_ID}`)
  .limit(5);

console.log('\n📝 Blog Posts:', posts?.length || 0);
if (posts?.length) {
  posts.forEach(p => console.log('   -', p.title, `(${p.status})`));
}

// 5. Check Team Members
const { data: userOrgs } = await supabase
  .from('user_organizations')
  .select(`
    user_email,
    role,
    organization:organizations(name)
  `)
  .eq('organization_id', ORG_ID);

console.log('\n👥 Team Members for GWA org:', userOrgs?.length || 0);
if (userOrgs?.length) {
  userOrgs.forEach(u => console.log('   -', u.user_email, '|', u.role));
}

// 6. Check Invoices
const { data: invoices } = await supabase
  .from('invoices')
  .select('id, invoice_number, status, total_amount, organization_id, project_id')
  .or(`organization_id.eq.${ORG_ID},project_id.eq.${PROJECT_ID}`)
  .limit(5);

console.log('\n💰 Invoices:', invoices?.length || 0);
if (invoices?.length) {
  invoices.forEach(i => console.log('   -', i.invoice_number, '| $' + (i.total_amount/100), '|', i.status));
}

// 7. Check Proposals
const { data: proposals } = await supabase
  .from('proposals')
  .select('id, title, status, organization_id, project_id')
  .or(`organization_id.eq.${ORG_ID},project_id.eq.${PROJECT_ID}`)
  .limit(5);

console.log('\n📋 Proposals:', proposals?.length || 0);
if (proposals?.length) {
  proposals.forEach(p => console.log('   -', p.title, '|', p.status));
}

console.log('\n✅ Done checking GWA data');
