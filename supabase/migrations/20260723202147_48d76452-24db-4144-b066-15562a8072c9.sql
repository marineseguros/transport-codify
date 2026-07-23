
-- 1. Remove overly permissive policy on clientes_historico
DROP POLICY IF EXISTS "All authenticated users can view clientes history" ON public.clientes_historico;

-- 2. Revoke EXECUTE on SECURITY DEFINER helpers not needed by end-users.
-- get_produtor_email: contains its own admin check; call via service role only.
-- get_current_user_role: unused RPC; role checks go through has_role/is_admin_user.
REVOKE EXECUTE ON FUNCTION public.get_produtor_email(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM anon, authenticated, PUBLIC;

-- Note: has_role() and is_admin_user() remain executable by authenticated
-- because they are invoked inside RLS policies and require EXECUTE privilege
-- for the calling role.
