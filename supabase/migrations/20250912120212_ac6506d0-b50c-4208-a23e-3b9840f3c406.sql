-- Enable RLS on the tmp_cotacoes_import table that was missing it
-- This table appears to be used for CSV import functionality

ALTER TABLE public.tmp_cotacoes_import ENABLE ROW LEVEL SECURITY;

-- Create appropriate policies for the temporary import table
-- Only authenticated users should be able to use this table for imports
CREATE POLICY "Authenticated users can manage import data" 
ON public.tmp_cotacoes_import 
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);