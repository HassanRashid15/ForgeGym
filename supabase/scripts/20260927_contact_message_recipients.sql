-- Contact form: route messages to Super Admin or a specific gym owner admin
-- Safe to re-run

ALTER TABLE public.contact_messages
ADD COLUMN IF NOT EXISTS recipient_type text NOT NULL DEFAULT 'superadmin'
  CHECK (recipient_type IN ('superadmin', 'gym_admin'));

ALTER TABLE public.contact_messages
ADD COLUMN IF NOT EXISTS recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.contact_messages
ADD COLUMN IF NOT EXISTS recipient_label text;

CREATE INDEX IF NOT EXISTS idx_contact_messages_recipient
  ON public.contact_messages (recipient_type, recipient_user_id, created_at DESC);

COMMENT ON COLUMN public.contact_messages.recipient_type IS
  'Who the contact form message is addressed to: superadmin or gym_admin';
COMMENT ON COLUMN public.contact_messages.recipient_user_id IS
  'Gym owner user_id when recipient_type = gym_admin';
COMMENT ON COLUMN public.contact_messages.recipient_label IS
  'Display label captured at submit time (e.g. gym name)';
