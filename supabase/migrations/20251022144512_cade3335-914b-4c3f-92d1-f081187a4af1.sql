-- ========================================
-- ATUALIZAÇÃO DE PERMISSÕES DE COTAÇÕES
-- ========================================

-- Remover policies antigas de cotacoes
DROP POLICY IF EXISTS "Admins and producers can create cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Producers can update their own cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Admins managers ceos can update cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Admins managers ceos can delete cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Faturamento can update cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "secure_admin_manager_ceo_cotacoes_select" ON public.cotacoes;
DROP POLICY IF EXISTS "secure_faturamento_cotacoes_select" ON public.cotacoes;
DROP POLICY IF EXISTS "secure_producer_cotacoes_select" ON public.cotacoes;

-- ========================================
-- VISUALIZAÇÃO: Todos os usuários autenticados veem TODAS as cotações
-- ========================================
CREATE POLICY "All authenticated users can view all cotacoes" 
ON public.cotacoes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- ========================================
-- CRIAÇÃO: Todos os usuários autenticados podem criar cotações
-- ========================================
CREATE POLICY "All authenticated users can create cotacoes" 
ON public.cotacoes 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- ========================================
-- EDIÇÃO: Todos os usuários autenticados podem editar qualquer cotação
-- (o histórico é salvo automaticamente pelo trigger existente)
-- ========================================
CREATE POLICY "All authenticated users can update all cotacoes" 
ON public.cotacoes 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ========================================
-- EXCLUSÃO: Regras específicas por papel
-- ========================================

-- Admin, Gerente e CEO podem excluir qualquer cotação
CREATE POLICY "Admins managers ceos can delete any cotacao" 
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

-- Faturamento pode excluir qualquer cotação
CREATE POLICY "Faturamento can delete any cotacao" 
ON public.cotacoes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel = 'Faturamento'
    AND p.ativo = true
  )
);

-- Produtor pode excluir APENAS cotações criadas por ele
-- (verificamos se o produtor_origem, produtor_negociador ou produtor_cotador 
-- corresponde ao email do usuário atual)
CREATE POLICY "Producers can delete only their own cotacoes" 
ON public.cotacoes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel = 'Produtor'
    AND p.ativo = true
    AND EXISTS (
      SELECT 1 FROM public.produtores prod
      WHERE prod.email = p.email
      AND prod.ativo = true
      AND (
        prod.id = cotacoes.produtor_origem_id 
        OR prod.id = cotacoes.produtor_negociador_id 
        OR prod.id = cotacoes.produtor_cotador_id
      )
    )
  )
);

-- ========================================
-- HISTÓRICO DE COTAÇÕES
-- ========================================

-- Atualizar policies de histórico para permitir visualização por todos
DROP POLICY IF EXISTS "Admin manager ceo operacional can view all history" ON public.cotacoes_historico;
DROP POLICY IF EXISTS "Faturamento can view all history" ON public.cotacoes_historico;
DROP POLICY IF EXISTS "Producer can view related history" ON public.cotacoes_historico;

CREATE POLICY "All authenticated users can view history" 
ON public.cotacoes_historico 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- ========================================
-- ATUALIZAR PAPÉIS DE USUÁRIOS
-- ========================================

-- Atualizar Luiz para CEO
UPDATE public.profiles 
SET papel = 'CEO', updated_at = now()
WHERE email = 'luizemilionavarro@gmail.com' 
AND papel != 'CEO';

-- Atualizar Ellen para Gerente
UPDATE public.profiles 
SET papel = 'Gerente', updated_at = now()
WHERE email = 'ellenferreira@marinecontrol.com.br' 
AND papel != 'Gerente';