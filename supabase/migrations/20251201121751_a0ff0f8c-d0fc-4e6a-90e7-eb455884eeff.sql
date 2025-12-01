-- Adicionar campos de vigência à tabela cotacoes
ALTER TABLE public.cotacoes
ADD COLUMN IF NOT EXISTS inicio_vigencia date,
ADD COLUMN IF NOT EXISTS fim_vigencia date;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_cotacoes_inicio_vigencia ON public.cotacoes(inicio_vigencia);
CREATE INDEX IF NOT EXISTS idx_cotacoes_fim_vigencia ON public.cotacoes(fim_vigencia);

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.cotacoes.inicio_vigencia IS 'Data de início da vigência do seguro';
COMMENT ON COLUMN public.cotacoes.fim_vigencia IS 'Data de fim da vigência do seguro';