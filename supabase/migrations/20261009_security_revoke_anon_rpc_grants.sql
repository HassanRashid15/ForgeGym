-- Security hardening: stop exposing account/subscription existence to the public anon key.
-- The anon PostgREST key ships in the browser bundle, so any anon-granted RPC is
-- callable by anyone with no rate limiting. These RPCs are only used server-side.

-- check_user_exists enables unlimited email enumeration via the anon key.
-- Server route handlers call it with the service role, which keeps its grant.
REVOKE EXECUTE ON FUNCTION public.check_user_exists(TEXT) FROM anon;

-- sync_my_signup_profile writes profile data and was granted to anon; the register
-- flow calls it as the freshly authenticated user, which keeps its grant.
REVOKE EXECUTE ON FUNCTION public.sync_my_signup_profile() FROM anon;
