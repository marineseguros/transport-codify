DROP POLICY IF EXISTS "Owners or admins can view clientes" ON public.clientes;

CREATE POLICY "Active users can view all clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.ativo = true
  )
);