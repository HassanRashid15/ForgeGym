-- Remove superadmin@forge.test email backdoor from gym-media promotion policies.
-- Super-admin access to promotions/{userId}/... is now granted solely via
-- profiles.is_super_admin (same gate used by the API layer).

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
        AND p.is_super_admin = true
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
        AND p.is_super_admin = true
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
        AND p.is_super_admin = true
    )
  );
