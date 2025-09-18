-- Create unidades table
CREATE TABLE public.unidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view unidades" 
ON public.unidades 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify unidades" 
ON public.unidades 
FOR ALL 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.papel = 'Administrador'::text))));

-- Insert default data
INSERT INTO public.unidades (codigo, descricao) VALUES 
('MAT', 'Matriz'),
('FIL', 'Filial');

-- Add unidade_id column to cotacoes table
ALTER TABLE public.cotacoes ADD COLUMN unidade_id UUID REFERENCES public.unidades(id);