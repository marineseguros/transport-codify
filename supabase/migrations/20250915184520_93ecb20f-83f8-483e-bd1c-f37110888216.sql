-- Recriar perfil do usuário administrador
INSERT INTO public.profiles (
  user_id,
  nome,
  email,
  papel,
  ativo
) VALUES (
  'e13d8365-97b8-4f1f-b19c-0279880c2696',
  'Ernane',
  'faturamento@marineseguros.com.br',
  'Administrador',
  true
) ON CONFLICT (user_id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  papel = EXCLUDED.papel,
  ativo = EXCLUDED.ativo;