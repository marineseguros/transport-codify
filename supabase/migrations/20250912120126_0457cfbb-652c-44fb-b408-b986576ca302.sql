-- Fix security vulnerability: Restrict produtores table access to authenticated users only
-- This prevents unauthorized access to employee contact information

-- Drop the current overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all produtores" ON public.produtores;

-- Create new restricted SELECT policy for authenticated users only
CREATE POLICY "Authenticated users can view produtores" 
ON public.produtores 
FOR SELECT 
TO authenticated
USING (true);

-- Also restrict INSERT and UPDATE to authenticated users for better security
DROP POLICY IF EXISTS "Users can create produtores" ON public.produtores;
DROP POLICY IF EXISTS "Users can update produtores" ON public.produtores;

CREATE POLICY "Authenticated users can create produtores" 
ON public.produtores 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update produtores" 
ON public.produtores 
FOR UPDATE 
TO authenticated
USING (true);