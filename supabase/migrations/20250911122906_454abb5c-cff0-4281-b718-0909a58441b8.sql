-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'Produtor' CHECK (papel IN ('Administrador', 'Gerente', 'Produtor', 'Somente-Leitura')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seguradoras table
CREATE TABLE public.seguradoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clientes table
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segurado TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cotacoes table
CREATE TABLE public.cotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_cotacao TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id),
  segurado TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  produtor_origem_id UUID REFERENCES public.profiles(id),
  produtor_negociador_id UUID REFERENCES public.profiles(id),
  produtor_cotador_id UUID REFERENCES public.profiles(id),
  seguradora_id UUID REFERENCES public.seguradoras(id),
  segmento TEXT,
  valor_premio DECIMAL(15,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Em análise' CHECK (status IN ('Em análise', 'Aguardando cliente', 'Negócio fechado', 'Cancelada')),
  data_cotacao DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguradoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seguradoras policies (read-only for most users)
CREATE POLICY "Users can view seguradoras" ON public.seguradoras FOR SELECT USING (true);
CREATE POLICY "Only admins can modify seguradoras" ON public.seguradoras FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND papel = 'Administrador')
);

-- Clientes policies
CREATE POLICY "Users can view all clientes" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Users can create clientes" ON public.clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update clientes" ON public.clientes FOR UPDATE USING (true);
CREATE POLICY "Only admins can delete clientes" ON public.clientes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND papel = 'Administrador')
);

-- Cotacoes policies
CREATE POLICY "Users can view all cotacoes" ON public.cotacoes FOR SELECT USING (true);
CREATE POLICY "Users can create cotacoes" ON public.cotacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update cotacoes" ON public.cotacoes FOR UPDATE USING (true);
CREATE POLICY "Only admins can delete cotacoes" ON public.cotacoes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND papel = 'Administrador')
);

-- Insert sample data
INSERT INTO public.seguradoras (nome, codigo) VALUES 
  ('Tokio Marine', 'TOKI'),
  ('Bradesco Seguros', 'BRAD'),
  ('SulAmérica', 'SULA'),
  ('Porto Seguro', 'PORT'),
  ('Allianz Seguros', 'ALLI');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cotacoes_updated_at
  BEFORE UPDATE ON public.cotacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate cotacao number
CREATE OR REPLACE FUNCTION public.generate_cotacao_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  sequence_num INTEGER;
  cotacao_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_cotacao FROM 6) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.cotacoes
  WHERE numero_cotacao LIKE current_year || '-%';
  
  -- Format: YYYY-000001
  cotacao_number := current_year || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN cotacao_number;
END;
$$ LANGUAGE plpgsql SET search_path = public;