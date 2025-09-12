-- Fix security vulnerability: Restrict profiles table access to prevent email harvesting
-- Remove public access to user email addresses and personal information

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more secure policy that only allows authenticated users to view profiles
-- Users can only view their own profile to prevent email harvesting
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- If business logic requires viewing other profiles (like for admin purposes),
-- create a separate policy for admins only
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel = 'Administrador'
  )
);