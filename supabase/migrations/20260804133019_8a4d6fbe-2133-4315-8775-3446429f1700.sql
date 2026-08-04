CREATE OR REPLACE FUNCTION public.validate_inicio_vigencia_fechado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Negócio fechado'
     AND NEW.data_fechamento IS NOT NULL
     AND NEW.inicio_vigencia IS NULL THEN
    RAISE EXCEPTION 'A Data de Início da Vigência é obrigatória para Negócios Fechados.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_inicio_vigencia_fechado() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_inicio_vigencia_fechado ON public.cotacoes;
CREATE TRIGGER trg_validate_inicio_vigencia_fechado
BEFORE INSERT OR UPDATE ON public.cotacoes
FOR EACH ROW EXECUTE FUNCTION public.validate_inicio_vigencia_fechado();