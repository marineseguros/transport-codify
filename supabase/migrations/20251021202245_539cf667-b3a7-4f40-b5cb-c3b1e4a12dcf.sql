-- Adicionar coluna ramo_agrupado à tabela ramos
ALTER TABLE public.ramos 
ADD COLUMN ramo_agrupado TEXT;

-- Popular a coluna com os agrupamentos conforme especificado
-- Transportes (códigos 07, 08, 09, 10, 11, 12)
UPDATE public.ramos 
SET ramo_agrupado = 'Transportes'
WHERE codigo IN ('07', '08', '09', '10', '11', '12');

-- Outros (códigos 22, 23, 27, 29)
UPDATE public.ramos 
SET ramo_agrupado = 'Outros'
WHERE codigo IN ('22', '23', '27', '29');

-- Ambiental (código 34)
UPDATE public.ramos 
SET ramo_agrupado = 'Ambiental'
WHERE codigo = '34';

-- RC-V (código 254)
UPDATE public.ramos 
SET ramo_agrupado = 'RC-V'
WHERE codigo = '254';

-- Garantia (código 14)
UPDATE public.ramos 
SET ramo_agrupado = 'Garantia'
WHERE codigo = '14';