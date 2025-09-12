-- Fix infinite recursion in profiles table RLS policies
-- Cannot modify auth schema, so we'll fix the public schema policies

-- Drop existing problematic policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;  
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create safe RLS policies without recursion
-- Users can view their own profile (simple check without recursion)
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile  
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles  
FOR UPDATE USING (auth.uid() = user_id);

-- Create a security definer function to check admin role without recursion
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND papel = 'Administrador'::text 
    AND ativo = true
  );
$$;

-- Admins can view all profiles using the security definer function  
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.is_admin_user());

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (public.is_admin_user());

-- Make sure the admin profile exists and is properly configured
INSERT INTO public.profiles (
  user_id,
  nome,
  email, 
  papel,
  ativo
) VALUES (
  'e13d8365-97b8-4f1f-b19c-0279880c2696'::uuid,
  'Administrador do Sistema',
  'faturamento@marineseguros.com.br',
  'Administrador',
  true
) ON CONFLICT (user_id) DO UPDATE SET
  papel = 'Administrador',
  ativo = true,
  updated_at = now();