-- Atualizar todos os ratings existentes que possuem valor 0 para 1 (mínimo obrigatório)
UPDATE client_budget_ratings 
SET rating = 1, updated_at = now()
WHERE rating = 0;