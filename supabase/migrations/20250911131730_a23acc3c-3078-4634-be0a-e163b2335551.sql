-- Criar tabela de produtores
CREATE TABLE public.produtores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT,
  papel TEXT NOT NULL DEFAULT 'Produtor',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de ramos
CREATE TABLE public.ramos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de captação
CREATE TABLE public.captacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de status da seguradora
CREATE TABLE public.status_seguradora (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campos faltantes na tabela cotações
ALTER TABLE public.cotacoes 
ADD COLUMN ramo_id UUID REFERENCES public.ramos(id),
ADD COLUMN tipo TEXT DEFAULT 'Nova',
ADD COLUMN captacao_id UUID REFERENCES public.captacao(id),
ADD COLUMN status_seguradora_id UUID REFERENCES public.status_seguradora(id),
ADD COLUMN data_fechamento DATE,
ADD COLUMN num_apolice TEXT,
ADD COLUMN motivo_recusa TEXT,
ADD COLUMN comentarios TEXT;

-- Enable RLS nas novas tabelas
ALTER TABLE public.produtores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ramos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_seguradora ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para produtores
CREATE POLICY "Users can view all produtores" ON public.produtores FOR SELECT USING (true);
CREATE POLICY "Users can create produtores" ON public.produtores FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update produtores" ON public.produtores FOR UPDATE USING (true);
CREATE POLICY "Only admins can delete produtores" ON public.produtores FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.papel = 'Administrador'
  )
);

-- Criar políticas RLS para ramos
CREATE POLICY "Users can view ramos" ON public.ramos FOR SELECT USING (true);
CREATE POLICY "Only admins can modify ramos" ON public.ramos FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.papel = 'Administrador'
  )
);

-- Criar políticas RLS para captação
CREATE POLICY "Users can view captacao" ON public.captacao FOR SELECT USING (true);
CREATE POLICY "Only admins can modify captacao" ON public.captacao FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.papel = 'Administrador'
  )
);

-- Criar políticas RLS para status_seguradora
CREATE POLICY "Users can view status_seguradora" ON public.status_seguradora FOR SELECT USING (true);
CREATE POLICY "Only admins can modify status_seguradora" ON public.status_seguradora FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.papel = 'Administrador'
  )
);

-- Criar trigger para updated_at na tabela produtores
CREATE TRIGGER update_produtores_updated_at
  BEFORE UPDATE ON public.produtores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais dos produtores
INSERT INTO public.produtores (id, nome, email, telefone, papel) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'João Silva', 'joao.silva@email.com', '(11) 99999-1111', 'Produtor'),
('550e8400-e29b-41d4-a716-446655440002', 'Maria Santos', 'maria.santos@email.com', '(11) 99999-2222', 'Produtor'),
('550e8400-e29b-41d4-a716-446655440003', 'Pedro Oliveira', 'pedro.oliveira@email.com', '(11) 99999-3333', 'Produtor'),
('550e8400-e29b-41d4-a716-446655440004', 'Ana Costa', 'ana.costa@email.com', '(11) 99999-4444', 'Produtor'),
('550e8400-e29b-41d4-a716-446655440005', 'Carlos Ferreira', 'carlos.ferreira@email.com', '(11) 99999-5555', 'Produtor');

-- Inserir dados iniciais dos ramos
INSERT INTO public.ramos (id, codigo, descricao) VALUES
('550e8400-e29b-41d4-a716-446655440011', '01', 'Auto'),
('550e8400-e29b-41d4-a716-446655440012', '02', 'Residencial'),
('550e8400-e29b-41d4-a716-446655440013', '03', 'Empresarial'),
('550e8400-e29b-41d4-a716-446655440014', '04', 'Vida'),
('550e8400-e29b-41d4-a716-446655440015', '05', 'Saúde'),
('550e8400-e29b-41d4-a716-446655440016', '06', 'Viagem'),
('550e8400-e29b-41d4-a716-446655440017', '07', 'Responsabilidade Civil');

-- Inserir dados iniciais da captação
INSERT INTO public.captacao (id, descricao) VALUES
('550e8400-e29b-41d4-a716-446655440021', 'Indicação'),
('550e8400-e29b-41d4-a716-446655440022', 'Telefone'),
('550e8400-e29b-41d4-a716-446655440023', 'Internet'),
('550e8400-e29b-41d4-a716-446655440024', 'Visita'),
('550e8400-e29b-41d4-a716-446655440025', 'E-mail'),
('550e8400-e29b-41d4-a716-446655440026', 'Renovação');

-- Inserir dados iniciais do status da seguradora
INSERT INTO public.status_seguradora (id, descricao, codigo) VALUES
('550e8400-e29b-41d4-a716-446655440031', 'COTAÇÃO', '1'),
('550e8400-e29b-41d4-a716-446655440032', 'APROVADO', '2'),
('550e8400-e29b-41d4-a716-446655440033', 'PENDENTE', '3'),
('550e8400-e29b-41d4-a716-446655440034', 'RECUSADO', '4'),
('550e8400-e29b-41d4-a716-446655440035', 'RECUSA', '5');