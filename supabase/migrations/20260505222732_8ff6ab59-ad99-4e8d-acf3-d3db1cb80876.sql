
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;
-- has_role is intentionally callable by authenticated (used in RLS policies). Restrict to that only.
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
