-- Create table to store quote history/audit trail
CREATE TABLE IF NOT EXISTS public.cotacoes_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id UUID NOT NULL,
  numero_cotacao TEXT NOT NULL,
  cliente_id UUID,
  unidade_id UUID,
  segurado TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  produtor_origem_id UUID,
  produtor_negociador_id UUID,
  produtor_cotador_id UUID,
  seguradora_id UUID,
  ramo_id UUID,
  captacao_id UUID,
  status_seguradora_id UUID,
  segmento TEXT,
  tipo TEXT,
  valor_premio NUMERIC DEFAULT 0,
  status TEXT NOT NULL,
  data_cotacao DATE NOT NULL,
  data_fechamento DATE,
  num_proposta TEXT,
  motivo_recusa TEXT,
  comentarios TEXT,
  observacoes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_type TEXT NOT NULL DEFAULT 'update'
);

-- Enable RLS
ALTER TABLE public.cotacoes_historico ENABLE ROW LEVEL SECURITY;

-- Create policies for cotacoes_historico (same as cotacoes)
CREATE POLICY "Admin can view all history"
ON public.cotacoes_historico
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel = 'Administrador'::text 
    AND p.ativo = true
  )
);

CREATE POLICY "Faturamento can view all history"
ON public.cotacoes_historico
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel = 'Faturamento'::text 
    AND p.ativo = true
  )
);

CREATE POLICY "Producer can view related history"
ON public.cotacoes_historico
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.ativo = true 
    AND EXISTS (
      SELECT 1 FROM produtores prod
      WHERE prod.email = p.email 
      AND prod.ativo = true 
      AND (
        prod.id = cotacoes_historico.produtor_origem_id 
        OR prod.id = cotacoes_historico.produtor_negociador_id 
        OR prod.id = cotacoes_historico.produtor_cotador_id
      )
    )
  )
);

-- Create function to save history on cotacao changes
CREATE OR REPLACE FUNCTION public.save_cotacao_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the OLD state into history table on UPDATE
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.cotacoes_historico (
      cotacao_id, numero_cotacao, cliente_id, unidade_id, segurado, cpf_cnpj,
      produtor_origem_id, produtor_negociador_id, produtor_cotador_id,
      seguradora_id, ramo_id, captacao_id, status_seguradora_id,
      segmento, tipo, valor_premio, status, data_cotacao, data_fechamento,
      num_proposta, motivo_recusa, comentarios, observacoes,
      changed_by, changed_at, change_type
    ) VALUES (
      OLD.id, OLD.numero_cotacao, OLD.cliente_id, OLD.unidade_id, OLD.segurado, OLD.cpf_cnpj,
      OLD.produtor_origem_id, OLD.produtor_negociador_id, OLD.produtor_cotador_id,
      OLD.seguradora_id, OLD.ramo_id, OLD.captacao_id, OLD.status_seguradora_id,
      OLD.segmento, OLD.tipo, OLD.valor_premio, OLD.status, OLD.data_cotacao, OLD.data_fechamento,
      OLD.num_proposta, OLD.motivo_recusa, OLD.comentarios, OLD.observacoes,
      auth.uid(), OLD.updated_at, 'update'
    );
  END IF;
  
  -- Insert the OLD state into history table on DELETE
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.cotacoes_historico (
      cotacao_id, numero_cotacao, cliente_id, unidade_id, segurado, cpf_cnpj,
      produtor_origem_id, produtor_negociador_id, produtor_cotador_id,
      seguradora_id, ramo_id, captacao_id, status_seguradora_id,
      segmento, tipo, valor_premio, status, data_cotacao, data_fechamento,
      num_proposta, motivo_recusa, comentarios, observacoes,
      changed_by, changed_at, change_type
    ) VALUES (
      OLD.id, OLD.numero_cotacao, OLD.cliente_id, OLD.unidade_id, OLD.segurado, OLD.cpf_cnpj,
      OLD.produtor_origem_id, OLD.produtor_negociador_id, OLD.produtor_cotador_id,
      OLD.seguradora_id, OLD.ramo_id, OLD.captacao_id, OLD.status_seguradora_id,
      OLD.segmento, OLD.tipo, OLD.valor_premio, OLD.status, OLD.data_cotacao, OLD.data_fechamento,
      OLD.num_proposta, OLD.motivo_recusa, OLD.comentarios, OLD.observacoes,
      auth.uid(), now(), 'delete'
    );
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically save history
CREATE TRIGGER save_cotacao_history_trigger
BEFORE UPDATE OR DELETE ON public.cotacoes
FOR EACH ROW
EXECUTE FUNCTION public.save_cotacao_history();

-- Create index for faster queries
CREATE INDEX idx_cotacoes_historico_cotacao_id ON public.cotacoes_historico(cotacao_id);
CREATE INDEX idx_cotacoes_historico_numero ON public.cotacoes_historico(numero_cotacao);