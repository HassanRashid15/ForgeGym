-- Ensure AI Speed sidelink setting exists (superadmin Platform nav).
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES ('ai_speed_enabled', 'true', now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now()
WHERE public.platform_settings.value IS DISTINCT FROM 'true';
