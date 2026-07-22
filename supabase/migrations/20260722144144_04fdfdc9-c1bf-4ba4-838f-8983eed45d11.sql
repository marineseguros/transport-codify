
-- =========================================================
-- 1. profiles: prevent privilege escalation on self-insert/update
-- =========================================================
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND papel = 'Produtor'
);

-- Prevent users from escalating their own papel/ativo via UPDATE
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND papel = (SELECT p.papel FROM public.profiles p WHERE p.user_id = auth.uid())
  AND ativo = (SELECT p.ativo FROM public.profiles p WHERE p.user_id = auth.uid())
  AND modulo = (SELECT p.modulo FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Admins can update any profile (including papel changes)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Restrict SELECT on profiles: self or admin
DROP POLICY IF EXISTS "All authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin_user());

-- =========================================================
-- 2. clientes: restrict SELECT to owner + admin/gerente/CEO
-- =========================================================
DROP POLICY IF EXISTS "All authenticated users can view all clientes" ON public.clientes;
CREATE POLICY "Owners or admins can view clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR public.is_admin_user()
);

-- =========================================================
-- 3. clientes_historico: admins/gerente/CEO only
-- =========================================================
DROP POLICY IF EXISTS "All authenticated users can view clientes historico" ON public.clientes_historico;
DROP POLICY IF EXISTS "Authenticated users can view clientes historico" ON public.clientes_historico;
CREATE POLICY "Only admins can view clientes historico"
ON public.clientes_historico
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- =========================================================
-- 4. clientes_audit_log: admins/gerente/CEO only
-- =========================================================
DROP POLICY IF EXISTS "All authenticated users can view clientes audit log" ON public.clientes_audit_log;
DROP POLICY IF EXISTS "Authenticated users can view clientes audit log" ON public.clientes_audit_log;
CREATE POLICY "Only admins can view clientes audit log"
ON public.clientes_audit_log
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- =========================================================
-- 5. cotacoes_historico: admins/gerente/CEO only
-- =========================================================
DROP POLICY IF EXISTS "All authenticated users can view history" ON public.cotacoes_historico;
CREATE POLICY "Only admins can view cotacoes historico"
ON public.cotacoes_historico
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- =========================================================
-- 6. cotacoes_audit_log: admins/gerente/CEO only
-- =========================================================
DROP POLICY IF EXISTS "All authenticated users can view audit log" ON public.cotacoes_audit_log;
CREATE POLICY "Only admins can view cotacoes audit log"
ON public.cotacoes_audit_log
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- =========================================================
-- 7. produtores: hide email column from non-admins
--     Keep row-level SELECT so dropdowns still work, but revoke
--     column privilege on email; admins get access via separate grant.
-- =========================================================
REVOKE SELECT (email) ON public.produtores FROM authenticated, anon;
-- Provide admin access to email via a security definer function
CREATE OR REPLACE FUNCTION public.get_produtor_email(_produtor_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.produtores
  WHERE id = _produtor_id
    AND public.is_admin_user();
$$;
REVOKE EXECUTE ON FUNCTION public.get_produtor_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_produtor_email(uuid) TO authenticated;

-- =========================================================
-- 8. Lock down SECURITY DEFINER function EXECUTE privileges
--     Trigger-only functions: revoke from anon and authenticated
--     (triggers run as table owner, not caller)
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.set_updated_by()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.save_cotacao_history()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_module()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_cotacao_changes()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_user_profiles_updated_at()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_cotacoes_trn_updated_at()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_cliente_changes()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_cliente_created_by()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_cotacoes_on_fechamento()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()             FROM PUBLIC, anon, authenticated;

-- RLS helpers: revoke from anon; keep authenticated (needed by RLS policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_user()                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role()                FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role)               TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_admin_user()                        TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_current_user_role()                TO authenticated;

-- Utility (non-definer but sensitive): keep authenticated only
REVOKE EXECUTE ON FUNCTION public.generate_cotacao_number()              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.util_parse_br_timestamptz(text, text)  FROM PUBLIC, anon;
