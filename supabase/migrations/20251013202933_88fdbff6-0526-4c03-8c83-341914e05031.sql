-- Drop existing view and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.clientes_restricted;

-- Create view without SECURITY DEFINER (uses SECURITY INVOKER by default)
CREATE VIEW public.clientes_restricted AS
SELECT 
  id,
  segurado,
  cpf_cnpj,
  cidade,
  uf,
  ativo
FROM public.clientes
WHERE ativo = true;

-- Grant SELECT to authenticated users
GRANT SELECT ON public.clientes_restricted TO authenticated;