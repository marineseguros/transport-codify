-- Fix critical security vulnerability: Restrict cotacoes table access to prevent customer data theft
-- Remove public access to sensitive customer information including CPF/CNPJ and personal details

-- Drop the dangerous public SELECT policy that allows anyone to view customer data
DROP POLICY IF EXISTS "Users can view all cotacoes" ON public.cotacoes;

-- Create secure policies that restrict access based on authentication and user roles

-- Policy 1: Administrators can view all cotacoes (for management purposes)
CREATE POLICY "Admins can view all cotacoes" 
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
CREATE POLICY "Producers can view their associated cotacoes" 
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
CREATE POLICY "Faturamento can view all cotacoes" 
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