CREATE OR REPLACE FUNCTION public.update_cotacoes_on_fechamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$BEGIN
  -------------------------------------------------------------------
  -- LIBERAR UPDATES EXECUTADOS VIA SQL EDITOR (auth.uid() IS NULL)
  -------------------------------------------------------------------
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  -------------------------------------------------------------------
  -- LIBERAR updates que alteram apenas datas de vigência
  -------------------------------------------------------------------
  IF (
      (OLD.inicio_vigencia IS DISTINCT FROM NEW.inicio_vigencia)
      OR
      (OLD.fim_vigencia IS DISTINCT FROM NEW.fim_vigencia)
     )
     -- garante que nenhum outro campo sensível mudou
     AND OLD.status = NEW.status
     AND OLD.seguradora_id = NEW.seguradora_id
     AND OLD.ramo_id = NEW.ramo_id
     AND OLD.cpf_cnpj = NEW.cpf_cnpj
  THEN
      RETURN NEW; -- sai do trigger sem aplicar regras de bloqueio
  END IF;
  -------------------------------------------------------------------

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

  -- ÚNICA regra de cascata: Negócio fechado → Fechamento congênere
  -- Quando status alterado para "Negócio fechado", outras cotações do mesmo 
  -- segurado + ramo (com seguradoras diferentes) são marcadas como "Fechamento congênere"
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
  
  -- REMOVIDO: Cascata para "Declinado" foi removida conforme solicitação
  -- Alterações para "Declinado", "Em Cotação" ou qualquer outro status 
  -- agora são individuais e afetam apenas a cotação editada
  
  RETURN NEW;
END;$function$;