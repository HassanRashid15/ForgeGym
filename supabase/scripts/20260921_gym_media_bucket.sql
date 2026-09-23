-- Public storage bucket for gym photos/videos + promotion images
-- Paths used by the app:
--   {userId}/{kind}-{timestamp}.{ext}     — gym owner media
--   promotions/{userId}/{timestamp}.{ext} — super-admin promo images
-- Safe to re-run

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gym-media',
  'gym-media',
  true,
  52428800, -- 50MB (videos); images are capped to 5MB in app code
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read (homepage / gym cards / promo cards use getPublicUrl)
DROP POLICY IF EXISTS "Public read gym-media" ON storage.objects;
CREATE POLICY "Public read gym-media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'gym-media');

-- Authenticated users manage files under their own userId folder
DROP POLICY IF EXISTS "Users upload own gym-media" ON storage.objects;
CREATE POLICY "Users upload own gym-media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gym-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own gym-media" ON storage.objects;
CREATE POLICY "Users update own gym-media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'gym-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'gym-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own gym-media" ON storage.objects;
CREATE POLICY "Users delete own gym-media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gym-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Super admins upload promo images at promotions/{userId}/...
-- (also works via service role which bypasses RLS)
DROP POLICY IF EXISTS "Super admin upload promotions media" ON storage.objects;
CREATE POLICY "Super admin upload promotions media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gym-media'
    AND (storage.foldername(name))[1] = 'promotions'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.is_super_admin = true
          OR lower(coalesce(p.email, '')) = 'superadmin@forge.test'
        )
    )
  );

DROP POLICY IF EXISTS "Super admin update promotions media" ON storage.objects;
CREATE POLICY "Super admin update promotions media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'gym-media'
    AND (storage.foldername(name))[1] = 'promotions'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.is_super_admin = true
          OR lower(coalesce(p.email, '')) = 'superadmin@forge.test'
        )
    )
  )
  WITH CHECK (
    bucket_id = 'gym-media'
    AND (storage.foldername(name))[1] = 'promotions'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Super admin delete promotions media" ON storage.objects;
CREATE POLICY "Super admin delete promotions media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gym-media'
    AND (storage.foldername(name))[1] = 'promotions'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.is_super_admin = true
          OR lower(coalesce(p.email, '')) = 'superadmin@forge.test'
        )
    )
  );
