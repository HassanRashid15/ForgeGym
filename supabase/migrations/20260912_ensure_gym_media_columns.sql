-- Ensure gym-media bucket exists (idempotent) + service uploads work for signup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gym-media',
  'gym-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gym_main_image_url TEXT,
  ADD COLUMN IF NOT EXISTS gym_optional_images_urls TEXT[],
  ADD COLUMN IF NOT EXISTS gym_video_url TEXT,
  ADD COLUMN IF NOT EXISTS gym_video_file_url TEXT;
