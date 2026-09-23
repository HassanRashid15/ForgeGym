-- Platform reviews / feedback (customer, admin gym-owner, trainer)
-- Safe to re-run

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  reviewer_role text NOT NULL CHECK (reviewer_role IN ('customer', 'admin', 'trainer')),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  review_type text NOT NULL DEFAULT 'general'
    CHECK (review_type IN ('general', 'service', 'facilities', 'trainer', 'staff', 'platform')),
  is_approved boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON public.reviews (user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_gym_owner_id
  ON public.reviews (gym_owner_id);

CREATE INDEX IF NOT EXISTS idx_reviews_approved
  ON public.reviews (is_approved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_featured
  ON public.reviews (is_featured, created_at DESC);

COMMENT ON TABLE public.reviews IS
  'Platform feedback from customers, gym owners (admin), and trainers — approved rows power homepage testimonials';

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view approved or own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own pending reviews" ON public.reviews;

-- Public + authenticated: approved reviews (homepage)
CREATE POLICY "Anyone can view approved reviews"
  ON public.reviews FOR SELECT
  USING (is_approved = true);

-- Authenticated: own reviews (pending or approved)
CREATE POLICY "Users can view own reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_approved = false)
  WITH CHECK (auth.uid() = user_id);

-- Gym admins + super admins can moderate
CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.is_super_admin = true
    )
  );

CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.is_super_admin = true
    )
  );

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
