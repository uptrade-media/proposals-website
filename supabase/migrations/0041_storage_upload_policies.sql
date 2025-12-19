-- Migration: Storage Upload Policies
-- Allow uploads to the uploads bucket for blog images

-- Conditionally create: Allow anyone to upload to blog-images folder in uploads bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Allow public uploads to blog-images'
  ) THEN
    CREATE POLICY "Allow public uploads to blog-images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'uploads' 
      AND (storage.foldername(name))[1] = 'blog-images'
    );
  END IF;
END$$;

-- Conditionally create: Allow public read from uploads bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Allow public read from uploads'
  ) THEN
    CREATE POLICY "Allow public read from uploads"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'uploads');
  END IF;
END$$;

-- Conditionally create: Allow delete from blog-images folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Allow public delete from blog-images'
  ) THEN
    CREATE POLICY "Allow public delete from blog-images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'uploads' 
      AND (storage.foldername(name))[1] = 'blog-images'
    );
  END IF;
END$$;
