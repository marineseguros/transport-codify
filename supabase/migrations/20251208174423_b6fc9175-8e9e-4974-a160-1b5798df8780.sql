-- Add segmento and regra columns to ramos table
ALTER TABLE public.ramos 
ADD COLUMN IF NOT EXISTS segmento text,
ADD COLUMN IF NOT EXISTS regra text;

-- Update existing ramos with correct segmento and regra values based on descricao
UPDATE public.ramos SET
  segmento = CASE 
    WHEN UPPER(descricao) IN ('NACIONAL', 'EXPORTAÇÃO', 'IMPORTAÇÃO', 'RCTR-C', 'RC-DC', 'RCTR-VI', 'RCTA-C') THEN 'Transportes'
    WHEN UPPER(descricao) LIKE '%AVULSA%' OR UPPER(descricao) LIKE '%GARANTIA ADUANEIRA%' THEN 'Avulso'
    WHEN UPPER(descricao) = 'AMBIENTAL' THEN 'Ambiental'
    WHEN UPPER(descricao) = 'RC-V' THEN 'RC-V'
    ELSE 'Outros'
  END,
  regra = CASE 
    WHEN UPPER(descricao) IN ('RCTR-C', 'RC-DC', 'RC-V', 'NACIONAL') THEN 'Recorrente'
    ELSE 'Total'
  END
WHERE segmento IS NULL OR regra IS NULL;