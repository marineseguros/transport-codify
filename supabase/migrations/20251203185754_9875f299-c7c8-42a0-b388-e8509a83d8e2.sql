-- Create table for premium goals (metas de prêmio)
CREATE TABLE public.metas_premio (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produtor_id uuid NOT NULL REFERENCES public.produtores(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  meta_jan numeric NOT NULL DEFAULT 0,
  meta_fev numeric NOT NULL DEFAULT 0,
  meta_mar numeric NOT NULL DEFAULT 0,
  meta_abr numeric NOT NULL DEFAULT 0,
  meta_mai numeric NOT NULL DEFAULT 0,
  meta_jun numeric NOT NULL DEFAULT 0,
  meta_jul numeric NOT NULL DEFAULT 0,
  meta_ago numeric NOT NULL DEFAULT 0,
  meta_set numeric NOT NULL DEFAULT 0,
  meta_out numeric NOT NULL DEFAULT 0,
  meta_nov numeric NOT NULL DEFAULT 0,
  meta_dez numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  modulo modulo_tipo NOT NULL DEFAULT 'Transportes'::modulo_tipo,
  UNIQUE(produtor_id, ano, modulo)
);

-- Enable RLS
ALTER TABLE public.metas_premio ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view metas_premio from their module"
ON public.metas_premio FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.ativo = true
    AND (p.modulo = metas_premio.modulo OR p.papel = 'Administrador')
  )
);

CREATE POLICY "Admins managers ceos can insert metas_premio"
ON public.metas_premio FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

CREATE POLICY "Admins managers ceos can update metas_premio"
ON public.metas_premio FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

CREATE POLICY "Admins managers ceos can delete metas_premio"
ON public.metas_premio FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_metas_premio_updated_at
BEFORE UPDATE ON public.metas_premio
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();