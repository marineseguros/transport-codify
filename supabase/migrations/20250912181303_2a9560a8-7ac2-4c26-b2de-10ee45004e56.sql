-- Fix infinite recursion in profiles table RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create safe RLS policies for profiles table
-- Users can view their own profile (no recursion)
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Create a simple function to check if user is admin without recursion
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND papel = 'Administrador' 
    AND ativo = true
  );
$$;

-- Admins can view all profiles using the function
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (auth.is_admin());

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (auth.is_admin());

-- Ensure admin user exists with correct password
INSERT INTO auth.users (
  id, 
  email, 
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  instance_id,
  aud,
  role
) VALUES (
  'e13d8365-97b8-4f1f-b19c-0279880c2696'::uuid,
  'faturamento@marineseguros.com.br',
  crypt('Marine123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('Marine123', gen_salt('bf')),
  updated_at = now();

-- Ensure profile exists for admin user
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