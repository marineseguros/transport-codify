-- Add updated_by field to track who last modified the quote
ALTER TABLE public.cotacoes
ADD COLUMN updated_by UUID REFERENCES auth.users(id);

-- Create or replace function to set updated_by on insert/update
CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically set updated_by
CREATE TRIGGER set_cotacoes_updated_by
BEFORE INSERT OR UPDATE ON public.cotacoes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_by();

-- Backfill existing records with a default (optional, can be NULL)
-- This sets updated_by to the first active admin if no user info is available
UPDATE public.cotacoes
SET updated_by = (SELECT user_id FROM public.profiles WHERE papel = 'Administrador' AND ativo = true LIMIT 1)
WHERE updated_by IS NULL;