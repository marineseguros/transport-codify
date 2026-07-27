
-- 1) Permitir que a trigger de bloqueio deixe passar updates que alteram somente o nome do segurado
CREATE OR REPLACE FUNCTION public.update_cotacoes_on_fechamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Liberar execuções sem auth (SQL editor / jobs)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Liberar updates que alteram apenas datas de vigência
  IF (
      (OLD.inicio_vigencia IS DISTINCT FROM NEW.inicio_vigencia)
      OR
      (OLD.fim_vigencia IS DISTINCT FROM NEW.fim_vigencia)
     )
     AND OLD.status = NEW.status
     AND OLD.seguradora_id = NEW.seguradora_id
     AND OLD.ramo_id = NEW.ramo_id
     AND OLD.cpf_cnpj = NEW.cpf_cnpj
  THEN
      RETURN NEW;
  END IF;

  -- Liberar updates que alteram somente o nome do segurado (sync a partir do cadastro de clientes)
  IF OLD.segurado IS DISTINCT FROM NEW.segurado
     AND OLD.status = NEW.status
     AND OLD.seguradora_id IS NOT DISTINCT FROM NEW.seguradora_id
     AND OLD.ramo_id IS NOT DISTINCT FROM NEW.ramo_id
     AND OLD.cpf_cnpj = NEW.cpf_cnpj
     AND OLD.cliente_id IS NOT DISTINCT FROM NEW.cliente_id
     AND OLD.valor_premio IS NOT DISTINCT FROM NEW.valor_premio
     AND OLD.data_cotacao IS NOT DISTINCT FROM NEW.data_cotacao
     AND OLD.data_fechamento IS NOT DISTINCT FROM NEW.data_fechamento
  THEN
      RETURN NEW;
  END IF;

  -- Verificar permissão para triggers em cascata
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND papel IN ('Administrador', 'Gerente', 'CEO')
    AND ativo = true
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND modulo = (SELECT modulo FROM cotacoes WHERE id = NEW.id LIMIT 1)
      AND ativo = true
    ) THEN
      RAISE EXCEPTION 'Unauthorized to trigger cascading quote updates';
    END IF;
  END IF;

  -- Cascata: Negócio fechado -> Fechamento congênere
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

  RETURN NEW;
END;
$function$;

-- 2) Nova função + trigger: propaga alteração do nome do cliente para todas as cotações vinculadas
CREATE OR REPLACE FUNCTION public.sync_cotacoes_segurado_from_cliente()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.segurado IS DISTINCT FROM NEW.segurado THEN
    UPDATE public.cotacoes
    SET segurado = NEW.segurado,
        updated_at = now()
    WHERE (cliente_id = NEW.id OR cpf_cnpj = NEW.cpf_cnpj)
      AND segurado IS DISTINCT FROM NEW.segurado;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_cotacoes_segurado ON public.clientes;
CREATE TRIGGER trg_sync_cotacoes_segurado
AFTER UPDATE OF segurado ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.sync_cotacoes_segurado_from_cliente();

-- 3) Sincronização retroativa: alinhar cotações existentes com o cadastro atual do cliente
UPDATE public.cotacoes c
SET segurado = cl.segurado,
    updated_at = now()
FROM public.clientes cl
WHERE (c.cliente_id = cl.id OR c.cpf_cnpj = cl.cpf_cnpj)
  AND c.segurado IS DISTINCT FROM cl.segurado;
