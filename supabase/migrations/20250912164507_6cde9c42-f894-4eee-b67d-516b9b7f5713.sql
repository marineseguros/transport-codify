-- Fix critical security vulnerability: Restrict cotacoes table access to prevent customer data theft
-- Remove public access to sensitive customer information including CPF/CNPJ and personal details

-- Drop the dangerous public SELECT policy that allows anyone to view customer data
DROP POLICY IF EXISTS "Users can view all cotacoes" ON public.cotacoes;

-- Drop any other existing SELECT policies to start fresh
DROP POLICY IF EXISTS "Admins can view all cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Administrators can view all cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Producers can view their associated cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Producers view associated cotacoes only" ON public.cotacoes;
DROP POLICY IF EXISTS "Faturamento can view all cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Faturamento role can view all cotacoes" ON public.cotacoes;

-- Create secure policies that restrict access based on authentication and user roles

-- Policy 1: Only authenticated administrators can view all cotacoes
CREATE POLICY "secure_admin_cotacoes_select" 
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

-- Policy 2: Authenticated producers can only view cotacoes they are associated with
CREATE POLICY "secure_producer_cotacoes_select" 
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

-- Policy 3: Authenticated faturamento role can view all cotacoes for billing
CREATE POLICY "secure_faturamento_cotacoes_select" 
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