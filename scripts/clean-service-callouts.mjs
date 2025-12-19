import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get the GWA posts
const { data, error } = await supabase
  .from('blog_posts')
  .select('id, content')
  .eq('org_id', '9a05474b-7a6e-432b-a41a-1ba2a6b11600');

if (error || !data || data.length === 0) {
  console.error('Error:', error);
  process.exit(1);
}

// Strip SERVICE_CALLOUT comments from each post
for (const post of data) {
  const updatedContent = post.content.replace(/<!--\s*SERVICE_CALLOUT[^>]*-->/g, '').trim();
  
  const { error: updateError } = await supabase
    .from('blog_posts')
    .update({ content: updatedContent })
    .eq('id', post.id);
  
  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('Cleaned SERVICE_CALLOUT comments from post:', post.id);
  }
}

console.log('Done!');
