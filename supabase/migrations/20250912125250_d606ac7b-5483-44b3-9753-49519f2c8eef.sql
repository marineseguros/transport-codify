-- Verificar se o usuário do administrador existe no profiles
-- Se não existir, criar um registro para o UID fornecido
INSERT INTO public.profiles (user_id, nome, email, papel, ativo)
VALUES ('8796adaf-bdf3-476e-aeb3-073bb8750c5e', 'Administrador', 'faturamento@marineseguros.com.br', 'Administrador', true)
ON CONFLICT (user_id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  papel = EXCLUDED.papel,
  ativo = EXCLUDED.ativo;