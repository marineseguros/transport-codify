-- Remover a constraint antiga
ALTER TABLE public.cotacoes DROP CONSTRAINT IF EXISTS cotacoes_status_check;

-- Adicionar a nova constraint com "Fechamento congênere" incluído
ALTER TABLE public.cotacoes 
ADD CONSTRAINT cotacoes_status_check 
CHECK (status = ANY (ARRAY['Em cotação'::text, 'Negócio fechado'::text, 'Declinado'::text, 'Fechamento congênere'::text]));