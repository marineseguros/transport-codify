-- Fix produtores policies to use consistent approach with profiles table
DROP POLICY IF EXISTS "Only admins can insert produtores" ON public.produtores;
DROP POLICY IF EXISTS "Only admins can update produtores" ON public.produtores;
DROP POLICY IF EXISTS "produtores_select_authenticated" ON public.produtores;

-- Consistent INSERT policy using profiles
CREATE POLICY "Only admins can insert produtores" 
ON public.produtores 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.papel = 'Administrador'::text
  )
);

-- Consistent UPDATE policy using profiles
CREATE POLICY "Only admins can update produtores" 
ON public.produtores 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.papel = 'Administrador'::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.papel = 'Administrador'::text
  )
);

-- Fix SELECT policy to allow viewing all produtores (not just active ones) for authenticated users
CREATE POLICY "Authenticated users can view all produtores" 
ON public.produtores 
FOR SELECT 
USING (auth.uid() IS NOT NULL);