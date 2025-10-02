-- Primeiro, vamos adicionar o novo status "Alocada Outra" como válido
-- Não há constraint CHECK na tabela, então podemos simplesmente usar o novo valor

-- Criar uma função que será executada quando uma cotação for fechada
CREATE OR REPLACE FUNCTION public.update_cotacoes_on_fechamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status foi alterado para 'Negócio fechado'
  IF NEW.status = 'Negócio fechado' AND (OLD.status IS NULL OR OLD.status != 'Negócio fechado') THEN
    -- Atualizar todas as outras cotações do mesmo segurado e ramo
    -- mas com seguradoras diferentes para 'Alocada Outra'
    UPDATE public.cotacoes
    SET 
      status = 'Alocada Outra',
      updated_at = now()
    WHERE 
      cpf_cnpj = NEW.cpf_cnpj 
      AND ramo_id = NEW.ramo_id
      AND seguradora_id != NEW.seguradora_id
      AND id != NEW.id
      AND status != 'Negócio fechado'; -- Não alterar outras que já foram fechadas
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar o trigger que executa a função após atualização
DROP TRIGGER IF EXISTS trigger_update_cotacoes_on_fechamento ON public.cotacoes;
CREATE TRIGGER trigger_update_cotacoes_on_fechamento
  AFTER UPDATE ON public.cotacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cotacoes_on_fechamento();