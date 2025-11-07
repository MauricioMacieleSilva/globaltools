-- Primeiro, vamos criar um índice único composto para budget_number + user_id
-- para permitir que múltiplos usuários avaliem o mesmo orçamento
DROP INDEX IF EXISTS idx_budget_ratings_unique;

CREATE UNIQUE INDEX idx_budget_ratings_budget_user 
ON client_budget_ratings (budget_number, user_id);

-- Remover qualquer constraint única existente apenas no budget_number
ALTER TABLE client_budget_ratings 
DROP CONSTRAINT IF EXISTS client_budget_ratings_budget_number_key;