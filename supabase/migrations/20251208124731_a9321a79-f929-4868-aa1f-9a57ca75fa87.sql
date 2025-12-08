-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all produtores" ON produtores;

-- Create policy for admins/managers/CEOs to view all produtores
CREATE POLICY "Admins managers ceos can view all produtores" 
ON produtores FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.papel IN ('Administrador', 'Gerente', 'CEO')
    AND profiles.ativo = true
  )
);

-- Allow users to see their own produtor record (matching by email)
CREATE POLICY "Users can view their own produtor record"
ON produtores FOR SELECT USING (
  email = (SELECT email FROM profiles WHERE user_id = auth.uid() AND ativo = true)
);