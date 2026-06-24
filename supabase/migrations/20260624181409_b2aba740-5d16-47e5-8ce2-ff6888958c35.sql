
-- Importações de realizado de prêmio (cabeçalho)
CREATE TABLE public.realizado_premio_importacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ano INTEGER NOT NULL,
  arquivo_nome TEXT,
  linhas_processadas INTEGER NOT NULL DEFAULT 0,
  total_valor NUMERIC(18,2) NOT NULL DEFAULT 0,
  modo TEXT NOT NULL DEFAULT 'substituir',
  observacoes TEXT,
  importado_por UUID,
  importado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.realizado_premio_importacoes TO authenticated;
GRANT ALL ON public.realizado_premio_importacoes TO service_role;

ALTER TABLE public.realizado_premio_importacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated podem ler importações"
  ON public.realizado_premio_importacoes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins gerenciam importações"
  ON public.realizado_premio_importacoes
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Linhas normalizadas do realizado
CREATE TABLE public.realizado_premio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id UUID NOT NULL REFERENCES public.realizado_premio_importacoes(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  inicio_vigencia DATE,
  seguradora_nome TEXT,
  ramo_nome TEXT,
  ramo_agrupado TEXT,
  cnpj TEXT,
  valor_premio NUMERIC(18,2) NOT NULL DEFAULT 0,
  produtor_nome TEXT NOT NULL,
  produtor_id UUID REFERENCES public.produtores(id) ON DELETE SET NULL,
  tipo_produtor TEXT NOT NULL DEFAULT 'Cotador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.realizado_premio TO authenticated;
GRANT ALL ON public.realizado_premio TO service_role;

ALTER TABLE public.realizado_premio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated podem ler realizado"
  ON public.realizado_premio
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins gerenciam realizado"
  ON public.realizado_premio
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE INDEX idx_realizado_premio_ano_mes ON public.realizado_premio (ano, mes);
CREATE INDEX idx_realizado_premio_produtor ON public.realizado_premio (ano, produtor_id);
CREATE INDEX idx_realizado_premio_produtor_nome ON public.realizado_premio (ano, lower(produtor_nome));
CREATE INDEX idx_realizado_premio_importacao ON public.realizado_premio (importacao_id);
