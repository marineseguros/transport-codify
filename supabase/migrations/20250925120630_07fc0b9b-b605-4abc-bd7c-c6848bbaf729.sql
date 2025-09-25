-- Fix critical security issue: Restrict access to customer personal data
-- Drop the overly permissive policy that allows all users to view all customer data
DROP POLICY IF EXISTS "Users can view all clientes" ON public.clientes;

-- Create secure role-based policies for customer data access

-- 1. Allow administrators to view all customer data
CREATE POLICY "secure_admin_clientes_select" 
ON public.clientes 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.papel = 'Administrador'::text 
    AND p.ativo = true
  )
);

-- 2. Allow faturamento role to view all customer data (for billing purposes)
CREATE POLICY "secure_faturamento_clientes_select" 
ON public.clientes 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.papel = 'Faturamento'::text 
    AND p.ativo = true
  )
);

-- 3. Allow producers to view only customers associated with their quotes
CREATE POLICY "secure_producer_clientes_select" 
ON public.clientes 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.produtores prod ON prod.email = p.email
    JOIN public.cotacoes cot ON (
      cot.produtor_origem_id = prod.id 
      OR cot.produtor_negociador_id = prod.id 
      OR cot.produtor_cotador_id = prod.id
    )
    WHERE p.user_id = auth.uid() 
    AND p.ativo = true 
    AND prod.ativo = true
    AND cot.cliente_id = clientes.id
  )
);

-- Update the overly permissive insert policy to be more restrictive
DROP POLICY IF EXISTS "Users can create clientes" ON public.clientes;

-- Allow only administrators and faturamento to create new customers
CREATE POLICY "secure_admin_faturamento_clientes_insert" 
ON public.clientes 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.papel IN ('Administrador'::text, 'Faturamento'::text)
    AND p.ativo = true
  )
);

-- Update the overly permissive update policy to be more restrictive
DROP POLICY IF EXISTS "Users can update clientes" ON public.clientes;

-- Allow only administrators and faturamento to update customer data
CREATE POLICY "secure_admin_faturamento_clientes_update" 
ON public.clientes 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.papel IN ('Administrador'::text, 'Faturamento'::text)
    AND p.ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.papel IN ('Administrador'::text, 'Faturamento'::text)
    AND p.ativo = true
  )
);