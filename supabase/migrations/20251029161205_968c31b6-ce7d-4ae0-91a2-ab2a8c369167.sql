-- Fix set_user_module to use empty search_path
CREATE OR REPLACE FUNCTION public.set_user_module()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.modulo IS NULL THEN
    NEW.modulo := (SELECT modulo FROM public.profiles WHERE user_id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$;