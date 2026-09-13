-- Gym media storage bucket for images and videos
-- Database columns for gym main image, optional images, and video URLs

-- Add columns to profiles table for gym media
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gym_main_image_url TEXT,
  ADD COLUMN IF NOT EXISTS gym_optional_images_urls TEXT[],
  ADD COLUMN IF NOT EXISTS gym_video_url TEXT,
  ADD COLUMN IF NOT EXISTS gym_video_file_url TEXT;

-- Public bucket for gym media (images and videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gym-media',
  'gym-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read policy for gym media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Gym media public read'
  ) THEN
    CREATE POLICY "Gym media public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'gym-media');
  END IF;
END $$;

-- Authenticated users manage files in their own folder: gym-media/{userId}/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Gym media owner upload'
  ) THEN
    CREATE POLICY "Gym media owner upload"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'gym-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Gym media owner update'
  ) THEN
    CREATE POLICY "Gym media owner update"
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'gym-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Gym media owner delete'
  ) THEN
    CREATE POLICY "Gym media owner delete"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'gym-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
