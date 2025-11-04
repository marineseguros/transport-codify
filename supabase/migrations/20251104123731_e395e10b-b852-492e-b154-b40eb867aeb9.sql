-- 1. Adicionar campo created_by na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 2. Atualizar RLS policies da tabela clientes

-- Remover policies antigas
DROP POLICY IF EXISTS "Users can view clientes from their module" ON public.clientes;
DROP POLICY IF EXISTS "Users can insert clientes in their module" ON public.clientes;
DROP POLICY IF EXISTS "Users can update clientes from their module" ON public.clientes;
DROP POLICY IF EXISTS "Only admins can delete clientes" ON public.clientes;

-- Criar novas policies
-- Todos os usuários autenticados podem visualizar clientes do seu módulo
CREATE POLICY "Users can view clientes from their module"
ON public.clientes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.ativo = true
    AND (p.modulo = clientes.modulo OR p.papel = 'Administrador')
  )
);

-- Todos os usuários autenticados podem criar clientes
CREATE POLICY "Users can insert clientes"
ON public.clientes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.ativo = true
  )
);

-- Todos os usuários autenticados podem editar clientes
CREATE POLICY "Users can update clientes"
ON public.clientes
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.ativo = true
  )
);

-- Apenas o criador ou administradores podem excluir
CREATE POLICY "Users can delete own clientes or admins can delete any"
ON public.clientes
FOR DELETE
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.papel = 'Administrador'
    AND p.ativo = true
  )
);

-- 3. Criar tabela de histórico de clientes
CREATE TABLE IF NOT EXISTS public.clientes_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  segurado text NOT NULL,
  cpf_cnpj text NOT NULL,
  email text,
  telefone text,
  cidade text,
  uf text,
  endereco text,
  cep text,
  observacoes text,
  modulo modulo_tipo NOT NULL,
  captacao_id uuid,
  ativo boolean NOT NULL,
  change_type text NOT NULL DEFAULT 'update',
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para histórico
ALTER TABLE public.clientes_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view clientes history"
ON public.clientes_historico
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. Criar tabela de audit log de clientes
CREATE TABLE IF NOT EXISTS public.clientes_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para audit log
ALTER TABLE public.clientes_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view clientes audit log"
ON public.clientes_audit_log
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. Criar função para capturar mudanças em clientes
CREATE OR REPLACE FUNCTION public.log_cliente_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_by_user uuid;
BEGIN
  changed_by_user := auth.uid();

  -- Log no histórico
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.clientes_historico (
      cliente_id, segurado, cpf_cnpj, email, telefone, cidade, uf,
      endereco, cep, observacoes, modulo, captacao_id, ativo,
      change_type, changed_by, changed_at
    ) VALUES (
      OLD.id, OLD.segurado, OLD.cpf_cnpj, OLD.email, OLD.telefone,
      OLD.cidade, OLD.uf, OLD.endereco, OLD.cep, OLD.observacoes,
      OLD.modulo, OLD.captacao_id, OLD.ativo,
      'update', changed_by_user, now()
    );

    -- Log detalhado de campos alterados
    IF OLD.segurado IS DISTINCT FROM NEW.segurado THEN
      INSERT INTO public.clientes_audit_log (cliente_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'segurado', OLD.segurado, NEW.segurado, changed_by_user);
    END IF;

    IF OLD.cpf_cnpj IS DISTINCT FROM NEW.cpf_cnpj THEN
      INSERT INTO public.clientes_audit_log (cliente_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'cpf_cnpj', OLD.cpf_cnpj, NEW.cpf_cnpj, changed_by_user);
    END IF;

    IF OLD.email IS DISTINCT FROM NEW.email THEN
      INSERT INTO public.clientes_audit_log (cliente_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'email', OLD.email, NEW.email, changed_by_user);
    END IF;

    IF OLD.telefone IS DISTINCT FROM NEW.telefone THEN
      INSERT INTO public.clientes_audit_log (cliente_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'telefone', OLD.telefone, NEW.telefone, changed_by_user);
    END IF;

    IF OLD.cidade IS DISTINCT FROM NEW.cidade THEN
      INSERT INTO public.clientes_audit_log (cliente_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'cidade', OLD.cidade, NEW.cidade, changed_by_user);
    END IF;

    IF OLD.uf IS DISTINCT FROM NEW.uf THEN
      INSERT INTO public.clientes_audit_log (cliente_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'uf', OLD.uf, NEW.uf, changed_by_user);
    END IF;

    IF OLD.observacoes IS DISTINCT FROM NEW.observacoes THEN
      INSERT INTO public.clientes_audit_log (cliente_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'observacoes', OLD.observacoes, NEW.observacoes, changed_by_user);
    END IF;

    IF OLD.ativo IS DISTINCT FROM NEW.ativo THEN
      INSERT INTO public.clientes_audit_log (cliente_id, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'ativo', OLD.ativo::text, NEW.ativo::text, changed_by_user);
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.clientes_historico (
      cliente_id, segurado, cpf_cnpj, email, telefone, cidade, uf,
      endereco, cep, observacoes, modulo, captacao_id, ativo,
      change_type, changed_by, changed_at
    ) VALUES (
      OLD.id, OLD.segurado, OLD.cpf_cnpj, OLD.email, OLD.telefone,
      OLD.cidade, OLD.uf, OLD.endereco, OLD.cep, OLD.observacoes,
      OLD.modulo, OLD.captacao_id, OLD.ativo,
      'delete', changed_by_user, now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Criar trigger para capturar mudanças
DROP TRIGGER IF EXISTS clientes_changes_trigger ON public.clientes;
CREATE TRIGGER clientes_changes_trigger
BEFORE UPDATE OR DELETE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.log_cliente_changes();

-- 7. Criar trigger para setar created_by automaticamente
CREATE OR REPLACE FUNCTION public.set_cliente_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_cliente_created_by_trigger ON public.clientes;
CREATE TRIGGER set_cliente_created_by_trigger
BEFORE INSERT ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.set_cliente_created_by();