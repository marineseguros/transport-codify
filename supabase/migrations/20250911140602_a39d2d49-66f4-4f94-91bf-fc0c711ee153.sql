-- Drop existing foreign key constraints that are incorrectly pointing to profiles
ALTER TABLE public.cotacoes DROP CONSTRAINT IF EXISTS cotacoes_produtor_origem_id_fkey;
ALTER TABLE public.cotacoes DROP CONSTRAINT IF EXISTS cotacoes_produtor_negociador_id_fkey;
ALTER TABLE public.cotacoes DROP CONSTRAINT IF EXISTS cotacoes_produtor_cotador_id_fkey;

-- Add correct foreign key constraints pointing to produtores table
ALTER TABLE public.cotacoes 
ADD CONSTRAINT cotacoes_produtor_origem_id_fkey 
FOREIGN KEY (produtor_origem_id) REFERENCES public.produtores(id);

ALTER TABLE public.cotacoes 
ADD CONSTRAINT cotacoes_produtor_negociador_id_fkey 
FOREIGN KEY (produtor_negociador_id) REFERENCES public.produtores(id);

ALTER TABLE public.cotacoes 
ADD CONSTRAINT cotacoes_produtor_cotador_id_fkey 
FOREIGN KEY (produtor_cotador_id) REFERENCES public.produtores(id);

-- Add missing foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
    -- Add ramo foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'cotacoes' AND constraint_name = 'cotacoes_ramo_id_fkey'
    ) THEN
        ALTER TABLE public.cotacoes 
        ADD CONSTRAINT cotacoes_ramo_id_fkey 
        FOREIGN KEY (ramo_id) REFERENCES public.ramos(id);
    END IF;

    -- Add captacao foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'cotacoes' AND constraint_name = 'cotacoes_captacao_id_fkey'
    ) THEN
        ALTER TABLE public.cotacoes 
        ADD CONSTRAINT cotacoes_captacao_id_fkey 
        FOREIGN KEY (captacao_id) REFERENCES public.captacao(id);
    END IF;

    -- Add status_seguradora foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'cotacoes' AND constraint_name = 'cotacoes_status_seguradora_id_fkey'
    ) THEN
        ALTER TABLE public.cotacoes 
        ADD CONSTRAINT cotacoes_status_seguradora_id_fkey 
        FOREIGN KEY (status_seguradora_id) REFERENCES public.status_seguradora(id);
    END IF;
END $$;