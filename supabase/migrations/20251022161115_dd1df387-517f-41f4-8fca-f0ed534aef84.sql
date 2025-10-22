-- Fix foreign key relationship for cotacoes_audit_log.changed_by
-- This allows the frontend to properly join with profiles table

-- Drop the existing foreign key to auth.users if it exists
ALTER TABLE public.cotacoes_audit_log 
DROP CONSTRAINT IF EXISTS cotacoes_audit_log_changed_by_fkey;

-- Add foreign key to profiles.user_id instead
ALTER TABLE public.cotacoes_audit_log
ADD CONSTRAINT cotacoes_audit_log_changed_by_fkey 
FOREIGN KEY (changed_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;