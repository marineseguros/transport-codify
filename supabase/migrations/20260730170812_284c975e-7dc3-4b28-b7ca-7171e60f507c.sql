ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS captacao_cliente_origem text,
  ADD COLUMN IF NOT EXISTS captacao_feira text,
  ADD COLUMN IF NOT EXISTS captacao_evento text,
  ADD COLUMN IF NOT EXISTS captacao_cliente_indicador text,
  ADD COLUMN IF NOT EXISTS captacao_colaborador text,
  ADD COLUMN IF NOT EXISTS captacao_indicador_nome text,
  ADD COLUMN IF NOT EXISTS captacao_indicador_empresa_flag text,
  ADD COLUMN IF NOT EXISTS captacao_indicador_empresa text,
  ADD COLUMN IF NOT EXISTS captacao_caminho_indicacao text,
  ADD COLUMN IF NOT EXISTS captacao_parceira text,
  ADD COLUMN IF NOT EXISTS captacao_canal_prospeccao text;