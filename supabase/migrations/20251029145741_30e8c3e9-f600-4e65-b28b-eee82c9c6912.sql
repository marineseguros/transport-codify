-- Fix security warning for set_user_module function
CREATE OR REPLACE FUNCTION public.set_user_module()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.modulo IS NULL THEN
    NEW.modulo := (SELECT modulo FROM profiles WHERE user_id = auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;