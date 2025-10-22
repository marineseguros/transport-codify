-- Fix produtores UPDATE policy to include WITH CHECK clause
DROP POLICY IF EXISTS "Only admins can update produtores" ON public.produtores;

CREATE POLICY "Only admins can update produtores" 
ON public.produtores 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));