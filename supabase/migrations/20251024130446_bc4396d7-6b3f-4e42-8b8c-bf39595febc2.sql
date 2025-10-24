-- Create produtos table
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segurado TEXT NOT NULL,
  consultor TEXT NOT NULL,
  data_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tipo TEXT NOT NULL CHECK (tipo IN ('Coleta', 'Indicação', 'Novos CRM', 'Visita/Video')),
  observacao TEXT,
  
  -- Campos condicionais para Indicação
  tipo_indicacao TEXT CHECK (tipo_indicacao IN ('Cliente', 'Externa')),
  cliente_indicado TEXT,
  
  -- Campos condicionais para Visita/Video
  subtipo TEXT CHECK (subtipo IN ('Visita', 'Vídeo')),
  cidade TEXT,
  data_realizada TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view all produtos"
ON public.produtos
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create produtos"
ON public.produtos
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update produtos"
ON public.produtos
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins managers ceos can delete produtos"
ON public.produtos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND papel IN ('Administrador', 'Gerente', 'CEO')
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index para melhor performance
CREATE INDEX idx_produtos_data_registro ON public.produtos(data_registro DESC);
CREATE INDEX idx_produtos_tipo ON public.produtos(tipo);
CREATE INDEX idx_produtos_consultor ON public.produtos(consultor);