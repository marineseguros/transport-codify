-- Remover a constraint antiga
ALTER TABLE public.cotacoes DROP CONSTRAINT IF EXISTS cotacoes_status_check;

-- Adicionar a nova constraint com "Alocada Outra" incluído
ALTER TABLE public.cotacoes 
ADD CONSTRAINT cotacoes_status_check 
CHECK (status = ANY (ARRAY['Em cotação'::text, 'Negócio fechado'::text, 'Declinado'::text, 'Alocada Outra'::text]));