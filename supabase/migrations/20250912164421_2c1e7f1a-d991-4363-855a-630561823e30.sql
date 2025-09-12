-- Fix critical security vulnerability: Restrict cotacoes table access to prevent customer data theft
-- Remove public access to sensitive customer information including CPF/CNPJ and personal details

-- Drop all existing SELECT policies to start fresh with secure ones
DROP POLICY IF EXISTS "Users can view all cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Admins can view all cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Producers can view their associated cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Faturamento can view all cotacoes" ON public.cotacoes;

-- Create secure policies that restrict access based on authentication and user roles

-- Policy 1: Administrators can view all cotacoes (for management purposes)
CREATE POLICY "Administrators can view all cotacoes" 
ON public.cotacoes 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel = 'Administrador'
    AND p.ativo = true
  )
);

-- Policy 2: Producers can only view cotacoes they are associated with
-- This covers produtor_origem_id, produtor_negociador_id, and produtor_cotador_id
CREATE POLICY "Producers view associated cotacoes only" 
ON public.cotacoes 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.ativo = true
    AND (
      -- Check if user is associated with any producer involved in this cotacao
      EXISTS (
        SELECT 1 FROM public.produtores prod
        WHERE prod.email = p.email 
        AND prod.ativo = true
        AND (
          prod.id = cotacoes.produtor_origem_id OR
          prod.id = cotacoes.produtor_negociador_id OR
          prod.id = cotacoes.produtor_cotador_id
        )
      )
    )
  )
);

-- Policy 3: Faturamento role can view all cotacoes (for billing purposes)
CREATE POLICY "Faturamento role can view all cotacoes" 
ON public.cotacoes 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel = 'Faturamento'
    AND p.ativo = true
  )
);