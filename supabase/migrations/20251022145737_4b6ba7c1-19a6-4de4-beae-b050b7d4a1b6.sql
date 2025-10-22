-- Criar tabela de auditoria campo a campo para cotações
CREATE TABLE IF NOT EXISTS public.cotacoes_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL,
  numero_cotacao text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  field_name text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cotacoes_audit_log ENABLE ROW LEVEL SECURITY;

-- Política: todos os usuários autenticados podem visualizar o log
CREATE POLICY "All authenticated users can view audit log"
ON public.cotacoes_audit_log
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Criar índice para performance
CREATE INDEX idx_cotacoes_audit_log_cotacao_id ON public.cotacoes_audit_log(cotacao_id);
CREATE INDEX idx_cotacoes_audit_log_changed_at ON public.cotacoes_audit_log(changed_at DESC);

-- Função para salvar auditoria campo a campo
CREATE OR REPLACE FUNCTION public.audit_cotacao_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  field_record RECORD;
  field_name_map JSONB;
BEGIN
  -- Mapeamento de nomes de campos para português
  field_name_map := '{
    "segurado": "Segurado",
    "cpf_cnpj": "CPF/CNPJ",
    "cliente_id": "Cliente",
    "unidade_id": "Unidade",
    "produtor_origem_id": "Produtor Origem",
    "produtor_negociador_id": "Produtor Negociador",
    "produtor_cotador_id": "Produtor Cotador",
    "seguradora_id": "Seguradora",
    "ramo_id": "Ramo",
    "captacao_id": "Captação",
    "status_seguradora_id": "Status Seguradora",
    "segmento": "Segmento",
    "tipo": "Tipo",
    "valor_premio": "Prêmio",
    "status": "Status",
    "data_cotacao": "Data Cotação",
    "data_fechamento": "Data Fechamento",
    "num_proposta": "Nº Proposta",
    "motivo_recusa": "Motivo Recusa",
    "comentarios": "Comentários",
    "observacoes": "Observações"
  }'::jsonb;

  -- Verificar cada campo alterado
  IF TG_OP = 'UPDATE' THEN
    -- Segurado
    IF OLD.segurado IS DISTINCT FROM NEW.segurado THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'segurado', OLD.segurado, NEW.segurado);
    END IF;
    
    -- CPF/CNPJ
    IF OLD.cpf_cnpj IS DISTINCT FROM NEW.cpf_cnpj THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'cpf_cnpj', OLD.cpf_cnpj, NEW.cpf_cnpj);
    END IF;
    
    -- Valor Prêmio
    IF OLD.valor_premio IS DISTINCT FROM NEW.valor_premio THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'valor_premio', OLD.valor_premio::text, NEW.valor_premio::text);
    END IF;
    
    -- Status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'status', OLD.status, NEW.status);
    END IF;
    
    -- Data Cotação
    IF OLD.data_cotacao IS DISTINCT FROM NEW.data_cotacao THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'data_cotacao', OLD.data_cotacao::text, NEW.data_cotacao::text);
    END IF;
    
    -- Data Fechamento
    IF OLD.data_fechamento IS DISTINCT FROM NEW.data_fechamento THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'data_fechamento', OLD.data_fechamento::text, NEW.data_fechamento::text);
    END IF;
    
    -- Segmento
    IF OLD.segmento IS DISTINCT FROM NEW.segmento THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'segmento', OLD.segmento, NEW.segmento);
    END IF;
    
    -- Tipo
    IF OLD.tipo IS DISTINCT FROM NEW.tipo THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'tipo', OLD.tipo, NEW.tipo);
    END IF;
    
    -- Nº Proposta
    IF OLD.num_proposta IS DISTINCT FROM NEW.num_proposta THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'num_proposta', OLD.num_proposta, NEW.num_proposta);
    END IF;
    
    -- Motivo Recusa
    IF OLD.motivo_recusa IS DISTINCT FROM NEW.motivo_recusa THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'motivo_recusa', OLD.motivo_recusa, NEW.motivo_recusa);
    END IF;
    
    -- Comentários
    IF OLD.comentarios IS DISTINCT FROM NEW.comentarios THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'comentarios', OLD.comentarios, NEW.comentarios);
    END IF;
    
    -- Observações
    IF OLD.observacoes IS DISTINCT FROM NEW.observacoes THEN
      INSERT INTO public.cotacoes_audit_log (cotacao_id, numero_cotacao, changed_by, changed_at, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.numero_cotacao, auth.uid(), now(), field_name_map->>'observacoes', OLD.observacoes, NEW.observacoes);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para auditoria
DROP TRIGGER IF EXISTS audit_cotacao_changes_trigger ON public.cotacoes;
CREATE TRIGGER audit_cotacao_changes_trigger
AFTER UPDATE ON public.cotacoes
FOR EACH ROW
EXECUTE FUNCTION public.audit_cotacao_changes();