-- Add authorization check to update_cotacoes_on_fechamento function
CREATE OR REPLACE FUNCTION public.update_cotacoes_on_fechamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify user has permission to trigger cascading updates
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND papel IN ('Administrador', 'Gerente', 'CEO')
    AND ativo = true
  ) THEN
    -- Allow if user's module matches the quote being modified
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND modulo = (SELECT modulo FROM cotacoes WHERE id = NEW.id LIMIT 1)
      AND ativo = true
    ) THEN
      RAISE EXCEPTION 'Unauthorized to trigger cascading quote updates';
    END IF;
  END IF;

  -- Se o status foi alterado para 'Negócio fechado'
  IF NEW.status = 'Negócio fechado' AND (OLD.status IS NULL OR OLD.status != 'Negócio fechado') THEN
    -- Atualizar todas as outras cotações do mesmo segurado e ramo
    -- mas com seguradoras diferentes para 'Fechamento congênere'
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
  
  -- Se o status foi alterado para 'Declinado'
  IF NEW.status = 'Declinado' AND (OLD.status IS NULL OR OLD.status != 'Declinado') THEN
    -- Atualizar todas as outras cotações do mesmo segurado e ramo para 'Declinado'
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