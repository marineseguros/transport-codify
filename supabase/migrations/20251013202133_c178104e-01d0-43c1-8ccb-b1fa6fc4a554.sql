-- =====================================================
-- SECURITY FIX: User Roles System
-- =====================================================

-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'produtor', 'faturamento');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 4. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  user_id,
  CASE 
    WHEN papel = 'Administrador' THEN 'admin'::app_role
    WHEN papel = 'Faturamento' THEN 'faturamento'::app_role
    ELSE 'produtor'::app_role
  END as role
FROM public.profiles
WHERE ativo = true
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- SECURITY FIX: Restrict Cotacoes Access
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can create cotacoes" ON public.cotacoes;
DROP POLICY IF EXISTS "Users can update cotacoes" ON public.cotacoes;

-- Create secure policies for cotacoes
CREATE POLICY "Admins and producers can create cotacoes"
ON public.cotacoes
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'produtor') OR
  public.has_role(auth.uid(), 'faturamento')
);

CREATE POLICY "Admins can update any cotacao"
ON public.cotacoes
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Producers can update their own cotacoes"
ON public.cotacoes
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'produtor') AND
  EXISTS (
    SELECT 1 FROM produtores prod
    JOIN profiles p ON p.email = prod.email
    WHERE p.user_id = auth.uid()
    AND p.ativo = true
    AND prod.ativo = true
    AND (
      prod.id = cotacoes.produtor_origem_id OR
      prod.id = cotacoes.produtor_negociador_id OR
      prod.id = cotacoes.produtor_cotador_id
    )
  )
);

CREATE POLICY "Faturamento can update cotacoes"
ON public.cotacoes
FOR UPDATE
USING (public.has_role(auth.uid(), 'faturamento'));

-- =====================================================
-- SECURITY FIX: Limit Client Data Exposure
-- =====================================================

-- Create a restricted view of clients for producers
CREATE OR REPLACE VIEW public.clientes_restricted AS
SELECT 
  id,
  segurado,
  cpf_cnpj,
  cidade,
  uf,
  ativo
FROM public.clientes;

-- Grant access to the restricted view
GRANT SELECT ON public.clientes_restricted TO authenticated;

-- Update the producer policy on clientes to be more restrictive
DROP POLICY IF EXISTS "secure_producer_clientes_select" ON public.clientes;

CREATE POLICY "secure_producer_clientes_select"
ON public.clientes
FOR SELECT
USING (
  -- Producers can only see clients through the restricted view
  -- Full access only for admins and faturamento via other policies
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'faturamento')
);

-- =====================================================
-- SECURITY FIX: Update produtores policies
-- =====================================================

DROP POLICY IF EXISTS "produtores_insert_authenticated" ON public.produtores;
DROP POLICY IF EXISTS "produtores_update_authenticated" ON public.produtores;

CREATE POLICY "Only admins can insert produtores"
ON public.produtores
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update produtores"
ON public.produtores
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));