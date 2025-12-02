-- Create tipos_meta table for meta types management
CREATE TABLE public.tipos_meta (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on tipos_meta
ALTER TABLE public.tipos_meta ENABLE ROW LEVEL SECURITY;

-- RLS policies for tipos_meta
CREATE POLICY "Authenticated users can view tipos_meta"
ON public.tipos_meta FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins managers ceos can modify tipos_meta"
ON public.tipos_meta FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.papel IN ('Administrador', 'Gerente', 'CEO')
));

-- Insert default tipos_meta
INSERT INTO public.tipos_meta (descricao) VALUES 
  ('Coleta'),
  ('Visita'),
  ('Fechamento');

-- Create metas table
CREATE TABLE public.metas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produtor_id uuid NOT NULL REFERENCES public.produtores(id) ON DELETE CASCADE,
  mes date NOT NULL, -- Stored as first day of month (YYYY-MM-01)
  tipo_meta_id uuid NOT NULL REFERENCES public.tipos_meta(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 0,
  modulo modulo_tipo NOT NULL DEFAULT 'Transportes'::modulo_tipo,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on metas
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

-- RLS policies for metas
CREATE POLICY "Users can view metas from their module"
ON public.metas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.ativo = true
    AND (p.modulo = metas.modulo OR p.papel = 'Administrador')
  )
);

CREATE POLICY "Admins managers ceos can insert metas"
ON public.metas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

CREATE POLICY "Admins managers ceos can update metas"
ON public.metas FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

CREATE POLICY "Admins managers ceos can delete metas"
ON public.metas FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_metas_updated_at
BEFORE UPDATE ON public.metas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for common queries
CREATE INDEX idx_metas_produtor_mes ON public.metas(produtor_id, mes);
CREATE INDEX idx_metas_tipo_meta ON public.metas(tipo_meta_id);
CREATE INDEX idx_metas_mes ON public.metas(mes);