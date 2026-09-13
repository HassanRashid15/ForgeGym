-- Enable realtime for both notification tables (idempotent)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Needed so UPDATE/DELETE payloads include old row fields for filters
DO $$
BEGIN
  ALTER TABLE public.notifications REPLICA IDENTITY FULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
