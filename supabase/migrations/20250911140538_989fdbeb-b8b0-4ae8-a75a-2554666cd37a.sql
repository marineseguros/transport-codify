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

-- Also add other missing foreign key constraints for consistency
ALTER TABLE public.cotacoes 
ADD CONSTRAINT cotacoes_seguradora_id_fkey 
FOREIGN KEY (seguradora_id) REFERENCES public.seguradoras(id);

ALTER TABLE public.cotacoes 
ADD CONSTRAINT cotacoes_ramo_id_fkey 
FOREIGN KEY (ramo_id) REFERENCES public.ramos(id);

ALTER TABLE public.cotacoes 
ADD CONSTRAINT cotacoes_captacao_id_fkey 
FOREIGN KEY (captacao_id) REFERENCES public.captacao(id);

ALTER TABLE public.cotacoes 
ADD CONSTRAINT cotacoes_status_seguradora_id_fkey 
FOREIGN KEY (status_seguradora_id) REFERENCES public.status_seguradora(id);