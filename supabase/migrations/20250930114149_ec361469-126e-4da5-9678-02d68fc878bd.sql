-- Security Fix: Restrict access to reference tables to authenticated users only
-- This addresses the security issue where business configuration data was publicly accessible

-- Update captacao table policy
DROP POLICY IF EXISTS "Users can view captacao" ON public.captacao;
CREATE POLICY "Authenticated users can view captacao" 
ON public.captacao 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update ramos table policy  
DROP POLICY IF EXISTS "Users can view ramos" ON public.ramos;
CREATE POLICY "Authenticated users can view ramos" 
ON public.ramos 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update seguradoras table policy
DROP POLICY IF EXISTS "Users can view seguradoras" ON public.seguradoras;
CREATE POLICY "Authenticated users can view seguradoras" 
ON public.seguradoras 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update status_seguradora table policy
DROP POLICY IF EXISTS "Users can view status_seguradora" ON public.status_seguradora;
CREATE POLICY "Authenticated users can view status_seguradora" 
ON public.status_seguradora 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update unidades table policy
DROP POLICY IF EXISTS "Users can view unidades" ON public.unidades;
CREATE POLICY "Authenticated users can view unidades" 
ON public.unidades 
FOR SELECT 
USING (auth.uid() IS NOT NULL);