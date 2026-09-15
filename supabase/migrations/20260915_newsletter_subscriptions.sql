-- Create newsletter subscriptions table
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  unsubscribe_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON public.newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_is_active ON public.newsletter_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_subscribed_at ON public.newsletter_subscriptions(subscribed_at DESC);

-- Enable Row Level Security
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public insert (newsletter signup doesn't require auth)
DROP POLICY IF EXISTS "Public can insert newsletter subscriptions" ON public.newsletter_subscriptions;
CREATE POLICY "Public can insert newsletter subscriptions"
  ON public.newsletter_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only superadmins can read all subscriptions
DROP POLICY IF EXISTS "Superadmins can read all newsletter subscriptions" ON public.newsletter_subscriptions;
CREATE POLICY "Superadmins can read all newsletter subscriptions"
  ON public.newsletter_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Policy: Only superadmins can update subscriptions
DROP POLICY IF EXISTS "Superadmins can update newsletter subscriptions" ON public.newsletter_subscriptions;
CREATE POLICY "Superadmins can update newsletter subscriptions"
  ON public.newsletter_subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Policy: Only superadmins can delete subscriptions
DROP POLICY IF EXISTS "Superadmins can delete newsletter subscriptions" ON public.newsletter_subscriptions;
CREATE POLICY "Superadmins can delete newsletter subscriptions"
  ON public.newsletter_subscriptions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_newsletter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS set_newsletter_updated_at ON public.newsletter_subscriptions;
CREATE TRIGGER set_newsletter_updated_at
  BEFORE UPDATE ON public.newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_newsletter_updated_at();

-- Function to handle newsletter subscription
CREATE OR REPLACE FUNCTION public.subscribe_to_newsletter(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
  v_subscription_id UUID;
  v_is_new BOOLEAN DEFAULT true;
BEGIN
  -- Check if email already exists and is active
  IF EXISTS (
    SELECT 1 FROM public.newsletter_subscriptions
    WHERE email = p_email AND is_active = true
  ) THEN
    -- Already subscribed
    RETURN jsonb_build_object(
      'success', true,
      'already_subscribed', true,
      'message', 'Email is already subscribed'
    );
  END IF;

  -- Check if email exists but was unsubscribed
  IF EXISTS (
    SELECT 1 FROM public.newsletter_subscriptions
    WHERE email = p_email AND is_active = false
  ) THEN
    -- Reactivate the subscription
    UPDATE public.newsletter_subscriptions
    SET 
      is_active = true,
      unsubscribed_at = NULL,
      unsubscribe_reason = NULL,
      subscribed_at = NOW()
    WHERE email = p_email
    RETURNING id INTO v_subscription_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'reactivated', true,
      'subscription_id', v_subscription_id,
      'message', 'Subscription reactivated successfully'
    );
  END IF;

  -- New subscription
  INSERT INTO public.newsletter_subscriptions (email)
  VALUES (p_email)
  RETURNING id INTO v_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_subscription', true,
    'subscription_id', v_subscription_id,
    'message', 'Subscribed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to public (for newsletter signup)
GRANT EXECUTE ON FUNCTION public.subscribe_to_newsletter TO anon;

-- Function to handle newsletter unsubscription
CREATE OR REPLACE FUNCTION public.unsubscribe_from_newsletter(p_email TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- Check if email exists and is active
  SELECT id INTO v_subscription_id
  FROM public.newsletter_subscriptions
  WHERE email = p_email AND is_active = true;

  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active subscription found for this email'
    );
  END IF;

  -- Unsubscribe
  UPDATE public.newsletter_subscriptions
  SET 
    is_active = false,
    unsubscribed_at = NOW(),
    unsubscribe_reason = p_reason
  WHERE id = v_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'message', 'Unsubscribed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.unsubscribe_from_newsletter TO authenticated;

-- Function to get all newsletter subscriptions (for superadmin)
CREATE OR REPLACE FUNCTION public.get_newsletter_subscriptions()
RETURNS SETOF public.newsletter_subscriptions AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.newsletter_subscriptions ORDER BY subscribed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (superadmin check in policy)
GRANT EXECUTE ON FUNCTION public.get_newsletter_subscriptions TO authenticated;