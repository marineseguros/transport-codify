-- Add ordem column to seguradoras table
ALTER TABLE public.seguradoras ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;

-- Add ordem column to ramos table
ALTER TABLE public.ramos ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;

-- Add ordem column to produtores table
ALTER TABLE public.produtores ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;

-- Set initial ordem values based on current order
UPDATE public.seguradoras SET ordem = row_number FROM (
  SELECT id, row_number() OVER (ORDER BY nome) as row_number
  FROM public.seguradoras
) sub WHERE seguradoras.id = sub.id;

UPDATE public.ramos SET ordem = row_number FROM (
  SELECT id, row_number() OVER (ORDER BY descricao) as row_number
  FROM public.ramos
) sub WHERE ramos.id = sub.id;

UPDATE public.produtores SET ordem = row_number FROM (
  SELECT id, row_number() OVER (ORDER BY nome) as row_number
  FROM public.produtores
) sub WHERE produtores.id = sub.id;