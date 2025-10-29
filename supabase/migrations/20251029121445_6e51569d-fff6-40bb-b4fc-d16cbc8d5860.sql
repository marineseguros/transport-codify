-- Criar enum para tipos de módulo
CREATE TYPE public.modulo_tipo AS ENUM ('Transportes', 'Ramos Elementares');

-- Adicionar campo modulo na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN modulo modulo_tipo NOT NULL DEFAULT 'Transportes';

-- Adicionar campo modulo nas tabelas principais
ALTER TABLE public.cotacoes
ADD COLUMN modulo modulo_tipo NOT NULL DEFAULT 'Transportes';

ALTER TABLE public.clientes
ADD COLUMN modulo modulo_tipo NOT NULL DEFAULT 'Transportes';

ALTER TABLE public.produtos
ADD COLUMN modulo modulo_tipo NOT NULL DEFAULT 'Transportes';

-- Criar índices para melhor performance nas queries filtradas por módulo
CREATE INDEX idx_profiles_modulo ON public.profiles(modulo);
CREATE INDEX idx_cotacoes_modulo ON public.cotacoes(modulo);
CREATE INDEX idx_clientes_modulo ON public.clientes(modulo);
CREATE INDEX idx_produtos_modulo ON public.produtos(modulo);

-- Atualizar RLS policies das cotacoes para filtrar por módulo
DROP POLICY IF EXISTS "All authenticated users can view all cotacoes" ON public.cotacoes;
CREATE POLICY "Users can view cotacoes from their module"
ON public.cotacoes
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    modulo = (SELECT modulo FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND papel = 'Administrador')
  )
);

DROP POLICY IF EXISTS "All authenticated users can create cotacoes" ON public.cotacoes;
CREATE POLICY "Users can create cotacoes in their module"
ON public.cotacoes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND modulo = (SELECT modulo FROM profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "All authenticated users can update all cotacoes" ON public.cotacoes;
CREATE POLICY "Users can update cotacoes from their module"
ON public.cotacoes
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    modulo = (SELECT modulo FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND papel = 'Administrador')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND modulo = (SELECT modulo FROM profiles WHERE user_id = auth.uid())
);

-- Atualizar RLS policies dos clientes para filtrar por módulo
DROP POLICY IF EXISTS "secure_admin_manager_ceo_operacional_clientes_select" ON public.clientes;
DROP POLICY IF EXISTS "secure_faturamento_clientes_select" ON public.clientes;
DROP POLICY IF EXISTS "secure_producer_clientes_select" ON public.clientes;

CREATE POLICY "Users can view clientes from their module"
ON public.clientes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.ativo = true
    AND (
      p.papel IN ('Administrador', 'Gerente', 'CEO', 'Operacional', 'Faturamento')
      AND (p.modulo = clientes.modulo OR p.papel = 'Administrador')
    )
  )
);

DROP POLICY IF EXISTS "secure_admin_faturamento_clientes_insert" ON public.clientes;
CREATE POLICY "Users can insert clientes in their module"
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.papel IN ('Administrador', 'Faturamento')
    AND p.ativo = true
    AND modulo = p.modulo
  )
);

DROP POLICY IF EXISTS "secure_admin_faturamento_clientes_update" ON public.clientes;
CREATE POLICY "Users can update clientes from their module"
ON public.clientes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.papel IN ('Administrador', 'Faturamento')
    AND p.ativo = true
    AND (p.modulo = clientes.modulo OR p.papel = 'Administrador')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.papel IN ('Administrador', 'Faturamento')
    AND p.ativo = true
    AND modulo = p.modulo
  )
);

-- Atualizar RLS policies dos produtos para filtrar por módulo
DROP POLICY IF EXISTS "Authenticated users can view all produtos" ON public.produtos;
CREATE POLICY "Users can view produtos from their module"
ON public.produtos
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    modulo = (SELECT modulo FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND papel = 'Administrador')
  )
);

DROP POLICY IF EXISTS "Authenticated users can create produtos" ON public.produtos;
CREATE POLICY "Users can create produtos in their module"
ON public.produtos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND modulo = (SELECT modulo FROM profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can update produtos" ON public.produtos;
CREATE POLICY "Users can update produtos from their module"
ON public.produtos
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    modulo = (SELECT modulo FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND papel = 'Administrador')
  )
);

-- Criar trigger para garantir que novos registros sempre tenham o módulo do usuário
CREATE OR REPLACE FUNCTION set_user_module()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.modulo IS NULL THEN
    NEW.modulo := (SELECT modulo FROM profiles WHERE user_id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_cotacao_module
BEFORE INSERT ON cotacoes
FOR EACH ROW
EXECUTE FUNCTION set_user_module();

CREATE TRIGGER set_cliente_module
BEFORE INSERT ON clientes
FOR EACH ROW
EXECUTE FUNCTION set_user_module();

CREATE TRIGGER set_produto_module
BEFORE INSERT ON produtos
FOR EACH ROW
EXECUTE FUNCTION set_user_module();