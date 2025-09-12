-- Fix security vulnerability: Restrict produtores table access to authenticated users only
-- Remove public access to employee contact information

-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "produtores_select_public" ON public.produtores;

-- Create a new policy that requires authentication
CREATE POLICY "produtores_select_authenticated" 
ON public.produtores 
FOR SELECT 
TO authenticated
USING (ativo = true);

-- Also restrict INSERT and UPDATE to authenticated users only
DROP POLICY IF EXISTS "produtores_insert_public" ON public.produtores;
DROP POLICY IF EXISTS "produtores_update_public" ON public.produtores;

-- Create authenticated-only policies for INSERT and UPDATE
CREATE POLICY "produtores_insert_authenticated" 
ON public.produtores 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "produtores_update_authenticated" 
ON public.produtores 
FOR UPDATE 
TO authenticated
USING (true);