-- Fix util_parse_br_timestamptz function to include search_path
CREATE OR REPLACE FUNCTION public.util_parse_br_timestamptz(v text, tz text DEFAULT 'America/Sao_Paulo'::text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  s text := nullif(trim(v), '');
begin
  if s is null then
    return null;
  end if;

  -- 22/10/2025
  if s ~ '^\d{2}/\d{2}/\d{4}$' then
    return (to_timestamp(s, 'DD/MM/YYYY') at time zone tz);
  end if;

  -- 22/10/2025 14:30
  if s ~ '^\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}$' then
    return (to_timestamp(s, 'DD/MM/YYYY HH24:MI') at time zone tz);
  end if;

  -- 22/10/2025 14:30:05
  if s ~ '^\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2}$' then
    return (to_timestamp(s, 'DD/MM/YYYY HH24:MI:SS') at time zone tz);
  end if;

  -- ISO já válido (2025-10-22T14:30:00Z, +00:00 etc.)
  begin
    return s::timestamptz;
  exception when others then
    null;
  end;

  raise exception 'Formato de data/hora inválido: %', v;
end
$function$;