
-- 1) Private schema for internal security-definer helpers (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2) Recreate helpers in private schema
CREATE OR REPLACE FUNCTION private.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND papel IN ('Administrador','Gerente','CEO')
      AND ativo = true
  );
$$;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3) Recreate policies to reference private.* helpers
-- profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (private.is_admin_user());
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (private.is_admin_user()) WITH CHECK (private.is_admin_user());
CREATE POLICY "Users can view own profile or admins view all" ON public.profiles
  FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR private.is_admin_user());

-- user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- clientes
DROP POLICY IF EXISTS "Owners or admins can view clientes" ON public.clientes;
CREATE POLICY "Owners or admins can view clientes" ON public.clientes
  FOR SELECT TO authenticated USING ((auth.uid() = created_by) OR private.is_admin_user());

-- realizado_premio_importacoes
DROP POLICY IF EXISTS "Admins gerenciam importações" ON public.realizado_premio_importacoes;
CREATE POLICY "Admins gerenciam importações" ON public.realizado_premio_importacoes
  FOR ALL TO authenticated
  USING (private.is_admin_user()) WITH CHECK (private.is_admin_user());

-- realizado_premio
DROP POLICY IF EXISTS "Admins gerenciam realizado" ON public.realizado_premio;
CREATE POLICY "Admins gerenciam realizado" ON public.realizado_premio
  FOR ALL TO authenticated
  USING (private.is_admin_user()) WITH CHECK (private.is_admin_user());

-- historico / audit
DROP POLICY IF EXISTS "Only admins can view clientes historico" ON public.clientes_historico;
CREATE POLICY "Only admins can view clientes historico" ON public.clientes_historico
  FOR SELECT TO authenticated USING (private.is_admin_user());

DROP POLICY IF EXISTS "Only admins can view clientes audit log" ON public.clientes_audit_log;
CREATE POLICY "Only admins can view clientes audit log" ON public.clientes_audit_log
  FOR SELECT TO authenticated USING (private.is_admin_user());

DROP POLICY IF EXISTS "Only admins can view cotacoes historico" ON public.cotacoes_historico;
CREATE POLICY "Only admins can view cotacoes historico" ON public.cotacoes_historico
  FOR SELECT TO authenticated USING (private.is_admin_user());

DROP POLICY IF EXISTS "Only admins can view cotacoes audit log" ON public.cotacoes_audit_log;
CREATE POLICY "Only admins can view cotacoes audit log" ON public.cotacoes_audit_log
  FOR SELECT TO authenticated USING (private.is_admin_user());

-- 4) Update public.get_produtor_email to use private helper
CREATE OR REPLACE FUNCTION public.get_produtor_email(_produtor_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM public.produtores
  WHERE id = _produtor_id AND private.is_admin_user();
$$;

-- 5) Drop the public copies now that nothing references them
DROP FUNCTION IF EXISTS public.is_admin_user();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 6) Trigger functions do not need to be callable directly by API roles.
--    Revoke EXECUTE from PUBLIC/anon/authenticated (triggers fire regardless).
REVOKE ALL ON FUNCTION public.sync_cotacoes_segurado_from_cliente() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_cotacao_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_cliente_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_cotacao_history() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_cliente_created_by() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_by() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_module() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_cotacoes_on_fechamento() FROM PUBLIC, anon, authenticated;
