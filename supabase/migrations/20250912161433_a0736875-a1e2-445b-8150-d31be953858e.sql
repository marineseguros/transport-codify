-- Fix security vulnerability: Restrict produtores table access to authenticated users only
-- Remove public access to employee contact information

-- Drop the existing problematic public SELECT policy
DROP POLICY IF EXISTS "produtores_select_public" ON public.produtores;

-- Create a new policy that requires authentication (using IF NOT EXISTS to avoid conflicts)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'produtores' 
        AND policyname = 'produtores_select_authenticated'
    ) THEN
        CREATE POLICY "produtores_select_authenticated" 
        ON public.produtores 
        FOR SELECT 
        TO authenticated
        USING (ativo = true);
    END IF;
END $$;

-- Drop and recreate INSERT/UPDATE policies to ensure they're authenticated-only
DROP POLICY IF EXISTS "produtores_insert_public" ON public.produtores;
DROP POLICY IF EXISTS "produtores_update_public" ON public.produtores;

-- Recreate with authentication requirement
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'produtores' 
        AND policyname = 'produtores_insert_authenticated'
    ) THEN
        CREATE POLICY "produtores_insert_authenticated" 
        ON public.produtores 
        FOR INSERT 
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'produtores' 
        AND policyname = 'produtores_update_authenticated'
    ) THEN
        CREATE POLICY "produtores_update_authenticated" 
        ON public.produtores 
        FOR UPDATE 
        TO authenticated
        USING (true);
    END IF;
END $$;