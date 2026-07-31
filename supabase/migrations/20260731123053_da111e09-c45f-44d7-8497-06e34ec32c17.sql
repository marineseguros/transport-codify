ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS captacao_feira_tipo text,
  ADD COLUMN IF NOT EXISTS captacao_parceria_tipo text,
  ADD COLUMN IF NOT EXISTS captacao_canal_outro text;