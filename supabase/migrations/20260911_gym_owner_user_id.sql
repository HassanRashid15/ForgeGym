-- Scope staff (trainers / co-admins) to a gym owner account

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gym_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_gym_owner_user_id_idx
  ON public.profiles (gym_owner_user_id);

-- Primary gym owners: point at themselves when they have gym data and no owner set
UPDATE public.profiles p
SET gym_owner_user_id = p.user_id
WHERE p.gym_owner_user_id IS NULL
  AND p.gym_name IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.role = 'admin'
  );
