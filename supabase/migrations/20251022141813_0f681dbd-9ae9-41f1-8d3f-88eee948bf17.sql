-- Adicionar novos papéis ao sistema
-- Gerente e CEO têm as mesmas permissões que Administrador
-- Operacional pode ver todas as cotações e dashboards

-- Atualizar RLS policies para cotacoes para incluir os novos papéis
DROP POLICY IF EXISTS "secure_admin_cotacoes_select" ON public.cotacoes;
DROP POLICY IF EXISTS "Admins can update any cotacao" ON public.cotacoes;
DROP POLICY IF EXISTS "Only admins can delete cotacoes" ON public.cotacoes;

-- Política de SELECT: Gerente, CEO e Operacional veem tudo
CREATE POLICY "secure_admin_manager_ceo_cotacoes_select" 
ON public.cotacoes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel IN ('Administrador', 'Gerente', 'CEO', 'Operacional')
    AND p.ativo = true
  )
);

-- Política de UPDATE: Apenas Administrador, Gerente e CEO
CREATE POLICY "Admins managers ceos can update cotacoes" 
ON public.cotacoes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel IN ('Administrador', 'Gerente', 'CEO')
    AND p.ativo = true
  )
);

-- Política de DELETE: Apenas Administrador, Gerente e CEO
CREATE POLICY "Admins managers ceos can delete cotacoes" 
ON public.cotacoes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel IN ('Administrador', 'Gerente', 'CEO')
    AND p.ativo = true
  )
);

-- Atualizar policies para clientes
DROP POLICY IF EXISTS "secure_admin_clientes_select" ON public.clientes;

CREATE POLICY "secure_admin_manager_ceo_operacional_clientes_select" 
ON public.clientes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel IN ('Administrador', 'Gerente', 'CEO', 'Operacional')
    AND p.ativo = true
  )
);

-- Atualizar policies para histórico de cotações
DROP POLICY IF EXISTS "Admin can view all history" ON public.cotacoes_historico;

CREATE POLICY "Admin manager ceo operacional can view all history" 
ON public.cotacoes_historico 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel IN ('Administrador', 'Gerente', 'CEO', 'Operacional')
    AND p.ativo = true
  )
);

-- Atualizar policies para produtores
DROP POLICY IF EXISTS "Only admins can insert produtores" ON public.produtores;
DROP POLICY IF EXISTS "Only admins can update produtores" ON public.produtores;
DROP POLICY IF EXISTS "Only admins can delete produtores" ON public.produtores;

CREATE POLICY "Admins managers ceos can insert produtores" 
ON public.produtores 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
    AND papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

CREATE POLICY "Admins managers ceos can update produtores" 
ON public.produtores 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
    AND papel IN ('Administrador', 'Gerente', 'CEO')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
    AND papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

CREATE POLICY "Admins managers ceos can delete produtores" 
ON public.produtores 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
    AND papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

-- Atualizar policies para seguradoras
DROP POLICY IF EXISTS "Only admins can modify seguradoras" ON public.seguradoras;

CREATE POLICY "Admins managers ceos can modify seguradoras" 
ON public.seguradoras 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
    AND papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

-- Atualizar policies para ramos
DROP POLICY IF EXISTS "Only admins can modify ramos" ON public.ramos;

CREATE POLICY "Admins managers ceos can modify ramos" 
ON public.ramos 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
    AND papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

-- Atualizar policies para captacao
DROP POLICY IF EXISTS "Only admins can modify captacao" ON public.captacao;

CREATE POLICY "Admins managers ceos can modify captacao" 
ON public.captacao 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
    AND papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

-- Atualizar policies para status_seguradora
DROP POLICY IF EXISTS "Only admins can modify status_seguradora" ON public.status_seguradora;

CREATE POLICY "Admins managers ceos can modify status_seguradora" 
ON public.status_seguradora 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
    AND papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

-- Atualizar policies para unidades
DROP POLICY IF EXISTS "Only admins can modify unidades" ON public.unidades;

CREATE POLICY "Admins managers ceos can modify unidades" 
ON public.unidades 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() 
    AND papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

-- Atualizar function is_admin_user para incluir novos papéis
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND papel IN ('Administrador', 'Gerente', 'CEO')
    AND ativo = true
  );
$$;