-- Atualizar roles de Ellen e Luiz para admin
UPDATE user_roles 
SET role = 'admin'::app_role 
WHERE user_id IN (
  SELECT user_id FROM profiles WHERE nome IN ('Ellen', 'Luiz')
);