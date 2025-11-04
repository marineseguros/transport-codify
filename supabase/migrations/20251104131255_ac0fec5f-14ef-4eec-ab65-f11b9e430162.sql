-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete own clientes or admins can delete any" ON public.clientes;

-- Create a better delete policy that allows admins to delete any cliente
CREATE POLICY "Users can delete own clientes or admins can delete any" 
ON public.clientes 
FOR DELETE 
USING (
  -- User is admin, manager or CEO
  (EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.user_id = auth.uid() 
    AND p.papel IN ('Administrador', 'Gerente', 'CEO')
    AND p.ativo = true
  ))
  OR 
  -- User created the cliente
  (auth.uid() = created_by)
);