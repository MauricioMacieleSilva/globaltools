-- Remover registros duplicados primeiro (manter apenas o mais recente para cada combinação)
DELETE FROM client_budget_ratings
WHERE id NOT IN (
  SELECT DISTINCT ON (budget_number, user_id) id
  FROM client_budget_ratings
  ORDER BY budget_number, user_id, updated_at DESC
);

-- Adicionar constraint única para evitar duplicatas futuras
ALTER TABLE client_budget_ratings 
ADD CONSTRAINT client_budget_ratings_budget_user_unique 
UNIQUE (budget_number, user_id);