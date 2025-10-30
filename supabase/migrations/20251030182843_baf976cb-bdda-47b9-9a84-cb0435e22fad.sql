-- Remover a check constraint antiga primeiro
ALTER TABLE cotacoes DROP CONSTRAINT IF EXISTS cotacoes_status_check;

-- Atualizar os registros existentes de "Alocada Outra" para "Fechamento congênere"
UPDATE cotacoes 
SET status = 'Fechamento congênere' 
WHERE status = 'Alocada Outra';

-- Adicionar nova constraint com os status corretos
ALTER TABLE cotacoes ADD CONSTRAINT cotacoes_status_check 
CHECK (status IN ('Em cotação', 'Negócio fechado', 'Declinado', 'Fechamento congênere'));

-- Atualizar a função para usar "Fechamento congênere"
CREATE OR REPLACE FUNCTION public.update_cotacoes_on_fechamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'Negócio fechado' AND (OLD.status IS NULL OR OLD.status != 'Negócio fechado') THEN
    UPDATE public.cotacoes
    SET 
      status = 'Fechamento congênere',
      updated_at = now()
    WHERE 
      cpf_cnpj = NEW.cpf_cnpj 
      AND ramo_id = NEW.ramo_id
      AND seguradora_id != NEW.seguradora_id
      AND id != NEW.id
      AND status != 'Negócio fechado';
  END IF;
  
  IF NEW.status = 'Declinado' AND (OLD.status IS NULL OR OLD.status != 'Declinado') THEN
    UPDATE public.cotacoes
    SET 
      status = 'Declinado',
      updated_at = now()
    WHERE 
      cpf_cnpj = NEW.cpf_cnpj 
      AND ramo_id = NEW.ramo_id
      AND id != NEW.id
      AND status NOT IN ('Negócio fechado', 'Declinado');
  END IF;
  
  RETURN NEW;
END;
$function$;