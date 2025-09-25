-- Update the producer policy to align with global rules (use produtor_cotador_id primarily)
DROP POLICY IF EXISTS "secure_producer_clientes_select" ON public.clientes;

CREATE POLICY "secure_producer_clientes_select" 
ON public.clientes 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.produtores prod ON prod.email = p.email
    JOIN public.cotacoes cot ON cot.produtor_cotador_id = prod.id
    WHERE p.user_id = auth.uid() 
    AND p.ativo = true 
    AND prod.ativo = true
    AND cot.cliente_id = clientes.id
  )
);