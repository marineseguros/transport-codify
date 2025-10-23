-- Add observacoes and captacao_id fields to clientes table
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS captacao_id UUID REFERENCES public.captacao(id);

-- Add index for better performance on captacao_id lookups
CREATE INDEX IF NOT EXISTS idx_clientes_captacao_id ON public.clientes(captacao_id);

-- Add comment for documentation
COMMENT ON COLUMN public.clientes.observacoes IS 'Informações adicionais, lembretes ou observações sobre o cliente';
COMMENT ON COLUMN public.clientes.captacao_id IS 'Referência para a origem de captação do cliente';