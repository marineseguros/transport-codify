-- Fix security vulnerability: Restrict produtores table access to authenticated users only
-- This prevents unauthorized access to employee contact information

-- First, check what policies currently exist and drop all existing ones
DROP POLICY IF EXISTS "Users can view all produtores" ON public.produtores;
DROP POLICY IF EXISTS "Authenticated users can view produtores" ON public.produtores;
DROP POLICY IF EXISTS "Users can create produtores" ON public.produtores;
DROP POLICY IF EXISTS "Authenticated users can create produtores" ON public.produtores;
DROP POLICY IF EXISTS "Users can update produtores" ON public.produtores;
DROP POLICY IF EXISTS "Authenticated users can update produtores" ON public.produtores;

-- Create new secure policies that require authentication
CREATE POLICY "produtores_select_authenticated" 
ON public.produtores 
FOR SELECT 
TO authenticated
USING (true);

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

-- Keep the admin-only delete policy (it's already secure)
-- The delete policy "Only admins can delete produtores" should remain unchanged