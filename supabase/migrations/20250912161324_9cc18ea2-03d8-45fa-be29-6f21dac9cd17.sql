-- Fix security issues identified by the linter

-- 1. Drop the problematic security definer view
DROP VIEW IF EXISTS public.current_user_role;

-- 2. Fix functions with mutable search_path by setting explicit search_path
-- Update touch_user_profiles_updated_at function
CREATE OR REPLACE FUNCTION public.touch_user_profiles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$function$;

-- Update touch_cotacoes_trn_updated_at function  
CREATE OR REPLACE FUNCTION public.touch_cotacoes_trn_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql  
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$function$;

-- 3. Create a secure function to get current user role if needed in the future
-- This function uses SECURITY DEFINER but with proper access controls
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role::TEXT FROM public.user_profiles 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- Grant execute permission only to authenticated users
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- 4. Ensure all existing functions have proper permissions
-- Revoke unnecessary permissions from public schema functions
REVOKE EXECUTE ON FUNCTION public.touch_user_profiles_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_cotacoes_trn_updated_at() FROM PUBLIC;

-- Grant only necessary permissions
GRANT EXECUTE ON FUNCTION public.touch_user_profiles_updated_at() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.touch_cotacoes_trn_updated_at() TO authenticated, service_role;