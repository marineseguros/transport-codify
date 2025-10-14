-- Drop the existing view with SECURITY DEFINER
DROP VIEW IF EXISTS public.clientes_restricted;

-- Recreate the view without SECURITY DEFINER (defaults to SECURITY INVOKER)
-- This will enforce RLS policies of the querying user, not the view creator
CREATE VIEW public.clientes_restricted
WITH (security_invoker = true)
AS
SELECT 
  id,
  segurado,
  cpf_cnpj,
  cidade,
  uf,
  ativo
FROM public.clientes
WHERE ativo = true;