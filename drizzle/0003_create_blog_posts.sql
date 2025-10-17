-- Migration: Add blog_posts table
-- Run this in Neon dashboard to set up blog functionality

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT NOT NULL, -- 'design', 'marketing', 'media', 'news'
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown content
  content_html TEXT, -- Pre-rendered HTML
  featured_image TEXT NOT NULL,
  featured_image_alt TEXT,
  author TEXT DEFAULT 'Uptrade Media',
  author_avatar TEXT,
  keywords TEXT, -- JSON array as string
  reading_time INTEGER DEFAULT 5,
  meta_title TEXT,
  meta_description TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  featured BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(featured);
