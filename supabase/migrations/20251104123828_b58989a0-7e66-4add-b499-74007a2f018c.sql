-- Corrigir search_path nas funções criadas

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
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public';

-- Corrigir função set_cliente_created_by
CREATE OR REPLACE FUNCTION public.set_cliente_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public';